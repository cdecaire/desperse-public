/**
 * Echoes PFP mint logic — DB operations + Candy Machine interactions
 * Server-only: handles building mint transactions, recording mints, checking status.
 */

import { db } from '@/server/db'
import { pfpMints } from '@/server/db/schema'
import { eq, and, gte, count, desc } from 'drizzle-orm'
import { getEchoesUmi, getCandyMachinePublicKey, getCollectionPublicKey } from '@/server/services/blockchain/echoes/echoesUmiClient'
import { echoesEnv, getEchoesHeliusRpcUrl } from '@/config/echoes-env'
import { fetchCandyMachine, fetchCandyGuard, mintV1, route, safeFetchMintCounterFromSeeds } from '@metaplex-foundation/mpl-core-candy-machine'
import { generateSigner, transactionBuilder, publicKey as umiPublicKey, some } from '@metaplex-foundation/umi'
import { setComputeUnitLimit } from '@metaplex-foundation/mpl-toolbox'
import bs58 from 'bs58'
import { getMerkleProofForWallet } from './allowlist'

// Network tag — all Echoes mints are devnet until mainnet rollover
const ECHOES_NETWORK = 'devnet' as const

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MintPhaseServer = 'og-free' | 'og-discount' | 'whitelist' | 'public' | 'closed' | 'not-configured'

export interface MintStatusResponse {
	phase: MintPhaseServer
	isEligible: boolean
	mintCount: number
	supply: { total: number; minted: number; remaining: number }
	price: { lamports: number; sol: number; display: string } | null
	windows: {
		ogFreeStart: string | null; ogFreeEnd: string | null
		ogDiscountStart: string | null; ogDiscountEnd: string | null
		wlStart: string | null; wlEnd: string | null
		publicStart: string | null
	}
	collection: { name: string; description: string; imageUrl: string }
}

export interface BuildMintResult {
	mintId: string
	unsignedTxBase64: string
	blockhash: string
	lastValidBlockHeight: number
	phase: string
	price: { lamports: number; sol: number; display: string } | null
}

export interface MintCheckResult {
	status: 'pending' | 'confirmed' | 'failed'
	txSignature: string | null
	nftMintAddress: string | null
	error: string | null
}

// ---------------------------------------------------------------------------
// Rate Limiting
// ---------------------------------------------------------------------------

const PFP_RATE_LIMIT_PER_IP_HOUR = 10

export async function checkPfpRateLimit(ipAddress: string | null): Promise<{ allowed: boolean; resetAt?: Date }> {
	if (!ipAddress) return { allowed: true }

	const windowStart = new Date(Date.now() - 3600_000) // 1 hour

	const [result] = await db
		.select({ count: count() })
		.from(pfpMints)
		.where(and(
			eq(pfpMints.ipAddress, ipAddress),
			eq(pfpMints.network, ECHOES_NETWORK),
			gte(pfpMints.createdAt, windowStart),
		))

	const ipCount = result?.count || 0
	if (ipCount >= PFP_RATE_LIMIT_PER_IP_HOUR) {
		return { allowed: false, resetAt: new Date(Date.now() + 3600_000) }
	}

	return { allowed: true }
}

// ---------------------------------------------------------------------------
// Phase Detection from CM Guards
// ---------------------------------------------------------------------------

interface GuardPhaseResult {
	phase: MintPhaseServer
	windows: MintStatusResponse['windows']
	price: { lamports: number; sol: number; display: string } | null
}

/** Extract price from a guard group's solPayment field */
function extractPrice(guards: any): GuardPhaseResult['price'] {
	const solPayment = guards?.solPayment?.__option === 'Some' ? guards.solPayment.value : null
	if (!solPayment) return null
	const lamports = Number(solPayment.lamports.basisPoints)
	const s = lamports / 1e9
	return { lamports, sol: s, display: s === 0 ? 'Free' : `${s} SOL` }
}

/** Check if a guard group is currently active based on startDate/endDate */
function isGroupActive(guards: any, now: bigint): boolean {
	const startDate = guards?.startDate?.__option === 'Some' ? guards.startDate.value.date : null
	const endDate = guards?.endDate?.__option === 'Some' ? guards.endDate.value.date : null
	const started = startDate ? now >= startDate : true // No startDate = no time restriction
	const ended = endDate ? now >= endDate : false
	return started && !ended
}

