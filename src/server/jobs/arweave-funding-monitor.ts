/**
 * Arweave Funding Monitor
 *
 * Scheduled job that checks Arweave-enabled editions and updates their
 * funding status. When a creator's shared Turbo credits become insufficient,
 * the edition's arweaveStatus transitions to 'unfunded' and minting is paused.
 * When credits are restored, the status transitions back to 'funded'.
 *
 * Called via Nitro API route: GET /api/v1/arweave-monitor
 */

import { db } from "@/server/db";
import { posts, dmThreads, dmMessages } from "@/server/db/schema";
import { eq, and, sql, desc, gt } from "drizzle-orm";
import { env } from "@/config/env";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MonitorResult {
	checked: number;
	unfunded: number;
	refunded: number;
}

interface PostRow {
	id: string;
	nftName: string | null;
	creatorWallet: string | null;
	arweaveStatus: string | null;
	userId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sort two user IDs for the unified DM thread model (user_a_id < user_b_id).
 */
function sortUserIds(id1: string, id2: string): [string, string] {
	return id1 < id2 ? [id1, id2] : [id2, id1];
}

/**
 * Find or create a DM thread between two users.
 * Returns the thread ID.
 */
async function getOrCreateSystemThread(
	systemUserId: string,
	creatorUserId: string,
): Promise<string> {
	const [userAId, userBId] = sortUserIds(systemUserId, creatorUserId);

	// Check for existing thread
	const [existing] = await db
		.select({ id: dmThreads.id })
		.from(dmThreads)
		.where(
			and(eq(dmThreads.userAId, userAId), eq(dmThreads.userBId, userBId)),
		)
		.limit(1);

	if (existing) {
		return existing.id;
	}

	// Create new thread
	const [newThread] = await db
		.insert(dmThreads)
		.values({
			userAId,
			userBId,
			createdByUserId: systemUserId,
		})
		.returning({ id: dmThreads.id });

	console.log(
		`[ArweaveFundingMonitor] Created system DM thread ${newThread.id} for creator ${creatorUserId}`,
	);

	return newThread.id;
}

/**
 * Check if a deduplication-matching message already exists in the thread.
 * Returns true if the system user sent a message referencing the same post
 * within the last 24 hours.
 */
async function isDuplicateNotification(
	threadId: string,
	systemUserId: string,
	postId: string,
): Promise<boolean> {
	const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

	const [recent] = await db
		.select({ id: dmMessages.id, content: dmMessages.content })
		.from(dmMessages)
		.where(
			and(
				eq(dmMessages.threadId, threadId),
				eq(dmMessages.senderId, systemUserId),
				gt(dmMessages.createdAt, oneDayAgo),
				eq(dmMessages.isDeleted, false),
			),
		)
		.orderBy(desc(dmMessages.createdAt))
		.limit(1);

	if (!recent) return false;

	// Check if the message references this specific post
	return recent.content.includes(`/post/${postId}`);
}

/**
 * Send a system DM to the creator about their unfunded edition.
 */
async function sendUnfundedNotification(
	systemUserId: string,
	creatorUserId: string,
	postId: string,
	nftName: string,
): Promise<void> {
	try {
		const threadId = await getOrCreateSystemThread(
			systemUserId,
			creatorUserId,
		);

		// Deduplicate: skip if we already notified about this post recently
		const isDuplicate = await isDuplicateNotification(
			threadId,
			systemUserId,
			postId,
		);
		if (isDuplicate) {
			console.log(
				`[ArweaveFundingMonitor] Skipping duplicate notification for post ${postId}`,
			);
			return;
		}

		const content = `Your edition "${nftName}" needs permanent storage funding \u2014 minting is paused until credits are restored. Visit your edition to top up: https://desperse.com/post/${postId}`;

		// Insert the message
		const [message] = await db
			.insert(dmMessages)
			.values({
				threadId,
				senderId: systemUserId,
				content,
			})
			.returning({ id: dmMessages.id, createdAt: dmMessages.createdAt });

		// Update thread denormalized fields
		const [userAId] = sortUserIds(systemUserId, creatorUserId);
		const senderIsA = systemUserId === userAId;
		const senderLastReadField = senderIsA
			? { userALastReadAt: message.createdAt }
			: { userBLastReadAt: message.createdAt };

		const preview =
			content.length > 100 ? `${content.slice(0, 97)}...` : content;

		await db
			.update(dmThreads)
			.set({
				lastMessageAt: message.createdAt,
				lastMessagePreview: preview,
				...senderLastReadField,
				updatedAt: new Date(),
			})
			.where(eq(dmThreads.id, threadId));

		console.log(
			`[ArweaveFundingMonitor] Sent unfunded notification for post ${postId} to creator ${creatorUserId}`,
		);
	} catch (err) {
		console.warn(
			`[ArweaveFundingMonitor] Failed to send DM notification for post ${postId}:`,
			err instanceof Error ? err.message : "Unknown error",
		);
	}
}

// ---------------------------------------------------------------------------
// Main monitor function
// ---------------------------------------------------------------------------

/**
 * Run the Arweave funding monitor.
 *
 * 1. Query all posts where storageType = 'arweave' AND arweaveStatus IN ('funded', 'unfunded')
 * 2. Group by creatorWallet (one Turbo API call per creator)
 * 3. For each creator: check shared balance
 * 4. For each post: update status if needed, send DM on funded -> unfunded transition
 */
export async function runArweaveFundingMonitor(): Promise<MonitorResult> {
	console.log("[ArweaveFundingMonitor] Starting funding check...");

	// Step 1: Query all active Arweave editions that need monitoring
	const monitoredPosts = await db
		.select({
			id: posts.id,
			nftName: posts.nftName,
			creatorWallet: posts.creatorWallet,
			arweaveStatus: posts.arweaveStatus,
			userId: posts.userId,
		})
		.from(posts)
		.where(
			and(
				eq(posts.storageType, "arweave"),
				sql`${posts.arweaveStatus} IN ('funded', 'unfunded')`,
				eq(posts.isDeleted, false),
			),
		);

	if (monitoredPosts.length === 0) {
		console.log(
			"[ArweaveFundingMonitor] No Arweave editions to monitor",
		);
		return { checked: 0, unfunded: 0, refunded: 0 };
	}

	// Step 2: Group posts by creatorWallet
	const postsByCreator = new Map<string, PostRow[]>();
	for (const post of monitoredPosts) {
		if (!post.creatorWallet) continue;
		const existing = postsByCreator.get(post.creatorWallet) || [];
		existing.push(post);
		postsByCreator.set(post.creatorWallet, existing);
	}

	// Step 3: Check balance for each creator
	const { checkCreatorSharedBalance } = await import(
		"@/server/services/arweave/turbo-server"
	);

	let unfundedCount = 0;
	let refundedCount = 0;

	const systemUserId = env.SYSTEM_USER_ID;

	for (const [creatorWallet, creatorPosts] of postsByCreator) {
		let sufficient = false;

		try {
			const balanceCheck =
				await checkCreatorSharedBalance(creatorWallet);
			sufficient = balanceCheck.sufficient;
		} catch (err) {
			console.warn(
				`[ArweaveFundingMonitor] Failed to check balance for creator ${creatorWallet.slice(0, 8)}...:`,
				err instanceof Error ? err.message : "Unknown error",
			);
			// Skip this creator on error — don't change status if we can't verify
			continue;
		}

		// Step 4: Update posts based on credit sufficiency
		for (const post of creatorPosts) {
			if (!sufficient && post.arweaveStatus === "funded") {
				// Transition: funded -> unfunded
				await db
					.update(posts)
					.set({
						arweaveStatus: "unfunded",
						updatedAt: new Date(),
					})
					.where(eq(posts.id, post.id));

				unfundedCount++;

				console.log(
					`[ArweaveFundingMonitor] Post ${post.id} ("${post.nftName}") marked unfunded`,
				);

				// Send DM notification
				if (systemUserId && post.userId) {
					await sendUnfundedNotification(
						systemUserId,
						post.userId,
						post.id,
						post.nftName || "Untitled",
					);
				}
			} else if (sufficient && post.arweaveStatus === "unfunded") {
				// Transition: unfunded -> funded (auto-recovery)
				await db
					.update(posts)
					.set({
						arweaveStatus: "funded",
						updatedAt: new Date(),
					})
					.where(eq(posts.id, post.id));

				refundedCount++;

				console.log(
					`[ArweaveFundingMonitor] Post ${post.id} ("${post.nftName}") re-funded (auto-recovery)`,
				);
			}
		}
	}

	const checked = monitoredPosts.length;
	const creators = postsByCreator.size;

	console.log(
		`[ArweaveFundingMonitor] Checked ${checked} editions for ${creators} creators. Unfunded: ${unfundedCount}, Re-funded: ${refundedCount}`,
	);

	return {
		checked,
		unfunded: unfundedCount,
		refunded: refundedCount,
	};
}
