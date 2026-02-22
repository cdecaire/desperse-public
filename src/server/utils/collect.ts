/**
 * Collect utilities for REST API endpoints
 * Extracted from server functions to avoid createServerFn return issues
 */

import { db } from '@/server/db'
import { collections, posts, users, notifications, userWallets } from '@/server/db/schema'
import { eq, and, count, gte } from 'drizzle-orm'
import { env } from '@/config/env'
import { checkTransactionStatus } from '@/server/services/blockchain/mintCnft'
import { buildCompressedCollectTransaction } from '@/server/services/blockchain/compressed/mintCollectible'
import { authenticateWithToken } from '@/server/auth'
import { sendPushNotification, getActorDisplayName } from './pushDispatch'

/**
 * Result type for collect operations
 */
export interface CollectPrepareResult {
	success: boolean
	collectionId?: string
	txSignature?: string
	assetId?: string
	status?: 'pending' | 'already_collected'
	error?: string
	message?: string
}

/**
 * Check if user has hit rate limit for collects
 */
async function checkRateLimit(
	userId: string,
	ipAddress: string | null
): Promise<{
	allowed: boolean
	remaining?: number
	resetAt?: Date
	reason?: 'daily_limit' | 'ip_limit' | 'burst_limit'
}> {
	// Time windows
	const dailyWindowSeconds = env.RATE_LIMIT_WINDOW_SECONDS // 24 hours
	const burstWindowSeconds = env.COLLECT_BURST_WINDOW_SECONDS // 60 seconds
	const dailyWindowStart = new Date(Date.now() - dailyWindowSeconds * 1000)
	const burstWindowStart = new Date(Date.now() - burstWindowSeconds * 1000)

	// Limits
	const maxCollectsPerDay = env.COLLECT_RATE_LIMIT // 10 per user
	const maxCollectsPerIp = env.COLLECT_IP_RATE_LIMIT // 30 per IP
	const maxCollectsPerBurst = env.COLLECT_BURST_LIMIT // 2 per minute

	// Build queries
	const queries: Promise<{ count: number }[]>[] = [
		// User daily count
		db
			.select({ count: count() })
			.from(collections)
			.where(
				and(
					eq(collections.userId, userId),
					gte(collections.createdAt, dailyWindowStart)
				)
			),
		// User burst count
		db
			.select({ count: count() })
			.from(collections)
			.where(
				and(
					eq(collections.userId, userId),
					gte(collections.createdAt, burstWindowStart)
				)
			),
	]

	// Add IP query if we have an IP
	if (ipAddress) {
		queries.push(
			db
				.select({ count: count() })
				.from(collections)
				.where(
					and(
						eq(collections.ipAddress, ipAddress),
						gte(collections.createdAt, dailyWindowStart)
					)
				)
		)
	}

	const results = await Promise.all(queries)
	const dailyCount = results[0]?.[0]?.count || 0
	const burstCount = results[1]?.[0]?.count || 0
	const ipCount = ipAddress ? results[2]?.[0]?.count || 0 : 0

	// Check burst limit first (most immediate feedback)
	if (burstCount >= maxCollectsPerBurst) {
		return {
			allowed: false,
			remaining: 0,
			resetAt: new Date(Date.now() + burstWindowSeconds * 1000),
			reason: 'burst_limit',
		}
	}

	// Check user daily limit
	if (dailyCount >= maxCollectsPerDay) {
		return {
			allowed: false,
			remaining: 0,
			resetAt: new Date(Date.now() + dailyWindowSeconds * 1000),
			reason: 'daily_limit',
		}
	}

	// Check IP daily limit (protects against wallet rotation)
	if (ipAddress && ipCount >= maxCollectsPerIp) {
		return {
			allowed: false,
			remaining: 0,
			resetAt: new Date(Date.now() + dailyWindowSeconds * 1000),
			reason: 'ip_limit',
		}
	}

	return {
		allowed: true,
		remaining: maxCollectsPerDay - dailyCount,
	}
}

/**
 * Prepare a compressed collect transaction (direct function)
 *
 * @param postId - The post to collect
 * @param token - Bearer auth token
 * @param clientIp - Client IP for rate limiting
 * @param requestedWallet - Optional wallet address to mint to (must belong to user in userWallets).
 *   If omitted, falls back to the user's default wallet from users.walletAddress.
 */