/** Check if an allowlist guard has a non-zero Merkle root (i.e., wallets are configured) */
function hasAllowlistWallets(guards: any): boolean {
	if (guards?.allowList?.__option !== 'Some') return false // No allowList guard = not an allowlist phase
	const root = guards.allowList.value.merkleRoot
	if (!root) return false
	// A zero-filled Merkle root means the list was empty
	return Array.isArray(root) ? root.some((b: number) => b !== 0) : true
}

/** Extract a guard's date as ISO string */
function guardDateToIso(guards: any, field: 'startDate' | 'endDate'): string | null {
	const val = guards?.[field]?.__option === 'Some' ? guards[field].value.date : null
	return val ? new Date(Number(val) * 1000).toISOString() : null
}

/** Extract mint limit id and limit from a guard group */
function extractMintLimit(guards: any): { id: number; limit: number } | null {
	if (guards?.mintLimit?.__option !== 'Some') return null
	return { id: guards.mintLimit.value.id, limit: guards.mintLimit.value.limit }
}

/** Check if a wallet has hit the mint limit for a guard group */
async function isWalletMintLimitHit(
	umi: ReturnType<typeof getEchoesUmi>,
	guards: any,
	walletAddress: string | null,
	candyGuard: any,
	candyMachine: any,
): Promise<boolean> {
	if (!walletAddress) return false
	const mintLimit = extractMintLimit(guards)
	if (!mintLimit) return false // No mint limit = never hit

	const counter = await safeFetchMintCounterFromSeeds(umi, {
		id: mintLimit.id,
		user: umiPublicKey(walletAddress),
		candyGuard,
		candyMachine,
	})

	return counter !== null && counter.count >= mintLimit.limit
}

/**
 * Derive the mint phase from on-chain Candy Guard configuration.
 * Checks 4 sequential groups: og-free → og-disc → wl → public
 * When walletAddress is provided, skips phases where the wallet's mint limit is hit.
 */
