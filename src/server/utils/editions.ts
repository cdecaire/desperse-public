/**
 * Edition utilities for REST API endpoints
 * Extracted from server functions to avoid createServerFn return issues
 *
 * Note: buyEditionDirect requires complex blockchain operations. For now, we provide
 * simpler direct functions for signature submission and status checking.
 */

import { db } from '@/server/db'
import { purchases, posts, users } from '@/server/db/schema'
import { eq, and, lt, or, isNull } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { authenticateWithToken } from '@/server/auth'
import { getHeliusRpcUrl, getPlatformWalletAddress } from '@/config/env'
import { validateAddress } from '@/server/services/blockchain/addressUtils'

// Minting fee in lamports (must match transactionBuilder.ts)
const MINTING_FEE_LAMPORTS = 10_000_000 // 0.01 SOL
// USDC mint address (devnet for testing)
const USDC_MINT_ADDRESS = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'

// Types
export type PurchaseStatus =
	| 'reserved'
	| 'submitted'
	| 'minting'
	| 'confirmed'
	| 'failed'
	| 'abandoned'

export interface BuyEditionResult {
	success: boolean
	status?: PurchaseStatus | 'sold_out' | 'insufficient_funds'
	purchaseId?: string
	transaction?: string
	mintAddress?: string
	message?: string
	error?: string
}

export interface SubmitSignatureResult {
	success: boolean
	error?: string
}

export interface CheckStatusResult {
	success: boolean
	status?: PurchaseStatus
	txSignature?: string | null
	nftMint?: string | null
	error?: string
}

/**
 * Submit transaction signature after client signing (core logic)
 * No authentication required - uses purchaseId for identification
 */
export async function submitPurchaseSignatureDirect(
	purchaseId: string,
	txSignature: string
): Promise<SubmitSignatureResult> {
	console.log('[submitPurchaseSignatureDirect] Processing:', { purchaseId, txSigPrefix: txSignature.slice(0, 20) })
	try {
		// Update to 'submitted' status when we have a transaction signature
		await db
			.update(purchases)
			.set({
				txSignature,
				status: 'submitted',
				submittedAt: new Date(),
			})
			.where(eq(purchases.id, purchaseId))

		return { success: true }
	} catch (error) {
		console.error('Error in submitPurchaseSignatureDirect:', error)
		return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
	}
}

/**
 * Check purchase status for polling (core logic)
 * No authentication required - uses purchaseId for identification
 */