export async function prepareCollectDirect(
	postId: string,
	token: string,
	clientIp: string | null,
	requestedWallet?: string
): Promise<CollectPrepareResult> {
	// Authenticate user
	let userId: string
	try {
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			return { success: false, error: 'auth_required', message: 'Authentication required' }
		}
		userId = auth.userId
	} catch (authError) {
		const message =
			authError instanceof Error ? authError.message : 'Authentication failed'
		console.warn('[prepareCollectDirect] Auth error:', message)
		return { success: false, error: 'auth_required', message }
	}

	// Fetch post
	const postResult = await db
		.select({
			post: posts,
			creator: {
				id: users.id,
				walletAddress: users.walletAddress,
				displayName: users.displayName,
				usernameSlug: users.usernameSlug,
			},
		})
		.from(posts)
		.innerJoin(users, eq(posts.userId, users.id))
		.where(
			and(
				eq(posts.id, postId),
				eq(posts.isDeleted, false),
				eq(posts.isHidden, false)
			)
		)
		.limit(1)

	if (postResult.length === 0) {
		return {
			success: false,
			error: 'Post not found',
			message: "This post doesn't exist or was removed.",
		}
	}

	const { post } = postResult[0]

	if (post.type !== 'collectible') {
		return {
			success: false,
			error: 'Not a collectible',
			message: 'This post is not a collectible.',
		}
	}

	// Determine collector wallet address early (needed for per-wallet collection check)
	let collectorWalletAddress: string

	if (requestedWallet) {
		// Client specified a wallet — validate it belongs to this user via userWallets table
		const [ownedWallet] = await db
			.select({ address: userWallets.address })
			.from(userWallets)
			.where(
				and(
					eq(userWallets.userId, userId),
					eq(userWallets.address, requestedWallet)
				)
			)
			.limit(1)

		if (!ownedWallet) {
			console.error(
				`[prepareCollectDirect] SECURITY: Wallet ${requestedWallet.slice(0, 8)}... not found in userWallets for user ${userId}`
			)
			return {
				success: false,
				error: 'Wallet not found',
				message:
					'The selected wallet is not linked to your account. Please link it in settings.',
			}
		}

		collectorWalletAddress = ownedWallet.address
		console.log(
			`[prepareCollectDirect] Using client-specified wallet: ${collectorWalletAddress.slice(0, 8)}...`
		)
	} else {
		// No wallet specified — fall back to default DB wallet
		const [collector] = await db
			.select({ walletAddress: users.walletAddress })
			.from(users)
			.where(eq(users.id, userId))
			.limit(1)

		if (!collector?.walletAddress) {
			return {
				success: false,
				error: 'Wallet not found',
				message: 'Please connect your wallet to collect.',
			}
		}

		collectorWalletAddress = collector.walletAddress
	}

	// Existing collection? (one per user per post, regardless of wallet)
	const existingCollection = await db
		.select()
		.from(collections)
		.where(and(eq(collections.userId, userId), eq(collections.postId, postId)))
		.limit(1)

	if (existingCollection.length > 0) {
		const existing = existingCollection[0]
		if (existing.status === 'confirmed') {
			return {
				success: true,
				collectionId: existing.id,
				status: 'already_collected',
				message: "You've already collected this.",
			}
		}

		// Check if there's a pending/failed collection with a txSignature that might have confirmed
		if (existing.txSignature && existing.status !== 'confirmed') {
			console.log(
				`[prepareCollectDirect] Checking on-chain status for existing collection ${existing.id} with txSignature ${existing.txSignature}`
			)

			const txStatus = await checkTransactionStatus(existing.txSignature)

			if (txStatus.status === 'confirmed' || txStatus.status === 'finalized') {
				console.log(
					`[prepareCollectDirect] Found confirmed tx for collection ${existing.id}, updating status`
				)

				// Try to extract asset ID if we don't have it
				let assetId = existing.nftMint
				if (!assetId) {
					const { extractAssetIdFromTransaction } = await import(
						'@/server/services/blockchain/compressed/mintCollectible'
					)
					assetId = await extractAssetIdFromTransaction(existing.txSignature)
				}

				// Update to confirmed
				await db
					.update(collections)
					.set({
						status: 'confirmed',
						nftMint: assetId || existing.nftMint,
					})
					.where(eq(collections.id, existing.id))

				// Create notification for post owner (non-critical)
				try {
					const [postData] = await db
						.select({ userId: posts.userId })
						.from(posts)
						.where(eq(posts.id, existing.postId))
						.limit(1)

					if (postData && postData.userId !== existing.userId) {
						await db.insert(notifications).values({
							userId: postData.userId,
							actorId: existing.userId,
							type: 'collect',
							referenceType: 'post',
							referenceId: existing.postId,
						})

						// Dispatch push notification (awaited for serverless compatibility)
						const actorName = await getActorDisplayName(existing.userId)
						await sendPushNotification(postData.userId, {
							type: 'collect',
							title: `${actorName} collected your post`,
							body: '',
							deepLink: `https://desperse.com/p/${existing.postId}`,
						})
					}
				} catch (notifError) {
					console.warn(
						'[prepareCollectDirect] Failed to create notification:',
						notifError instanceof Error ? notifError.message : 'Unknown error'
					)
				}

				return {
					success: true,
					collectionId: existing.id,
					status: 'already_collected',
					message: "You've already collected this.",
				}
			}

			// If tx explicitly failed on-chain, mark as failed and allow retry
			if (txStatus.status === 'failed') {
				console.log(
					`[prepareCollectDirect] Found failed tx for collection ${existing.id}, allowing retry`
				)
				await db
					.update(collections)
					.set({ status: 'failed' })
					.where(eq(collections.id, existing.id))
				// Continue to retry logic below
			}
		}

		if (existing.status === 'pending') {
			// Check if pending is stale (older than 2 minutes)
			const STALE_PENDING_THRESHOLD_MS = 2 * 60 * 1000 // 2 minutes
			const now = new Date()
			const ageMs = now.getTime() - existing.createdAt.getTime()

			if (ageMs > STALE_PENDING_THRESHOLD_MS) {
				// Mark stale pending as failed to allow retry
				await db
					.update(collections)
					.set({ status: 'failed' })
					.where(eq(collections.id, existing.id))

				console.log(
					`[prepareCollectDirect] Auto-marked stale pending collection as failed: ${existing.id} (age: ${Math.round(ageMs / 1000)}s)`
				)
				// Continue to retry logic below
			} else if (existing.txSignature) {
				// If pending with signature and not stale, let client poll/confirm
				return {
					success: true,
					collectionId: existing.id,
					status: 'pending',
					message: 'Collection is being processed...',
				}
			} else {
				// Pending without signature - mark as failed and allow retry
				await db
					.update(collections)
					.set({ status: 'failed' })
					.where(eq(collections.id, existing.id))
				// Continue to retry logic below
			}
		}
		// If failed (or was just marked as failed above), allow retry below
	}

	// Rate limit (user + IP + burst)
	const rateLimitResult = await checkRateLimit(userId, clientIp)
	if (!rateLimitResult.allowed) {
		const secondsUntilReset = rateLimitResult.resetAt
			? Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000)
			: 60

		// Different messages based on which limit was hit
		let message: string
		if (rateLimitResult.reason === 'burst_limit') {
			message = `Slow down! Try again in ${secondsUntilReset} seconds.`
		} else if (rateLimitResult.reason === 'ip_limit') {
			const hoursUntilReset = Math.ceil(secondsUntilReset / 3600)
			message = `Too many collects from this network. Try again in ${hoursUntilReset} hour${hoursUntilReset > 1 ? 's' : ''}.`
		} else {
			const hoursUntilReset = Math.ceil(secondsUntilReset / 3600)
			message = `You've reached your daily collect limit. Try again in ${hoursUntilReset} hour${hoursUntilReset > 1 ? 's' : ''}.`
		}

		return {
			success: false,
			error: 'Rate limited',
			message,
		}
	}

	// Create / update collection record
	let collectionId: string
	if (existingCollection.length > 0 && existingCollection[0].status === 'failed') {
		collectionId = existingCollection[0].id
		await db
			.update(collections)
			.set({
				status: 'pending',
				txSignature: null,
				nftMint: null,
				walletAddress: collectorWalletAddress, // Track which wallet receives the cNFT
				ipAddress: clientIp, // Update IP on retry
			})
			.where(eq(collections.id, collectionId))
	} else {
		const newCollection = await db
			.insert(collections)
			.values({
				userId,
				postId,
				status: 'pending',
				walletAddress: collectorWalletAddress, // Track which wallet receives the cNFT
				ipAddress: clientIp, // Store IP for rate limiting
			})
			.returning()
		collectionId = newCollection[0].id
	}

	// Build compressed collect transaction (Bubblegum/Umi)
	const buildResult = await buildCompressedCollectTransaction({
		postId,
		collectorPubkey: collectorWalletAddress,
	})

	if (!buildResult.success || !buildResult.txSignature) {
		await db
			.update(collections)
			.set({ status: 'failed' })
			.where(eq(collections.id, collectionId))

		return {
			success: false,
			error: buildResult.error || 'Failed to submit collect transaction',
			message: buildResult.error || 'Failed to submit collect transaction',
		}
	}

	// Update collection with transaction signature and asset ID (if available)
	await db
		.update(collections)
		.set({
			status: 'pending',
			txSignature: buildResult.txSignature,
			nftMint: buildResult.assetId || null, // Asset ID for cNFTs
		})
		.where(eq(collections.id, collectionId))

	return {
		success: true,
		collectionId,
		txSignature: buildResult.txSignature,
		assetId: buildResult.assetId, // Return asset ID if extracted
		status: 'pending',
	}
}