async function getPhaseFromGuards(
	umi: ReturnType<typeof getEchoesUmi>,
	cm: Awaited<ReturnType<typeof fetchCandyMachine>>,
	prefetchedGuard?: Awaited<ReturnType<typeof fetchCandyGuard>>,
	walletAddress?: string | null,
): Promise<GuardPhaseResult> {
	const guard = prefetchedGuard ?? await fetchCandyGuard(umi, cm.mintAuthority)
	const now = BigInt(Math.floor(Date.now() / 1000))

	const windows: GuardPhaseResult['windows'] = {
		ogFreeStart: null, ogFreeEnd: null,
		ogDiscountStart: null, ogDiscountEnd: null,
		wlStart: null, wlEnd: null,
		publicStart: null,
	}

	// Extract all groups
	const ogFreeGroup = guard.groups.find((g) => g.label === 'ogfree')
	const ogDiscGroup = guard.groups.find((g) => g.label === 'ogdisc')
	const wlGroup = guard.groups.find((g) => g.label === 'wl')
	const publicGroup = guard.groups.find((g) => g.label === 'public')

	// Populate windows
	if (ogFreeGroup) {
		windows.ogFreeStart = guardDateToIso(ogFreeGroup.guards, 'startDate')
		windows.ogFreeEnd = guardDateToIso(ogFreeGroup.guards, 'endDate')
	}
	if (ogDiscGroup) {
		windows.ogDiscountStart = guardDateToIso(ogDiscGroup.guards, 'startDate')
		windows.ogDiscountEnd = guardDateToIso(ogDiscGroup.guards, 'endDate')
	}
	if (wlGroup) {
		windows.wlStart = guardDateToIso(wlGroup.guards, 'startDate')
		windows.wlEnd = guardDateToIso(wlGroup.guards, 'endDate')
	}
	if (publicGroup) {
		windows.publicStart = guardDateToIso(publicGroup.guards, 'startDate')
	}

	// Check groups in sequential order — first active group wins.
	// When a wallet is connected, skip phases the wallet isn't eligible for
	// (not on allowlist or mint limit hit) so they see the best phase for them.
	// When no wallet is connected, show the first active phase for display.
	if (ogFreeGroup && isGroupActive(ogFreeGroup.guards, now) && hasAllowlistWallets(ogFreeGroup.guards)) {
		if (!walletAddress) return { phase: 'og-free', windows, price: null }
		const onList = await getMerkleProofForWallet(walletAddress, 'og')
		if (onList) {
			const limitHit = await isWalletMintLimitHit(umi, ogFreeGroup.guards, walletAddress, guard.publicKey, cm.publicKey)
			if (!limitHit) return { phase: 'og-free', windows, price: null }
		}
	}
	if (ogDiscGroup && isGroupActive(ogDiscGroup.guards, now) && hasAllowlistWallets(ogDiscGroup.guards)) {
		if (!walletAddress) return { phase: 'og-discount', windows, price: extractPrice(ogDiscGroup.guards) }
		const onList = await getMerkleProofForWallet(walletAddress, 'og')
		if (onList) {
			const limitHit = await isWalletMintLimitHit(umi, ogDiscGroup.guards, walletAddress, guard.publicKey, cm.publicKey)
			if (!limitHit) return { phase: 'og-discount', windows, price: extractPrice(ogDiscGroup.guards) }
		}
	}
	if (wlGroup && isGroupActive(wlGroup.guards, now) && hasAllowlistWallets(wlGroup.guards)) {
		if (!walletAddress) return { phase: 'whitelist', windows, price: extractPrice(wlGroup.guards) }
		const onList = await getMerkleProofForWallet(walletAddress, 'wl')
		if (onList) {
			const limitHit = await isWalletMintLimitHit(umi, wlGroup.guards, walletAddress, guard.publicKey, cm.publicKey)
			if (!limitHit) return { phase: 'whitelist', windows, price: extractPrice(wlGroup.guards) }
		}
	}
	if (publicGroup && isGroupActive(publicGroup.guards, now)) {
		return { phase: 'public', windows, price: extractPrice(publicGroup.guards) }
	}

	// No active phase — return closed with the public price for display purposes
	const publicPrice = publicGroup ? extractPrice(publicGroup.guards) : null

	// Fallback: no groups (simple mode) — check default guards
	if (guard.groups.length === 0) {
		const defaultGuards = guard.guards as any
		if (isGroupActive(defaultGuards, now)) {
			return { phase: 'public', windows, price: extractPrice(defaultGuards) }
		}
	}

	return { phase: 'closed', windows, price: publicPrice }
}

// ---------------------------------------------------------------------------
// Mint Status
// ---------------------------------------------------------------------------

export async function getPfpMintStatus(userId: string | null, walletAddress: string | null): Promise<MintStatusResponse> {
	// Count user's mints (filtered by network) — skip if anonymous
	let mintCount = 0
	if (userId) {
		const [mintCountResult] = await db
			.select({ count: count() })
			.from(pfpMints)
			.where(and(eq(pfpMints.userId, userId), eq(pfpMints.network, ECHOES_NETWORK)))
		mintCount = mintCountResult?.count || 0
	}

	// Fetch CM state + guard phase from chain
	let supply = { total: 0, minted: 0, remaining: 0 }
	let guardPhase: GuardPhaseResult = {
		phase: 'not-configured',
		windows: { ogFreeStart: null, ogFreeEnd: null, ogDiscountStart: null, ogDiscountEnd: null, wlStart: null, wlEnd: null, publicStart: null },
		price: null,
	}

	try {
		const umi = getEchoesUmi()
		const cmPublicKey = getCandyMachinePublicKey()
		const cm = await fetchCandyMachine(umi, cmPublicKey)
		const total = Number(cm.data.itemsAvailable)
		const minted = Number(cm.itemsRedeemed)
		supply = { total, minted, remaining: total - minted }

		// Sold out = closed regardless of guard dates
		if (supply.remaining <= 0) {
			guardPhase = { phase: 'closed', windows: guardPhase.windows, price: null }
		} else {
			guardPhase = await getPhaseFromGuards(umi, cm, undefined, walletAddress ?? undefined)
		}
		console.log('[getPfpMintStatus] CM state:', supply, 'phase:', guardPhase.phase)
	} catch (err) {
		console.warn('[getPfpMintStatus] Failed to fetch CM state:', err instanceof Error ? err.message : err)
	}

	// Check eligibility based on phase + allowlist — anonymous users are never eligible
	let isEligible = false
	if (walletAddress) {
		if (guardPhase.phase === 'og-free' || guardPhase.phase === 'og-discount') {
			const proof = await getMerkleProofForWallet(walletAddress, 'og')
			isEligible = proof !== null
		} else if (guardPhase.phase === 'whitelist') {
			const proof = await getMerkleProofForWallet(walletAddress, 'wl')
			isEligible = proof !== null
		} else if (guardPhase.phase === 'public') {
			isEligible = true
		}
	}

	return {
		phase: guardPhase.phase,
		isEligible,
		mintCount,
		supply,
		price: guardPhase.price,
		windows: guardPhase.windows,
		collection: {
			name: 'Echoes',
			description: 'Echoes PFP Collection',
			imageUrl: '',
		},
	}
}

