/**
 * Internal transaction history enrichment (server-only)
 * Correlates on-chain transaction signatures with app database records
 * to provide meaningful context for wallet activity.
 *
 * This file should NEVER be imported from client code or hooks.
 */

import { db } from '@/server/db'
import { purchases, posts, users, collections, tips } from '@/server/db/schema'
import { eq, inArray, and, desc } from 'drizzle-orm'

export type TxDirection = 'in' | 'out'

export type ActivityType =
	| 'edition_sale'
	| 'edition_purchase'
	| 'collection'
	| 'tip_sent'
	| 'tip_received'
	| 'transfer_in'
	| 'transfer_out'

export type ActivityContext = {
	type: ActivityType
	post?: {
		id: string
		caption: string | null
		coverUrl: string | null
		mediaUrl: string
	}
	counterparty?: {
		id: string
		displayName: string | null
		usernameSlug: string
		avatarUrl: string | null
	}
	// For collections, we include the creator info
	creator?: {
		id: string
		displayName: string | null
		usernameSlug: string
		avatarUrl: string | null
	}
}

export type ActivityEntry = {
	id: string // Unique identifier (signature or collection id)
	signature?: string // Transaction signature (if applicable)
	token: 'SOL' | 'USDC' | 'SKR' | null // null for free collects
	amount: number | null // null for free collects
	direction: TxDirection | null // null for free collects
	timestamp: number
	type: ActivityType
	context: ActivityContext
}

export type RawHistoryEntry = {
	signature: string
	address: string
	token: 'SOL' | 'USDC'
	amount: number
	direction: TxDirection
	timestamp: number
}

/**
 * Enriches transaction history entries with app context.
 * Looks up transaction signatures in the purchases table and joins
 * with posts/users to provide meaningful descriptions.
 */
