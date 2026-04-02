/**
 * Echoes PFP mint logic — DB operations + Candy Machine interactions
 * Server-only: handles building mint transactions, recording mints, checking status.
 */

import { db } from '@/server/db'
import { pfpMints } from '@/server/db/schema'
import { eq, and, gte, count, desc } from 'drizzle-orm'
import { getEchoesUmi, getCandyMachinePublicKey, getCollectionPublicKey } from '@/server/services/blockchain/echoes/echoesUmiClient'
import { echoesEnv, getEchoesHeliusRpcUrl } from '@/config/echoes-env'
import { fetchCandyMachine, mintV1 } from '@metaplex-foundation/mpl-core-candy-machine'
import { generateSigner, transactionBuilder, publicKey as umiPublicKey } from '@metaplex-foundation/umi'
import { setComputeUnitLimit } from '@metaplex-foundation/mpl-toolbox'
import bs58 from 'bs58'
import { getMerkleProofForWallet } from './allowlist'

// Network tag — all Echoes mints are devnet until mainnet rollover
const ECHOES_NETWORK = 'devnet' as const

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MintStatusResponse {
	phase: 'whitelist' | 'public' | 'closed'
	isEligible: boolean
	mintCount: number
	supply: { total: number; minted: number; remaining: number }
	price: { lamports: number; sol: number; display: string } | null
	windows: { wlStart: string | null; wlEnd: string | null; publicStart: string | null }
	collection: { name: string; description: string; imageUrl: string }
}

export interface BuildMintResult {
	mintId: string
	unsignedTxBase64: string
	blockhash: string
	lastValidBlockHeight: number
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

const PFP_RATE_LIMIT_PER_IP_HOUR = 3

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
// Mint Status
// ---------------------------------------------------------------------------

export async function getPfpMintStatus(userId: string, walletAddress: string): Promise<MintStatusResponse> {
	const phase = echoesEnv.PFP_MINT_PHASE

	// Count user's mints (filtered by network)
	const [mintCountResult] = await db
		.select({ count: count() })
		.from(pfpMints)
		.where(and(eq(pfpMints.userId, userId), eq(pfpMints.network, ECHOES_NETWORK)))

	const mintCount = mintCountResult?.count || 0

	// Check WL eligibility
	let isEligible = false
	if (phase === 'whitelist') {
		const proof = await getMerkleProofForWallet(walletAddress)
		isEligible = proof !== null
	} else if (phase === 'public') {
		isEligible = true
	}

	// Fetch CM state from chain
	let supply = { total: 0, minted: 0, remaining: 0 }
	try {
		const umi = getEchoesUmi()
		const cmPublicKey = getCandyMachinePublicKey()
		console.log('[getPfpMintStatus] Fetching CM state from:', cmPublicKey.toString())
		const cm = await fetchCandyMachine(umi, cmPublicKey)
		const total = Number(cm.data.itemsAvailable)
		const minted = Number(cm.itemsRedeemed)
		supply = { total, minted, remaining: total - minted }
		console.log('[getPfpMintStatus] CM state:', supply)
	} catch (err) {
		console.warn('[getPfpMintStatus] Failed to fetch CM state:', err instanceof Error ? err.message : err)
	}

	return {
		phase,
		isEligible,
		mintCount,
		supply,
		// Price TBD — will be read from CM guard config
		price: null,
		windows: { wlStart: null, wlEnd: null, publicStart: null },
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
	const phase = echoesEnv.PFP_MINT_PHASE
	if (phase === 'closed') {
		throw new Error('Minting is currently closed')
	}

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

	// Generate a new keypair for the Core asset being minted
	const assetSigner = generateSigner(umi)

	// Build guard args based on phase
	let mintArgs: Parameters<typeof mintV1>[1]['mintArgs'] = {}
	let group: string | undefined

	if (phase === 'whitelist') {
		const proof = await getMerkleProofForWallet(walletAddress)
		if (!proof) {
			throw new Error('Wallet is not on the allowlist')
		}
		mintArgs = {
			allowList: { merkleRoot: proof.merkleRoot, merkleProof: proof.proof },
			solPayment: { destination: umiPublicKey(echoesEnv.PFP_PAYMENT_WALLET) },
		}
		group = 'wl'
	} else {
		mintArgs = {
			solPayment: { destination: umiPublicKey(echoesEnv.PFP_PAYMENT_WALLET) },
		}
		// No group — use default guards (CM was created without guard groups for devnet testing)
		// For mainnet with WL+public groups, set group = 'public' here
		group = undefined
	}

	// Build the mint transaction
	// Set the minter to the user's wallet so they pay the solPayment guard
	const minterPublicKey = umiPublicKey(walletAddress)
	const mintIx = mintV1(umi, {
		candyMachine: cmPublicKey,
		collection: collectionPublicKey,
		asset: assetSigner,
		minter: { publicKey: minterPublicKey, signTransaction: async (t: any) => t, signMessage: async (m: any) => m, signAllTransactions: async (t: any) => t } as any,
		owner: minterPublicKey,
		payer: umi.identity,
		mintArgs,
		group,
	})

	const tx = transactionBuilder()
		.add(setComputeUnitLimit(umi, { units: 800_000 }))
		.add(mintIx)

	// Build with latest blockhash
	const blockhashResult = await umi.rpc.getLatestBlockhash()
	const built = await tx
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