// ---------------------------------------------------------------------------
// User's Minted NFTs
// ---------------------------------------------------------------------------

export interface UserPfpMint {
	id: string
	nftMintAddress: string
	confirmedAt: Date | null
	createdAt: Date
}

export async function getUserPfpMints(userId: string): Promise<UserPfpMint[]> {
	const results = await db
		.select({
			id: pfpMints.id,
			nftMintAddress: pfpMints.nftMintAddress,
			confirmedAt: pfpMints.confirmedAt,
			createdAt: pfpMints.createdAt,
		})
		.from(pfpMints)
		.where(and(
			eq(pfpMints.userId, userId),
			eq(pfpMints.status, 'confirmed'),
			eq(pfpMints.network, ECHOES_NETWORK),
		))
		.orderBy(desc(pfpMints.confirmedAt))
		.limit(20)

	return results.filter((r): r is UserPfpMint => r.nftMintAddress !== null)
}

// ---------------------------------------------------------------------------
// Build Mint Transaction
// ---------------------------------------------------------------------------

export async function buildPfpMintTransaction(
	userId: string,
	walletAddress: string,
	ipAddress: string | null,
): Promise<BuildMintResult> {
	// Rate limit
	const rateCheck = await checkPfpRateLimit(ipAddress)
	if (!rateCheck.allowed) {
		throw new Error('Rate limit exceeded. Try again later.')
	}

	const umi = getEchoesUmi()
	const cmPublicKey = getCandyMachinePublicKey()
	const collectionPublicKey = getCollectionPublicKey()

	// Fetch CM to validate supply
	const cm = await fetchCandyMachine(umi, cmPublicKey)
	const remaining = Number(cm.data.itemsAvailable) - Number(cm.itemsRedeemed)
	if (remaining <= 0) {
		throw new Error('Collection is sold out')
	}

	// Fetch guard once — shared between phase detection and mint args
	const guard = await fetchCandyGuard(umi, cm.mintAuthority)

	// Derive phase from on-chain guards
	const guardPhaseResult = await getPhaseFromGuards(umi, cm, guard, walletAddress)
	const { phase } = guardPhaseResult
	if (phase === 'closed') {
		throw new Error('Minting is currently closed')
	}

	// Build guard args based on active phase
	let mintArgs: Parameters<typeof mintV1>[1]['mintArgs'] = {}
	let group: string | undefined
	let routeBuilder: ReturnType<typeof route> | null = null
	const paymentDest = umiPublicKey(echoesEnv.PFP_PAYMENT_WALLET)
	const minterPublicKey = umiPublicKey(walletAddress)

	if (phase === 'og-free') {
		const proof = await getMerkleProofForWallet(walletAddress, 'og')
		if (!proof) throw new Error('Wallet is not on the OG allowlist')
		group = 'ogfree'
		// Step 1: route instruction to validate Merkle proof → creates PDA
		routeBuilder = route(umi, {
			candyMachine: cmPublicKey,
			candyGuard: guard.publicKey,
			guard: 'allowList',
			group: some(group),
			routeArgs: {
				path: 'proof',
				merkleRoot: proof.merkleRoot,
				merkleProof: proof.proof,
				minter: minterPublicKey,
			},
		})
		// Step 2: mintV1 only needs merkleRoot (PDA proves eligibility)
		mintArgs = {
			allowList: { merkleRoot: proof.merkleRoot },
			mintLimit: { id: 1 },
		}
	} else if (phase === 'og-discount') {
		const proof = await getMerkleProofForWallet(walletAddress, 'og')
		if (!proof) throw new Error('Wallet is not on the OG allowlist')
		group = 'ogdisc'
		routeBuilder = route(umi, {
			candyMachine: cmPublicKey,
			candyGuard: guard.publicKey,
			guard: 'allowList',
			group: some(group),
			routeArgs: {
				path: 'proof',
				merkleRoot: proof.merkleRoot,
				merkleProof: proof.proof,
				minter: minterPublicKey,
			},
		})
		mintArgs = {
			allowList: { merkleRoot: proof.merkleRoot },
			solPayment: { destination: paymentDest },
			mintLimit: { id: 2 },
		}
	} else if (phase === 'whitelist') {
		const proof = await getMerkleProofForWallet(walletAddress, 'wl')
		if (!proof) throw new Error('Wallet is not on the whitelist')
		group = 'wl'
		routeBuilder = route(umi, {
			candyMachine: cmPublicKey,
			candyGuard: guard.publicKey,
			guard: 'allowList',
			group: some(group),
			routeArgs: {
				path: 'proof',
				merkleRoot: proof.merkleRoot,
				merkleProof: proof.proof,
				minter: minterPublicKey,
			},
		})
		mintArgs = {
			allowList: { merkleRoot: proof.merkleRoot },
			solPayment: { destination: paymentDest },
			mintLimit: { id: 3 },
		}
	} else {
		// Public — no allowlist, no mint limit
		mintArgs = {
			solPayment: { destination: paymentDest },
		}
		group = 'public'
	}

	// Build the mint transaction
	// payer = server fee payer (pays tx fee + rent + solPayment guard)
	// minter = user's wallet (for allowlist/mint limit checks)
	const userSigner = { publicKey: minterPublicKey, signTransaction: async (t: any) => t, signMessage: async (m: any) => m, signAllTransactions: async (t: any) => t } as any

	// For allowlist phases, send the route instruction first to create the proof PDA,
	// then the server can include the mint in the same or subsequent transaction
	if (routeBuilder) {
		console.log(`[buildPfpMintTransaction] Sending allowList route for ${walletAddress} (group: ${group})`)
		await routeBuilder.sendAndConfirm(umi)
		console.log(`[buildPfpMintTransaction] Route confirmed — allowList PDA created`)
	}

	const assetSigner = generateSigner(umi)
	const mintIx = mintV1(umi, {
		candyMachine: cmPublicKey,
		collection: collectionPublicKey,
		asset: assetSigner,
		minter: userSigner,
		owner: minterPublicKey,
		payer: userSigner,
		mintArgs,
		group,
	})

	const txBuilder = transactionBuilder()
		.add(setComputeUnitLimit(umi, { units: 800_000 }))
		.add(mintIx)

	// Build with latest blockhash
	const blockhashResult = await umi.rpc.getLatestBlockhash()
	const built = await txBuilder
		.setBlockhash(blockhashResult)
		.build(umi)

	// Server partially signs — fee payer (umi.identity) + asset signer
	// The user's wallet will add their signature on the client side
	let partiallySigned = await umi.identity.signTransaction(built)
	partiallySigned = await assetSigner.signTransaction(partiallySigned)

	// Record mint attempt in DB
	const [mintRecord] = await db
		.insert(pfpMints)
		.values({
			userId,
			walletAddress,
			nftMintAddress: assetSigner.publicKey.toString(),
			status: 'pending',
			network: ECHOES_NETWORK,
			ipAddress,
		})
		.returning()

	// Serialize the partially-signed transaction for the client to co-sign
	const txBase64 = Buffer.from(umi.transactions.serialize(partiallySigned)).toString('base64')

	return {
		mintId: mintRecord.id,
		unsignedTxBase64: txBase64,
		blockhash: blockhashResult.blockhash,
		lastValidBlockHeight: Number(blockhashResult.lastValidBlockHeight),
		phase,
		price: guardPhaseResult.price,
	}
}