export async function enrichTransactionHistory(
	entries: RawHistoryEntry[],
	walletAddresses: string[]
): Promise<ActivityEntry[]> {
	if (entries.length === 0) {
		return []
	}

	// Extract unique signatures to look up
	const signatures = [...new Set(entries.map((e) => e.signature))]

	// Query purchases table for matching signatures
	const matchingPurchases = await db
		.select({
			txSignature: purchases.txSignature,
			amountPaid: purchases.amountPaid,
			currency: purchases.currency,
			status: purchases.status,
			// Use stored buyer wallet (multi-wallet aware), fallback to legacy users.walletAddress
			buyerWalletAddress: purchases.buyerWalletAddress,
			legacyBuyerWalletAddress: users.walletAddress,
			postId: posts.id,
			postCaption: posts.caption,
			postCoverUrl: posts.coverUrl,
			postMediaUrl: posts.mediaUrl,
			postUserId: posts.userId,
			buyerId: users.id,
			buyerDisplayName: users.displayName,
			buyerUsernameSlug: users.usernameSlug,
			buyerAvatarUrl: users.avatarUrl,
		})
		.from(purchases)
		.innerJoin(posts, eq(purchases.postId, posts.id))
		.innerJoin(users, eq(purchases.userId, users.id))
		.where(
			and(
				inArray(purchases.txSignature, signatures),
				eq(purchases.status, 'confirmed')
			)
		)

	// Fetch post owners (sellers)
	const postUserIds = [...new Set(matchingPurchases.map((p) => p.postUserId))]
	const sellers =
		postUserIds.length > 0
			? await db
					.select({
						id: users.id,
						displayName: users.displayName,
						usernameSlug: users.usernameSlug,
						avatarUrl: users.avatarUrl,
						walletAddress: users.walletAddress,
					})
					.from(users)
					.where(inArray(users.id, postUserIds))
			: []

	const sellerMap = new Map(sellers.map((s) => [s.id, s]))

	// Create a map of signature -> purchase data
	const purchaseMap = new Map(
		matchingPurchases.map((p) => [
			p.txSignature,
			{ ...p, seller: sellerMap.get(p.postUserId) },
		])
	)

	// Query tips table for matching signatures
	const matchingTips = await db
		.select({
			txSignature: tips.txSignature,
			amount: tips.amount,
			tokenMint: tips.tokenMint,
			fromUserId: tips.fromUserId,
			toUserId: tips.toUserId,
		})
		.from(tips)
		.where(
			and(
				inArray(tips.txSignature, signatures),
				eq(tips.status, 'confirmed')
			)
		)

	// Fetch all users involved in tips (senders + receivers)
	const tipUserIds = [...new Set(matchingTips.flatMap((t) => [t.fromUserId, t.toUserId]))]
	const tipUsers =
		tipUserIds.length > 0
			? await db
					.select({
						id: users.id,
						displayName: users.displayName,
						usernameSlug: users.usernameSlug,
						avatarUrl: users.avatarUrl,
					})
					.from(users)
					.where(inArray(users.id, tipUserIds))
			: []

	const tipUserMap = new Map(tipUsers.map((u) => [u.id, u]))

	// Create a map of signature -> tip data with sender/receiver info
	const tipMap = new Map(
		matchingTips
			.filter((t) => t.txSignature != null)
			.map((t) => [
				t.txSignature!,
				{
					...t,
					sender: tipUserMap.get(t.fromUserId),
					receiver: tipUserMap.get(t.toUserId),
				},
			])
	)

	// Normalize wallet addresses for comparison
	const walletSet = new Set(walletAddresses.map((w) => w.toLowerCase()))

	// Enrich each entry
	return entries.map((entry): ActivityEntry => {
		const purchase = purchaseMap.get(entry.signature)
		const tip = tipMap.get(entry.signature)

		// Check for tip match first (tips also have SOL fee transfers)
		if (tip && tip.sender && tip.receiver) {
			// Tipper's wallet pays SOL fees (direction 'out'), receiver may see 'in'
			const isSender = entry.direction === 'out'
			const type: ActivityType = isSender ? 'tip_sent' : 'tip_received'
			const counterparty = isSender ? tip.receiver : tip.sender

			return {
				id: entry.signature,
				signature: entry.signature,
				token: 'SKR',
				amount: Number(tip.amount) / 1e6, // SKR has 6 decimals
				direction: entry.direction,
				timestamp: entry.timestamp,
				type,
				context: {
					type,
					counterparty: {
						id: counterparty.id,
						displayName: counterparty.displayName,
						usernameSlug: counterparty.usernameSlug,
						avatarUrl: counterparty.avatarUrl,
					},
				},
			}
		}

		if (!purchase || !purchase.seller) {
			// No matching purchase or tip - return as generic transfer
			return {
				id: entry.signature,
				signature: entry.signature,
				token: entry.token,
				amount: entry.amount,
				direction: entry.direction,
				timestamp: entry.timestamp,
				type: entry.direction === 'in' ? 'transfer_in' : 'transfer_out',
				context: {
					type: entry.direction === 'in' ? 'transfer_in' : 'transfer_out',
				},
			}
		}

		// Determine perspective: buyer or seller?
		// Prefer stored buyerWalletAddress (multi-wallet aware), fallback to legacy users.walletAddress
		const buyerWallet = (purchase.buyerWalletAddress || purchase.legacyBuyerWalletAddress)?.toLowerCase()
		const sellerWallet = purchase.seller.walletAddress?.toLowerCase()
		const isBuyer = buyerWallet && walletSet.has(buyerWallet)
		const isSeller = sellerWallet && walletSet.has(sellerWallet)

		if (!isBuyer && !isSeller) {
			return {
				id: entry.signature,
				signature: entry.signature,
				token: entry.token,
				amount: entry.amount,
				direction: entry.direction,
				timestamp: entry.timestamp,
				type: entry.direction === 'in' ? 'transfer_in' : 'transfer_out',
				context: {
					type: entry.direction === 'in' ? 'transfer_in' : 'transfer_out',
				},
			}
		}

		const type: ActivityType = isSeller ? 'edition_sale' : 'edition_purchase'

		return {
			id: entry.signature,
			signature: entry.signature,
			token: entry.token,
			amount: entry.amount,
			direction: entry.direction,
			timestamp: entry.timestamp,
			type,
			context: {
				type,
				post: {
					id: purchase.postId,
					caption: purchase.postCaption,
					coverUrl: purchase.postCoverUrl,
					mediaUrl: purchase.postMediaUrl,
				},
				counterparty: isSeller
					? {
							id: purchase.buyerId,
							displayName: purchase.buyerDisplayName,
							usernameSlug: purchase.buyerUsernameSlug,
							avatarUrl: purchase.buyerAvatarUrl,
						}
					: {
							id: purchase.seller.id,
							displayName: purchase.seller.displayName,
							usernameSlug: purchase.seller.usernameSlug,
							avatarUrl: purchase.seller.avatarUrl,
						},
			},
		}
	})
}

