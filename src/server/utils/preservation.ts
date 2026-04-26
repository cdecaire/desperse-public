/**
 * Server-side helpers for the /preservation page.
 *
 * Owns all DB/Node/Alchemy logic. Public callers go through
 * src/server/functions/preservation.ts (server fn boundary).
 *
 * Scope v1: Foundation shared contract only. Reservoir + custom-contract
 * attribution + alchemy_getAssetTransfers (MINTED-by) are deferred to Phase B.
 */

import { db } from '@/server/db'
import { preservationSignups } from '@/server/db/schema'
import { env } from '@/config/env'

// Foundation shared marketplace contract — covers single-edition mints.
const FOUNDATION_SHARED_CONTRACT = '0x3B3ee1931Dc30C1957379FAc9aba94D1C48a5405'

// Foundation collection deployer / factory addresses. Custom-contract drops are
// deployed by these addresses on behalf of artists; we use this to identify
// Foundation-origin contracts found via getContractsForOwner.
const FOUNDATION_DEPLOYERS = new Set<string>([
	'0x3b612a5b49e025c6b3edcd7ebbcccc524b9a31c4', // FND Cloneable Token Factory
	'0x6e1b46cc69b6b8b85c5a0e6dba80d0e9e16e9b8e', // FND Drop Market deployer (heuristic)
])

// Common Foundation collection symbols. Used as a soft signal when deployer match fails.
const FOUNDATION_SYMBOL_HINTS = ['FND', 'FNDR', 'FOUND']

// Approximate Arweave permanent-storage cost in USD per GB (Turbo / Irys, Apr 2026).
const ARWEAVE_USD_PER_GB = 7.35

// MIME size heuristics (bytes) used when Alchemy doesn't return image.size.
const SIZE_HEURISTIC_BYTES = {
	image: 5 * 1024 * 1024,
	gif: 10 * 1024 * 1024,
	video: 25 * 1024 * 1024,
}

const IPFS_GATEWAYS = [
	'https://ipfs.io/ipfs/',
	'https://cf-ipfs.com/ipfs/',
	'https://dweb.link/ipfs/',
	'https://gateway.pinata.cloud/ipfs/',
]

export type PreservationPiece = {
	tokenId: string
	contract: string
	name: string | null
	description: string | null
	/** Ordered list of image URLs to try. Client falls through on load error. */
	imageUrls: string[]
	mintedAt: string | null
	estimatedSizeBytes: number
	mimeCategory: 'image' | 'gif' | 'video' | 'unknown'
	foundationUrl: string | null
}

export type PreservationStats = {
	pieceCount: number
	totalSizeBytes: number
	totalSizeMb: number
	estimatedArweaveCostUsd: number
	firstMintAt: string | null
}

export type PreservationCatalog = {
	pieces: PreservationPiece[]
	stats: PreservationStats
	limits: {
		sharedContractOnly: true
		message: string
	}
}

/**
 * Build an ordered list of viable image URLs for a piece. The client tries
 * each in turn via onError fallback. Order: Alchemy-cached CDN first (most
 * reliable), then thumbnail, then per-gateway expansion of any `ipfs://` URIs.
 */