/**
 * Result type for status check
 */
export interface CollectionStatusResult {
	success: boolean
	status?: 'pending' | 'confirmed' | 'failed'
	txSignature?: string
	nftMint?: string
	error?: string
}

/**
 * Check collection status (direct function for REST API)
 */
export async function checkCollectionStatusDirect(
	collectionId: string
): Promise<CollectionStatusResult> {
	try {
		const collection = await db
			.select()
			.from(collections)
			.where(eq(collections.id, collectionId))
			.limit(1)

		if (collection.length === 0) {
			return {
				success: false,
				error: 'Collection not found',
			}
		}

		const col = collection[0]

		// Auto-clear stale pending records (older than 2 minutes)
		const STALE_PENDING_THRESHOLD_MS = 2 * 60 * 1000 // 2 minutes
		const now = new Date()
		const ageMs = now.getTime() - col.createdAt.getTime()

		if (col.status === 'pending' && ageMs > STALE_PENDING_THRESHOLD_MS) {
			// Mark stale pending as failed
			await db
				.update(collections)
				.set({ status: 'failed' })
				.where(eq(collections.id, collectionId))

			console.log(
				`[checkCollectionStatusDirect] Auto-marked stale pending collection as failed: ${collectionId} (age: ${Math.round(ageMs / 1000)}s)`
			)

			return {
				success: true,
				status: 'failed',
				txSignature: col.txSignature || undefined,
				nftMint: col.nftMint || undefined,
			}
		}

		// If still pending and we have a tx signature, check on-chain status
		if (col.status === 'pending' && col.txSignature) {
			const txStatus = await checkTransactionStatus(col.txSignature)

			if (txStatus.status === 'confirmed' || txStatus.status === 'finalized') {
				// Try to extract asset ID if we don't have it yet
				let assetId = col.nftMint
				if (!assetId) {
					const { extractAssetIdFromTransaction } = await import(
						'@/server/services/blockchain/compressed/mintCollectible'
					)
					assetId = await extractAssetIdFromTransaction(col.txSignature)
				}

				// Update to confirmed with asset ID
				await db
					.update(collections)
					.set({
						status: 'confirmed',
						nftMint: assetId || col.nftMint,
					})
					.where(eq(collections.id, collectionId))

				// Snapshot minted metadata on first confirmed mint (non-critical)
				try {
					const { snapshotMintedMetadata } = await import(
						'@/server/utils/mint-snapshot'
					)
					await snapshotMintedMetadata({
						postId: col.postId,
						txSignature: col.txSignature,
					})
				} catch (snapshotError) {
					console.warn(
						'[checkCollectionStatusDirect] Failed to snapshot metadata:',
						snapshotError instanceof Error
							? snapshotError.message
							: 'Unknown error'
					)
				}

				// Create notification for post owner (non-critical)
				try {
					const [post] = await db
						.select({ userId: posts.userId })
						.from(posts)
						.where(eq(posts.id, col.postId))
						.limit(1)

					if (post && post.userId !== col.userId) {
						await db.insert(notifications).values({
							userId: post.userId,
							actorId: col.userId,
							type: 'collect',
							referenceType: 'post',
							referenceId: col.postId,
						})

						// Dispatch push notification (awaited for serverless compatibility)
						const actorName = await getActorDisplayName(col.userId)
						await sendPushNotification(post.userId, {
							type: 'collect',
							title: `${actorName} collected your post`,
							body: '',
							deepLink: `https://desperse.com/p/${col.postId}`,
						})
					}
				} catch (notifError) {
					console.warn(
						'[checkCollectionStatusDirect] Failed to create notification:',
						notifError instanceof Error ? notifError.message : 'Unknown error'
					)
				}

				return {
					success: true,
					status: 'confirmed',
					txSignature: col.txSignature,
					nftMint: assetId || col.nftMint || undefined,
				}
			}

			if (txStatus.status === 'failed') {
				// Update to failed
				await db
					.update(collections)
					.set({ status: 'failed' })
					.where(eq(collections.id, collectionId))

				return {
					success: true,
					status: 'failed',
					txSignature: col.txSignature,
				}
			}
		}

		return {
			success: true,
			status: col.status as 'pending' | 'confirmed' | 'failed',
			txSignature: col.txSignature || undefined,
			nftMint: col.nftMint || undefined,
		}
	} catch (error) {
		console.error('Error in checkCollectionStatusDirect:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
		}
	}
}