/**
 * Fetches user's recent collections (free cNFT mints) from the database.
 * These don't appear as SOL/USDC transfers, so we fetch them separately.
 */
export async function fetchUserCollections(
	userId: string,
	limit = 20,
	walletAddress?: string
): Promise<ActivityEntry[]> {
	// Query collections with post and creator info
	const conditions = [eq(collections.userId, userId), eq(collections.status, 'confirmed')]

	const userCollections = await db
		.select({
			collectionId: collections.id,
			txSignature: collections.txSignature,
			collectionWallet: collections.walletAddress,
			status: collections.status,
			createdAt: collections.createdAt,
			postId: posts.id,
			postCaption: posts.caption,
			postCoverUrl: posts.coverUrl,
			postMediaUrl: posts.mediaUrl,
			creatorId: users.id,
			creatorDisplayName: users.displayName,
			creatorUsernameSlug: users.usernameSlug,
			creatorAvatarUrl: users.avatarUrl,
		})
		.from(collections)
		.innerJoin(posts, eq(collections.postId, posts.id))
		.innerJoin(users, eq(posts.userId, users.id))
		.where(and(...conditions))
		.orderBy(desc(collections.createdAt))
		.limit(limit)

	// Filter by wallet if specified (only include collections matching the active wallet)
	const filtered = walletAddress
		? userCollections.filter((c) => c.collectionWallet === walletAddress)
		: userCollections

	return filtered.map(
		(c): ActivityEntry => ({
			id: c.collectionId,
			signature: c.txSignature ?? undefined,
			token: null, // Free collect
			amount: null, // Free collect
			direction: null, // Not a transfer
			timestamp: c.createdAt.getTime(),
			type: 'collection',
			context: {
				type: 'collection',
				post: {
					id: c.postId,
					caption: c.postCaption,
					coverUrl: c.postCoverUrl,
					mediaUrl: c.postMediaUrl,
				},
				creator: {
					id: c.creatorId,
					displayName: c.creatorDisplayName,
					usernameSlug: c.creatorUsernameSlug,
					avatarUrl: c.creatorAvatarUrl,
				},
			},
		})
	)
}

/**
 * Fetches user's recent edition purchases from the database.
 * These are fetched directly (like collections) to ensure they always
 * appear in the activity feed, even if the blockchain transaction
 * falls outside the recent Helius history window.
 */
export async function fetchUserPurchases(
	userId: string,
	limit = 20
): Promise<ActivityEntry[]> {
	const userPurchases = await db
		.select({
			purchaseId: purchases.id,
			txSignature: purchases.txSignature,
			amountPaid: purchases.amountPaid,
			currency: purchases.currency,
			status: purchases.status,
			createdAt: purchases.createdAt,
			postId: posts.id,
			postCaption: posts.caption,
			postCoverUrl: posts.coverUrl,
			postMediaUrl: posts.mediaUrl,
			sellerId: users.id,
			sellerDisplayName: users.displayName,
			sellerUsernameSlug: users.usernameSlug,
			sellerAvatarUrl: users.avatarUrl,
		})
		.from(purchases)
		.innerJoin(posts, eq(purchases.postId, posts.id))
		.innerJoin(users, eq(posts.userId, users.id))
		.where(and(eq(purchases.userId, userId), eq(purchases.status, 'confirmed')))
		.orderBy(desc(purchases.createdAt))
		.limit(limit)

	return userPurchases.map(
		(p): ActivityEntry => ({
			id: p.purchaseId,
			signature: p.txSignature ?? undefined,
			token: (p.currency as 'SOL' | 'USDC') ?? 'SOL',
			amount: p.amountPaid
			? Number(p.amountPaid) / (p.currency === 'USDC' ? 1e6 : 1e9)
			: null,
			direction: 'out' as TxDirection,
			timestamp: p.createdAt.getTime(),
			type: 'edition_purchase',
			context: {
				type: 'edition_purchase',
				post: {
					id: p.postId,
					caption: p.postCaption,
					coverUrl: p.postCoverUrl,
					mediaUrl: p.postMediaUrl,
				},
				counterparty: {
					id: p.sellerId,
					displayName: p.sellerDisplayName,
					usernameSlug: p.sellerUsernameSlug,
					avatarUrl: p.sellerAvatarUrl,
				},
			},
		})
	)
}

/**
 * Fetches user's recent tips (sent and received) from the database.
 * Tips have on-chain signatures that appear as generic SOL/SPL transfers
 * in Helius history — this provides the richer "tip" context so
 * mergeActivityEntries can replace the generic transfer entry.
 */