export async function checkPurchaseStatusDirect(
	purchaseId: string
): Promise<CheckStatusResult> {
	console.log('[checkPurchaseStatusDirect] Checking status for:', purchaseId)
	try {
		const purchaseResult = await db
			.select()
			.from(purchases)
			.where(eq(purchases.id, purchaseId))
			.limit(1)

		if (!purchaseResult.length) {
			return { success: false, error: 'Purchase not found' }
		}

		const purchase = purchaseResult[0]
		console.log('[checkPurchaseStatusDirect] Found purchase:', {
			status: purchase.status,
			hasTxSignature: !!purchase.txSignature,
			nftMint: purchase.nftMint || 'null',
		})

		// Auto-clear stale 'reserved' records (never submitted, older than 2 minutes)
		// BUT: Don't mark as abandoned if there's a txSignature (payment was submitted)
		const STALE_RESERVED_THRESHOLD_MS = 2 * 60 * 1000 // 2 minutes
		const now = new Date()
		const ageMs = now.getTime() - (purchase.reservedAt?.getTime() || purchase.createdAt.getTime())

		if (purchase.status === 'reserved' && ageMs > STALE_RESERVED_THRESHOLD_MS && !purchase.txSignature) {
			// Mark stale reserved as abandoned and release reserved supply (only if no tx signature)
			await db
				.update(purchases)
				.set({
					status: 'abandoned',
					failedAt: new Date(),
				})
				.where(eq(purchases.id, purchaseId))

			// Decrement the reserved supply
			await db
				.update(posts)
				.set({
					currentSupply: sql`GREATEST(0, ${posts.currentSupply} - 1)`,
				})
				.where(eq(posts.id, purchase.postId))

			console.log(`[checkPurchaseStatusDirect] Auto-marked stale reserved purchase as abandoned: ${purchaseId} (age: ${Math.round(ageMs / 1000)}s)`)

			return {
				success: true,
				status: 'abandoned',
				txSignature: purchase.txSignature,
				nftMint: purchase.nftMint,
			}
		}

		// If purchase is 'reserved' but has a txSignature, upgrade to 'submitted'
		if (purchase.status === 'reserved' && purchase.txSignature) {
			console.log(`[checkPurchaseStatusDirect] Found reserved purchase with txSignature, upgrading to submitted: ${purchaseId}`)
			await db
				.update(purchases)
				.set({
					status: 'submitted',
					submittedAt: new Date(),
				})
				.where(
					and(
						eq(purchases.id, purchaseId),
						eq(purchases.status, 'reserved')
					)
				)
		}

		// For submitted transactions, we need to check on-chain status
		// This is handled by a separate fulfillment process triggered by webhooks
		// Here we just return the current database status

		// Handle awaiting_fulfillment and master_created - trigger fulfillment
		// This ensures Android purchases get their NFT minted when polling
		if (purchase.status === 'awaiting_fulfillment' || purchase.status === 'master_created') {
			console.log(`[checkPurchaseStatusDirect] Triggering fulfillment for ${purchaseId}`)

			const { fulfillPurchaseDirect } = await import('./fulfillment')
			const fulfillResult = await fulfillPurchaseDirect(purchaseId)

			return {
				success: fulfillResult.success,
				status: fulfillResult.status,
				txSignature: purchase.txSignature,
				nftMint: fulfillResult.nftMint || null,
				error: fulfillResult.error,
			}
		}

		return {
			success: true,
			status: purchase.status as PurchaseStatus,
			txSignature: purchase.txSignature,
			nftMint: purchase.nftMint,
		}
	} catch (error) {
		console.error('Error in checkPurchaseStatusDirect:', error)
		return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
	}
}

/**
 * Buy edition - initiate purchase (core logic)
 * Requires authentication
 *
 * This is a complex operation involving:
 * 1. Authentication
 * 2. Balance checks (SOL/USDC)
 * 3. Supply validation
 * 4. Transaction building
 * 5. Database reservation
 */