function buildImageUrls(nft: any): string[] {
	const urls: string[] = []
	const seen = new Set<string>()
	const push = (u: string | null | undefined) => {
		if (!u) return
		if (seen.has(u)) return
		seen.add(u)
		urls.push(u)
	}

	push(nft?.image?.cachedUrl)
	push(nft?.image?.pngUrl)
	push(nft?.image?.thumbnailUrl)

	// Expand ipfs:// URIs across multiple gateways so a failing one doesn't kill the tile.
	const ipfsCandidates: string[] = []
	for (const candidate of [nft?.image?.originalUrl, nft?.raw?.metadata?.image]) {
		if (typeof candidate !== 'string') continue
		if (candidate.startsWith('ipfs://')) {
			const cid = candidate.replace('ipfs://', '').replace(/^ipfs\//, '')
			ipfsCandidates.push(...IPFS_GATEWAYS.map((g) => `${g}${cid}`))
		} else {
			push(candidate)
		}
	}
	for (const u of ipfsCandidates) push(u)

	return urls
}

function classifyMime(mime: string | null | undefined): PreservationPiece['mimeCategory'] {
	if (!mime) return 'unknown'
	const lower = mime.toLowerCase()
	if (lower.includes('gif')) return 'gif'
	if (lower.startsWith('video/')) return 'video'
	if (lower.startsWith('image/')) return 'image'
	return 'unknown'
}

function estimateSize(category: PreservationPiece['mimeCategory'], reportedBytes?: number | null): number {
	if (typeof reportedBytes === 'number' && reportedBytes > 0) return reportedBytes
	if (category === 'unknown') return SIZE_HEURISTIC_BYTES.image
	return SIZE_HEURISTIC_BYTES[category]
}

function isEthAddress(value: string): boolean {
	return /^0x[a-fA-F0-9]{40}$/.test(value)
}

function isEnsName(value: string): boolean {
	return /\.eth$/i.test(value.trim())
}

/**
 * Resolve an ENS name to its hex address using Alchemy's eth_call against the
 * ENS public resolver. Required because alchemy_getAssetTransfers (JSON-RPC)
 * does not accept ENS names in fromAddress/toAddress fields.
 */
async function resolveEnsToAddress(name: string, _alchemyKey: string): Promise<string | null> {
	// Try the public ENS resolver first — it's the most reliable path. The
	// alchemy_resolveName JSON-RPC method isn't documented as universally available.
	const fallback = await fetchWithTimeout(
		`https://api.ensideas.com/ens/resolve/${encodeURIComponent(name)}`,
		{ headers: { accept: 'application/json' } },
		5000,
	)
	if (fallback && fallback.ok) {
		const data = await fallback.json().catch(() => null)
		const addr = typeof data?.address === 'string' ? data.address : null
		if (addr && /^0x[a-fA-F0-9]{40}$/.test(addr)) return addr
	}
	return null
}

type ContractMetadata = {
	address: string
	deployer: string | null
	name: string | null
	symbol: string | null
}

async function fetchContractMetadata(
	address: string,
	alchemyKey: string,
): Promise<ContractMetadata | null> {
	const url = `https://eth-mainnet.g.alchemy.com/nft/v3/${alchemyKey}/getContractMetadata?contractAddress=${address}`
	const res = await fetchWithTimeout(url, { headers: { accept: 'application/json' } }, 6000)
	if (!res || !res.ok) return null
	const data = await res.json().catch(() => null)
	if (!data) return null
	return {
		address: String(data?.address ?? address).toLowerCase(),
		deployer: data?.contractDeployer ? String(data.contractDeployer).toLowerCase() : null,
		name: typeof data?.name === 'string' ? data.name : null,
		symbol: typeof data?.symbol === 'string' ? data.symbol : null,
	}
}

/**
 * Wrap fetch with a hard timeout so a slow Alchemy endpoint can't hang the
 * whole lookup request. Returns null on abort/error.
 */
async function fetchWithTimeout(
	url: string,
	init: RequestInit,
	timeoutMs = 8000,
): Promise<Response | null> {
	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), timeoutMs)
	try {
		return await fetch(url, { ...init, signal: controller.signal })
	} catch {
		return null
	} finally {
		clearTimeout(timer)
	}
}

/**
 * Batch-fetch NFT metadata for many (contract, tokenId) pairs in a single
 * Alchemy POST. Avoids the N-call cost of per-token getNFTMetadata.
 */
async function fetchNftMetadataBatch(
	tokens: Array<{ contract: string; tokenId: string }>,
	alchemyKey: string,
): Promise<Map<string, any>> {
	const result = new Map<string, any>()
	if (tokens.length === 0) return result

	// Alchemy caps the batch endpoint at 100 tokens per call.
	for (let i = 0; i < tokens.length; i += 100) {
		const slice = tokens.slice(i, i + 100)
		const url = `https://eth-mainnet.g.alchemy.com/nft/v3/${alchemyKey}/getNFTMetadataBatch`
		const res = await fetchWithTimeout(
			url,
			{
				method: 'POST',
				headers: { accept: 'application/json', 'content-type': 'application/json' },
				body: JSON.stringify({
					tokens: slice.map((t) => ({ contractAddress: t.contract, tokenId: t.tokenId })),
				}),
			},
			10000,
		)
		if (!res || !res.ok) continue
		const data = await res.json().catch(() => null)
		const nfts: any[] = Array.isArray(data?.nfts) ? data.nfts : []
		for (const nft of nfts) {
			const c = String(nft?.contract?.address ?? '').toLowerCase()
			const t = String(nft?.tokenId ?? '')
			if (c && t) result.set(`${c}:${t}`, nft)
		}
	}
	return result
}

/**
 * Look up a creator's Foundation-issued NFTs via Alchemy.
 * Accepts either an ETH address (0x...) or an ENS name (alice.eth).
 */