export async function fetchUserTips(
	userId: string,
	limit = 20
): Promise<ActivityEntry[]> {
	// Fetch tips the user sent
	const sentTips = await db
		.select({
			tipId: tips.id,
			txSignature: tips.txSignature,
			amount: tips.amount,
			tokenMint: tips.tokenMint,
			createdAt: tips.createdAt,
			recipientId: users.id,
			recipientDisplayName: users.displayName,
			recipientUsernameSlug: users.usernameSlug,
			recipientAvatarUrl: users.avatarUrl,
		})
		.from(tips)
		.innerJoin(users, eq(tips.toUserId, users.id))
		.where(and(eq(tips.fromUserId, userId), eq(tips.status, 'confirmed')))
		.orderBy(desc(tips.createdAt))
		.limit(limit)

	// Fetch tips the user received
	const receivedTips = await db
		.select({
			tipId: tips.id,
			txSignature: tips.txSignature,
			amount: tips.amount,
			tokenMint: tips.tokenMint,
			createdAt: tips.createdAt,
			senderId: users.id,
			senderDisplayName: users.displayName,
			senderUsernameSlug: users.usernameSlug,
			senderAvatarUrl: users.avatarUrl,
		})
		.from(tips)
		.innerJoin(users, eq(tips.fromUserId, users.id))
		.where(and(eq(tips.toUserId, userId), eq(tips.status, 'confirmed')))
		.orderBy(desc(tips.createdAt))
		.limit(limit)

	const entries: ActivityEntry[] = []

	// Tips sent — direction "out", token is SKR (amount stored in smallest unit, 6 decimals)
	for (const t of sentTips) {
		entries.push({
			id: t.tipId,
			signature: t.txSignature ?? undefined,
			token: 'SKR',
			amount: Number(t.amount) / 1e6, // SKR has 6 decimals
			direction: 'out',
			timestamp: t.createdAt.getTime(),
			type: 'tip_sent',
			context: {
				type: 'tip_sent',
				counterparty: {
					id: t.recipientId,
					displayName: t.recipientDisplayName,
					usernameSlug: t.recipientUsernameSlug,
					avatarUrl: t.recipientAvatarUrl,
				},
			},
		})
	}

	// Tips received — direction "in"
	for (const t of receivedTips) {
		entries.push({
			id: t.tipId,
			signature: t.txSignature ?? undefined,
			token: 'SKR',
			amount: Number(t.amount) / 1e6,
			direction: 'in',
			timestamp: t.createdAt.getTime(),
			type: 'tip_received',
			context: {
				type: 'tip_received',
				counterparty: {
					id: t.senderId,
					displayName: t.senderDisplayName,
					usernameSlug: t.senderUsernameSlug,
					avatarUrl: t.senderAvatarUrl,
				},
			},
		})
	}

	return entries
}

/**
 * Merges and sorts activity entries from different sources.
 * Deduplicates by signature where applicable.
 */
export function mergeActivityEntries(
	...sources: ActivityEntry[][]
): ActivityEntry[] {
	const all = sources.flat()

	// Deduplicate by id AND by signature (a purchase from the DB and
	// the same purchase enriched from Helius share a txSignature but
	// have different ids). Prefer the entry with richer context (the
	// one whose type is NOT a generic transfer).
	const byId = new Map<string, ActivityEntry>()
	const bySig = new Map<string, ActivityEntry>()

	for (const entry of all) {
		// Check if we already saw this signature
		if (entry.signature && bySig.has(entry.signature)) {
			const existing = bySig.get(entry.signature)!
			// Keep the one with richer context (non-generic type wins)
			const existingIsGeneric = existing.type === 'transfer_in' || existing.type === 'transfer_out'
			const entryIsGeneric = entry.type === 'transfer_in' || entry.type === 'transfer_out'
			if (existingIsGeneric && !entryIsGeneric) {
				// Replace the generic one with the richer one
				byId.delete(existing.id)
				byId.set(entry.id, entry)
				bySig.set(entry.signature, entry)
			}
			// Otherwise keep existing (it already has context)
			continue
		}

		if (byId.has(entry.id)) continue

		byId.set(entry.id, entry)
		if (entry.signature) {
			bySig.set(entry.signature, entry)
		}
	}

	const unique = Array.from(byId.values())

	// Sort by timestamp descending (newest first)
	unique.sort((a, b) => b.timestamp - a.timestamp)

	return unique
}