// ---------------------------------------------------------------------------
// Confirm Mint (broadcast signed tx)
// ---------------------------------------------------------------------------

export async function confirmPfpMint(
	mintId: string,
	signedTxBase64: string,
): Promise<{ status: string; txSignature: string }> {
	// Deserialize the fully-signed transaction and broadcast
	const umi = getEchoesUmi()
	const txBytes = Buffer.from(signedTxBase64, 'base64')
	const tx = umi.transactions.deserialize(new Uint8Array(txBytes))

	// Skip preflight to avoid simulation failures on partially-verified transactions
	const signature = await umi.rpc.sendTransaction(tx, { skipPreflight: true })
	// Store as base58 (Solana standard) not base64
	const txSignature = bs58.encode(Buffer.from(signature))

	// Update DB record
	await db
		.update(pfpMints)
		.set({ txSignature, status: 'pending' })
		.where(eq(pfpMints.id, mintId))

	return { status: 'pending', txSignature }
}

// ---------------------------------------------------------------------------
// Check Mint Status (poll for confirmation)
// ---------------------------------------------------------------------------

export async function checkPfpMintStatus(mintId: string): Promise<MintCheckResult> {
	const [mint] = await db
		.select()
		.from(pfpMints)
		.where(eq(pfpMints.id, mintId))
		.limit(1)

	if (!mint) {
		return { status: 'failed', txSignature: null, nftMintAddress: null, error: 'Mint record not found' }
	}

	// Already resolved
	if (mint.status === 'confirmed') {
		return { status: 'confirmed', txSignature: mint.txSignature, nftMintAddress: mint.nftMintAddress, error: null }
	}
	if (mint.status === 'failed') {
		return { status: 'failed', txSignature: mint.txSignature, nftMintAddress: null, error: 'Transaction failed' }
	}

	// Still pending — check on-chain if we have a tx signature
	if (mint.txSignature) {
		try {
			const rpcUrl = getEchoesHeliusRpcUrl()
			const response = await fetch(rpcUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
					method: 'getTransaction',
					params: [mint.txSignature, { maxSupportedTransactionVersion: 0, encoding: 'jsonParsed' }],
				}),
			})
			const data = await response.json() as any

			if (data.result) {
				if (data.result.meta?.err) {
					await db.update(pfpMints).set({ status: 'failed' }).where(eq(pfpMints.id, mintId))
					return { status: 'failed', txSignature: mint.txSignature, nftMintAddress: null, error: 'Transaction failed on-chain' }
				}

				// Check logs for bot tax — tx succeeds but no NFT was minted
				const logs: string[] = data.result.meta?.logMessages ?? []
				const wasBotTaxed = logs.some((l: string) => l.includes('Botting is taxed'))
				if (wasBotTaxed) {
					console.warn(`[checkPfpMintStatus] Bot tax detected for mint ${mintId}`)
					await db.update(pfpMints).set({ status: 'failed' }).where(eq(pfpMints.id, mintId))
					return { status: 'failed', txSignature: mint.txSignature, nftMintAddress: null, error: 'Mint rejected by guard (bot tax charged)' }
				}

				await db.update(pfpMints).set({
					status: 'confirmed',
					confirmedAt: new Date(),
				}).where(eq(pfpMints.id, mintId))

				return { status: 'confirmed', txSignature: mint.txSignature, nftMintAddress: mint.nftMintAddress, error: null }
			}
		} catch (err) {
			console.warn('[checkPfpMintStatus] Failed to check on-chain status:', err instanceof Error ? err.message : err)
		}

		// Stale pending records (>2 minutes)
		const staleThreshold = new Date(Date.now() - 120_000)
		if (mint.createdAt < staleThreshold) {
			await db.update(pfpMints).set({ status: 'failed' }).where(eq(pfpMints.id, mintId))
			return { status: 'failed', txSignature: mint.txSignature, nftMintAddress: null, error: 'Transaction timed out' }
		}
	}

	return { status: 'pending', txSignature: mint.txSignature, nftMintAddress: null, error: null }
}