export async function buyEditionDirect(
	postId: string,
	walletAddress: string | undefined,
	token: string
): Promise<BuyEditionResult> {
	console.log('[buyEditionDirect] Received request:', { postId, hasWalletAddress: !!walletAddress })

	try {
		// Authenticate user
		let userId: string
		try {
			const auth = await authenticateWithToken(token)
			if (!auth?.userId) {
				return { success: false, error: 'auth_required', message: 'Authentication required. Please log in.' }
			}
			userId = auth.userId
		} catch (authError) {
			const message = authError instanceof Error ? authError.message : 'Authentication failed'
			console.warn('[buyEditionDirect] Auth error:', message)
			return { success: false, error: 'auth_required', message }
		}

		console.log('[buyEditionDirect] Authenticated:', { postId, userId, hasWalletAddress: !!walletAddress })

		// Fetch post and creator info
		const postResult = await db
			.select({
				post: posts,
				creator: {
					id: users.id,
					walletAddress: users.walletAddress,
					usernameSlug: users.usernameSlug,
					displayName: users.displayName,
				},
			})
			.from(posts)
			.innerJoin(users, eq(posts.userId, users.id))
			.where(eq(posts.id, postId))
			.limit(1)

		if (!postResult.length) {
			return { success: false, error: 'Post not found', message: 'This post is unavailable.' }
		}

		const { post, creator: creatorFromDb } = postResult[0]

		if (post.type !== 'edition' || !post.price || !post.currency) {
			return { success: false, error: 'Not an edition', message: 'This post is not purchasable as an edition.' }
		}

		// Supply check (pre-flight)
		if (post.maxSupply !== null && post.maxSupply !== undefined && post.currentSupply >= post.maxSupply) {
			return { success: false, status: 'sold_out', message: 'This edition is sold out.' }
		}

		// Use creatorWallet from post if available, otherwise fall back to creator.walletAddress
		const creatorWallet = post.creatorWallet || creatorFromDb.walletAddress
		if (!creatorWallet) {
			return { success: false, error: 'Creator wallet not found', message: 'Creator wallet address is missing.' }
		}

		const creator = {
			...creatorFromDb,
			walletAddress: creatorWallet,
		}

		// Import blockchain utilities dynamically
		const { PublicKey, Connection } = await import('@solana/web3.js')
		const { generateNftMetadata } = await import('@/server/functions/posts')
		const { uploadMetadataJson } = await import('@/server/storage/blob')

		// Helper functions (defined inline to avoid complex import issues)
		async function getConnection() {
			return new Connection(getHeliusRpcUrl(), 'confirmed')
		}

		async function ensureSolBalance(address: string, requiredLamports: bigint): Promise<boolean> {
			if (!validateAddress(address)) {
				console.error('[ensureSolBalance] Invalid address:', address)
				return false
			}
			const connection = await getConnection()
			const balance = await connection.getBalance(new PublicKey(address))
			return BigInt(balance) >= requiredLamports
		}

		async function ensureUsdcBalance(ownerAddress: string, requiredAmount: bigint): Promise<boolean> {
			if (!validateAddress(ownerAddress)) {
				console.error('[ensureUsdcBalance] Invalid owner address:', ownerAddress)
				return false
			}
			const connection = await getConnection()
			const owner = new PublicKey(ownerAddress)
			const usdcMint = new PublicKey(USDC_MINT_ADDRESS)
			const accounts = await connection.getParsedTokenAccountsByOwner(owner, { mint: usdcMint })
			const total = accounts.value.reduce((sum, acc) => {
				const amount = acc.account.data.parsed.info.tokenAmount.amount as string
				return sum + BigInt(amount || '0')
			}, 0n)
			return total >= requiredAmount
		}

		// Buyer wallet - use provided wallet address (from connected wallet) or fall back to database
		let buyerWallet: string

		if (walletAddress) {
			if (!validateAddress(walletAddress)) {
				console.error('[buyEditionDirect] Invalid wallet address:', walletAddress)
				return { success: false, error: 'Invalid wallet address', message: 'Invalid wallet address provided.' }
			}
			const pubkey = new PublicKey(walletAddress)
			buyerWallet = pubkey.toBase58()
			console.log('[buyEditionDirect] Using provided wallet address:', buyerWallet)
		} else {
			console.log('[buyEditionDirect] No wallet address provided, using database wallet')
			const buyerRow = await db.select({ walletAddress: users.walletAddress }).from(users).where(eq(users.id, userId)).limit(1)
			if (!buyerRow.length || !buyerRow[0].walletAddress) {
				return { success: false, error: 'Wallet not found', message: 'Please connect your wallet.' }
			}
			buyerWallet = buyerRow[0].walletAddress
		}

		const connection = await getConnection()

		// Balance check for Core minting
		const transactionFeeLamports = 10_000n
		const mintingFeeLamports = BigInt(MINTING_FEE_LAMPORTS)

		console.log('[buyEditionDirect] Balance check:', {
			price: post.price,
			currency: post.currency,
			mintingFee: Number(mintingFeeLamports) / 1e9,
			transactionFee: Number(transactionFeeLamports) / 1e9,
		})

		if (post.currency === 'SOL') {
			const required = BigInt(post.price) + mintingFeeLamports + transactionFeeLamports
			console.log('[buyEditionDirect] SOL payment required:', Number(required) / 1e9, 'SOL')

			const hasSol = await ensureSolBalance(buyerWallet, required)
			if (!hasSol) {
				return {
					success: false,
					status: 'insufficient_funds',
					message: `Not enough SOL. Required: ${Number(required) / 1e9} SOL (price: ${Number(post.price) / 1e9} + minting fee: ${Number(mintingFeeLamports) / 1e9})`,
				}
			}
		} else {
			const solRequired = mintingFeeLamports + transactionFeeLamports
			console.log('[buyEditionDirect] USDC payment - SOL required for fees:', Number(solRequired) / 1e9, 'SOL')

			const hasSolForFees = await ensureSolBalance(buyerWallet, solRequired)
			if (!hasSolForFees) {
				return {
					success: false,
					status: 'insufficient_funds',
					message: `Not enough SOL for minting fee. Required: ${Number(solRequired) / 1e9} SOL`,
				}
			}

			const hasUsdc = await ensureUsdcBalance(buyerWallet, BigInt(post.price))
			if (!hasUsdc) {
				return {
					success: false,
					status: 'insufficient_funds',
					message: 'Not enough USDC balance.',
				}
			}
		}

		let resolvedMetadataUri = post.metadataUrl || post.mediaUrl

		if (resolvedMetadataUri && resolvedMetadataUri.length > 200) {
			console.error('Metadata URI too long:', resolvedMetadataUri.length, 'characters')
			return {
				success: false,
				error: 'Metadata URI too long',
				message: 'Metadata URI exceeds maximum length. Please contact support.',
			}
		}

		if (!resolvedMetadataUri) {
			const metadata = generateNftMetadata(
				{
					id: post.id,
					caption: post.caption,
					mediaUrl: post.mediaUrl,
					coverUrl: post.coverUrl,
					type: 'edition',
					maxSupply: post.maxSupply,
					price: post.price,
					currency: post.currency,
					nftName: post.nftName,
					nftSymbol: post.nftSymbol,
					nftDescription: post.nftDescription,
					sellerFeeBasisPoints: post.sellerFeeBasisPoints,
					isMutable: post.isMutable,
				},
				creator
			)

			const upload = await uploadMetadataJson(metadata, post.id)
			if (!upload.success) {
				return {
					success: false,
					error: 'Metadata upload failed',
					message: 'Could not upload NFT metadata.',
				}
			}
			resolvedMetadataUri = upload.url
		}

		// Validate platform wallet
		const platformWalletAddress = getPlatformWalletAddress()

		console.log('[buyEditionDirect] Building transaction:', {
			buyer: buyerWallet,
			creator: creator.walletAddress,
			platform: platformWalletAddress,
			metadataUriLength: resolvedMetadataUri?.length,
		})

		// Build payment transaction
		const { buildEditionPaymentTransaction } = await import('@/server/services/blockchain/editions/transactionBuilder')
		const paymentTxResult = await buildEditionPaymentTransaction({
			buyer: buyerWallet,
			creator: creator.walletAddress,
			platform: platformWalletAddress,
			price: post.price,
			currency: post.currency,
		})

		// Reserve supply atomically
		const supplyUpdate = await db
			.update(posts)
			.set({
				currentSupply: sql`${posts.currentSupply} + 1`,
			})
			.where(and(eq(posts.id, postId), or(isNull(posts.maxSupply), lt(posts.currentSupply, posts.maxSupply))))
			.returning({ currentSupply: posts.currentSupply })

		if (!supplyUpdate.length) {
			return { success: false, status: 'sold_out', message: 'This edition is sold out.' }
		}

		// Create purchase record as reservation
		const purchaseInsert = await db
			.insert(purchases)
			.values({
				userId,
				postId,
				nftMint: null,
				amountPaid: post.price,
				currency: post.currency,
				status: 'reserved',
				reservedAt: new Date(),
			})
			.returning({ id: purchases.id })

		const purchaseId = purchaseInsert[0].id

		return {
			success: true,
			status: 'reserved',
			purchaseId,
			transaction: paymentTxResult.transactionBase64,
		}
	} catch (error) {
		console.error('Error in buyEditionDirect:', error)

		if (error instanceof Error) {
			console.error('Error details:', {
				name: error.name,
				message: error.message,
				stack: error.stack,
			})

			if (error.message.includes('HELIUS_API_KEY') || error.message.includes('RPC')) {
				return {
					success: false,
					error: 'RPC configuration error',
					message: 'Server configuration issue. Please contact support.',
				}
			}

			if (error.message.includes('database') || error.message.includes('connection')) {
				return {
					success: false,
					error: 'Database error',
					message: 'Database connection issue. Please try again.',
				}
			}
		}

		const errMessage = error instanceof Error ? error.message : 'Unknown error'
		return {
			success: false,
			error: errMessage,
			message: 'An error occurred while processing your purchase. Please try again.',
		}
	}
}