export async function lookupFoundationCatalog(
	addressOrEns: string,
): Promise<PreservationCatalog | { error: string }> {
	const cleaned = addressOrEns.trim()
	if (!cleaned) return { error: 'Address or ENS name required' }
	if (!isEthAddress(cleaned) && !isEnsName(cleaned)) {
		return { error: 'Enter a valid Ethereum address (0x…) or ENS name (alice.eth)' }
	}

	if (!env.ALCHEMY_API_KEY) {
		console.warn('[preservation] ALCHEMY_API_KEY not configured')
		return { error: 'Lookup service is temporarily unavailable' }
	}

	// Resolve ENS to hex once — needed for the mint-event JSON-RPC call which
	// doesn't accept ENS in toAddress.
	let walletHex: string | null = null
	if (isEthAddress(cleaned)) {
		walletHex = cleaned.toLowerCase()
	} else if (isEnsName(cleaned)) {
		walletHex = await resolveEnsToAddress(cleaned, env.ALCHEMY_API_KEY)
		if (!walletHex) {
			return { error: `Could not resolve ${cleaned}. Try the wallet address directly.` }
		}
		walletHex = walletHex.toLowerCase()
	}
	if (!walletHex) return { error: 'Could not resolve that input.' }

	// Two parallel queries widen coverage:
	//  1. getNFTsForOwner — pieces the wallet currently HOLDS (any contract).
	//  2. alchemy_getAssetTransfers from 0x0 → wallet — every NFT ever MINTED to
	//     the wallet, regardless of current ownership. Catches creators who sold
	//     all their work, like valley_of_mirrors.
	const alchemyBase = `https://eth-mainnet.g.alchemy.com/nft/v3/${env.ALCHEMY_API_KEY}`
	const ownedUrl = `${alchemyBase}/getNFTsForOwner?owner=${encodeURIComponent(cleaned)}&withMetadata=true&pageSize=100`
	const transfersBody = JSON.stringify({
		jsonrpc: '2.0',
		id: 1,
		method: 'alchemy_getAssetTransfers',
		params: [
			{
				fromAddress: '0x0000000000000000000000000000000000000000',
				toAddress: walletHex,
				category: ['erc721', 'erc1155'],
				maxCount: '0x64',
				withMetadata: false,
			},
		],
	})

	let ownedData: any
	let transfersData: any
	const [ownedRes, transfersRes] = await Promise.all([
		fetchWithTimeout(ownedUrl, { headers: { accept: 'application/json' } }, 10000),
		fetchWithTimeout(
			`https://eth-mainnet.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`,
			{
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: transfersBody,
			},
			10000,
		),
	])
	if (!ownedRes || !ownedRes.ok) {
		console.error(`[lookupFoundationCatalog] Alchemy NFTs returned ${ownedRes?.status ?? 'timeout'} for ${cleaned.slice(0, 12)}…`)
		return { error: 'Could not reach the lookup service. Try again in a moment.' }
	}
	ownedData = await ownedRes.json().catch(() => null)
	transfersData = transfersRes && transfersRes.ok ? await transfersRes.json().catch(() => null) : null

	// Collect every (contract, tokenId) seen, marking whether it's currently held.
	type Tup = { contract: string; tokenId: string; ownedNft: any | null }
	const seen = new Map<string, Tup>()
	const ownedNftsAll: any[] = Array.isArray(ownedData?.ownedNfts) ? ownedData.ownedNfts : []
	for (const nft of ownedNftsAll) {
		const c = String(nft?.contract?.address ?? '').toLowerCase()
		const t = String(nft?.tokenId ?? '')
		if (!c || !t) continue
		seen.set(`${c}:${t}`, { contract: c, tokenId: t, ownedNft: nft })
	}
	const transfers: any[] = Array.isArray(transfersData?.result?.transfers)
		? transfersData.result.transfers
		: []
	for (const tx of transfers) {
		const c = String(tx?.rawContract?.address ?? '').toLowerCase()
		const tHex = String(tx?.tokenId ?? tx?.erc721TokenId ?? '')
		if (!c || !tHex) continue
		// tokenId arrives as hex (e.g. "0x05") — convert to decimal string for NFT API
		let t = tHex
		if (tHex.startsWith('0x')) {
			try {
				t = BigInt(tHex).toString(10)
			} catch {
				continue
			}
		}
		const key = `${c}:${t}`
		if (!seen.has(key)) seen.set(key, { contract: c, tokenId: t, ownedNft: null })
	}

	// Resolve which contracts are Foundation-origin via metadata. The strongest
	// signal is `deployer === wallet` — the artist deployed their own collection
	// contract via Foundation's cloneable factory.
	const uniqueContracts = Array.from(new Set(Array.from(seen.values()).map((s) => s.contract)))
	const contractMetas = await Promise.all(
		uniqueContracts.map((c) => fetchContractMetadata(c, env.ALCHEMY_API_KEY)),
	)
	const foundationContracts = new Set<string>([FOUNDATION_SHARED_CONTRACT.toLowerCase()])
	for (const meta of contractMetas) {
		if (!meta) continue
		const isDeployerSelf = meta.deployer === walletHex
		const isFactoryMatch = meta.deployer ? FOUNDATION_DEPLOYERS.has(meta.deployer) : false
		const isSymbolHint = meta.symbol && FOUNDATION_SYMBOL_HINTS.includes(meta.symbol.toUpperCase())
		const isNameHint = meta.name ? /foundation/i.test(meta.name) : false
		if (isDeployerSelf || isFactoryMatch || isSymbolHint || isNameHint) {
			foundationContracts.add(meta.address)
		}
	}

	// Filter the seen set to Foundation contracts. For pieces we don't already
	// hold full metadata for (minted-then-sold), batch-fetch metadata in a single
	// Alchemy POST instead of N parallel calls — keeps lookup latency reasonable.
	const foundationTuples = Array.from(seen.values()).filter((t) =>
		foundationContracts.has(t.contract),
	)
	const needsMetadata = foundationTuples.filter((t) => !t.ownedNft)
	const fetchedMeta = await fetchNftMetadataBatch(
		needsMetadata.map((t) => ({ contract: t.contract, tokenId: t.tokenId })),
		env.ALCHEMY_API_KEY,
	)
	const enriched = foundationTuples.map((t) => ({
		tup: t,
		nft: t.ownedNft ?? fetchedMeta.get(`${t.contract}:${t.tokenId}`) ?? null,
	}))

	const pieces: PreservationPiece[] = enriched
		.filter((e): e is { tup: Tup; nft: any } => !!e.nft)
		.map(({ tup, nft }) => {
			const tokenId = tup.tokenId
			const contract = tup.contract
			const mime = nft?.image?.contentType ?? null
			const category = classifyMime(mime)
			const reportedBytes = typeof nft?.image?.size === 'number' ? nft.image.size : null
			const mintedAt = nft?.mint?.timestamp ?? nft?.acquiredAt ?? null
			return {
				tokenId,
				contract,
				name: nft?.name ?? nft?.raw?.metadata?.name ?? null,
				description: nft?.description ?? nft?.raw?.metadata?.description ?? null,
				imageUrls: buildImageUrls(nft),
				mintedAt,
				estimatedSizeBytes: estimateSize(category, reportedBytes),
				mimeCategory: category,
				foundationUrl: tokenId ? `https://foundation.app/mint/eth/${contract}/${tokenId}` : null,
			}
		})

	const totalSizeBytes = pieces.reduce((sum, p) => sum + p.estimatedSizeBytes, 0)
	const totalSizeMb = totalSizeBytes / (1024 * 1024)
	const totalSizeGb = totalSizeBytes / (1024 * 1024 * 1024)
	const firstMintAt = pieces
		.map((p) => p.mintedAt)
		.filter((d): d is string => Boolean(d))
		.sort()[0] ?? null

	return {
		pieces,
		stats: {
			pieceCount: pieces.length,
			totalSizeBytes,
			totalSizeMb,
			estimatedArweaveCostUsd: totalSizeGb * ARWEAVE_USD_PER_GB,
			firstMintAt,
		},
		limits: {
			sharedContractOnly: true,
			message:
				'Detection covers Foundation’s shared marketplace plus self-deployed collection contracts (where the artist is the deployer), including pieces that have been sold. Some custom contracts may not be recognized yet.',
		},
	}
}

export type PreservationSignupInput = {
	userId?: string | null
	email?: string | null
	ethAddress?: string | null
	catalogSnapshot?: unknown
}

export async function joinPreservationWaitlist(
	input: PreservationSignupInput,
): Promise<{ success: boolean; error?: string; alreadyJoined?: boolean }> {
	const ethAddress = input.ethAddress?.trim() || null
	const email = input.email?.trim().toLowerCase() || null

	if (!ethAddress && !email) {
		return { success: false, error: 'Provide an Ethereum address or an email to join.' }
	}
	if (ethAddress && !isEthAddress(ethAddress)) {
		return { success: false, error: 'That doesn’t look like a valid Ethereum address.' }
	}

	try {
		await db
			.insert(preservationSignups)
			.values({
				userId: input.userId ?? null,
				ethAddress,
				email,
				source: 'foundation_preservation',
				catalogSnapshot: input.catalogSnapshot ?? null,
			})
			.onConflictDoNothing()

		return { success: true }
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error'
		if (msg.includes('unique') || msg.includes('duplicate')) {
			return { success: true, alreadyJoined: true }
		}
		console.error('[joinPreservationWaitlist] Insert failed:', msg)
		return { success: false, error: 'Could not save your signup. Try again in a moment.' }
	}
}
