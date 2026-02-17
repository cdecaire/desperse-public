/**
 * Messaging Direct utility functions for REST API endpoints.
 * Extracted from server functions to avoid createServerFn return issues.
 */

import { db } from '@/server/db'
import { dmThreads, dmMessages, users } from '@/server/db/schema'
import type { DmThread } from '@/server/db/schema'
import { eq, and, or, desc, lt, count, sql, gt } from 'drizzle-orm'
import { authenticateWithToken } from '@/server/auth'
import { checkDmEligibility } from '@/server/utils/dm-eligibility-internal'
import { publishNewMessage, publishReadReceipt } from '@/server/utils/ably-publish'
import { sendPushNotification, getActorDisplayName } from '@/server/utils/pushDispatch'

// Constants
const MAX_THREADS_PER_DAY = 5
const MAX_MESSAGE_LENGTH = 2000
const PREVIEW_LENGTH = 100

// Helper to sort user IDs for unified thread model
function sortUserIds(id1: string, id2: string): [string, string] {
	return id1 < id2 ? [id1, id2] : [id2, id1]
}

// Helper to determine which user position (A or B) for current user
function getUserPosition(thread: DmThread, userId: string): 'A' | 'B' {
	return thread.userAId === userId ? 'A' : 'B'
}

// Helper to truncate message for preview
function truncatePreview(content: string): string {
	const trimmed = content.trim()
	if (trimmed.length <= PREVIEW_LENGTH) return trimmed
	return trimmed.slice(0, PREVIEW_LENGTH - 3) + '...'
}

// =============================================================================
// Thread Operations
// =============================================================================

export interface GetThreadsResult {
	success: boolean
	threads?: Array<{
		id: string
		otherUser: {
			id: string
			usernameSlug: string
			displayName: string | null
			avatarUrl: string | null
		}
		lastMessageAt: Date | null
		lastMessagePreview: string | null
		hasUnread: boolean
		isBlocked: boolean
		isBlockedBy: boolean
		createdAt: Date
	}>
	hasMore?: boolean
	nextCursor?: string | null
	error?: string
}

/**
 * List user's threads (paginated by last_message_at)
 */
export async function getThreadsDirect(
	token: string,
	cursor?: string,
	limit: number = 20
): Promise<GetThreadsResult> {
	let userId: string
	try {
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			return { success: false, error: 'Authentication required' }
		}
		userId = auth.userId
	} catch (authError) {
		const message =
			authError instanceof Error ? authError.message : 'Authentication failed'
		return { success: false, error: message }
	}

	try {
		const cursorDate = cursor ? new Date(cursor) : null

		const userCondition = or(
			eq(dmThreads.userAId, userId),
			eq(dmThreads.userBId, userId)
		)

		const threads = await db
			.select({
				thread: dmThreads,
				otherUser: {
					id: users.id,
					usernameSlug: users.usernameSlug,
					displayName: users.displayName,
					avatarUrl: users.avatarUrl,
				},
			})
			.from(dmThreads)
			.innerJoin(
				users,
				sql`${users.id} = CASE
					WHEN ${dmThreads.userAId} = ${userId} THEN ${dmThreads.userBId}
					ELSE ${dmThreads.userAId}
				END`
			)
			.where(
				and(
					userCondition,
					sql`CASE
						WHEN ${dmThreads.userAId} = ${userId} THEN ${dmThreads.userAArchived} = false
						ELSE ${dmThreads.userBArchived} = false
					END`,
					cursorDate
						? lt(dmThreads.lastMessageAt, cursorDate)
						: undefined
				)
			)
			.orderBy(desc(dmThreads.lastMessageAt))
			.limit(limit + 1)

		const hasMore = threads.length > limit
		const items = hasMore ? threads.slice(0, limit) : threads

		const transformedThreads = items.map(({ thread, otherUser }) => {
			const position = getUserPosition(thread, userId)
			const myLastReadAt =
				position === 'A'
					? thread.userALastReadAt
					: thread.userBLastReadAt
			const isBlocked =
				position === 'A' ? thread.userABlocked : thread.userBBlocked
			const isBlockedBy =
				position === 'A' ? thread.userBBlocked : thread.userABlocked

			return {
				id: thread.id,
				otherUser,
				lastMessageAt: thread.lastMessageAt,
				lastMessagePreview: thread.lastMessagePreview,
				hasUnread:
					thread.lastMessageAt && myLastReadAt
						? thread.lastMessageAt > myLastReadAt
						: !!thread.lastMessageAt && !myLastReadAt,
				isBlocked,
				isBlockedBy,
				createdAt: thread.createdAt,
			}
		})

		return {
			success: true,
			threads: transformedThreads,
			hasMore,
			nextCursor:
				hasMore && items.length > 0
					? items[items.length - 1].thread.lastMessageAt?.toISOString() ??
						null
					: null,
		}
	} catch (error) {
		console.error(
			'Error in getThreadsDirect:',
			error instanceof Error ? error.message : 'Unknown error'
		)
		return { success: false, error: 'Failed to get threads' }
	}
}

// =============================================================================

export interface GetOrCreateThreadResult {
	success: boolean
	thread?: any
	otherUser?: {
		id: string
		usernameSlug: string
		displayName: string | null
		avatarUrl: string | null
	}
	created?: boolean
	eligibility?: any
	error?: string
}

/**
 * Get or create a thread with another user
 */
export async function getOrCreateThreadDirect(
	token: string,
	otherUserId: string,
	contextCreatorId: string
): Promise<GetOrCreateThreadResult> {
	let userId: string
	try {
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			return { success: false, error: 'Authentication required' }
		}
		userId = auth.userId
	} catch (authError) {
		const message =
			authError instanceof Error ? authError.message : 'Authentication failed'
		return { success: false, error: message }
	}

	try {
		if (userId === otherUserId) {
			return { success: false, error: 'Cannot message yourself' }
		}

		const [userAId, userBId] = sortUserIds(userId, otherUserId)

		// Check if thread already exists
		const [existingThread] = await db
			.select()
			.from(dmThreads)
			.where(
				and(
					eq(dmThreads.userAId, userAId),
					eq(dmThreads.userBId, userBId)
				)
			)
			.limit(1)

		if (existingThread) {
			const [otherUser] = await db
				.select({
					id: users.id,
					usernameSlug: users.usernameSlug,
					displayName: users.displayName,
					avatarUrl: users.avatarUrl,
				})
				.from(users)
				.where(eq(users.id, otherUserId))
				.limit(1)

			return {
				success: true,
				thread: existingThread,
				otherUser,
				created: false,
			}
		}

		// Check eligibility
		const eligibilityResult = await checkDmEligibility(
			contextCreatorId,
			userId
		)

		if (!eligibilityResult.success || !eligibilityResult.data?.allowed) {
			return {
				success: false,
				error: 'Not eligible to message this user',
				eligibility: eligibilityResult.data,
			}
		}

		// Rate limit check
		const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
		const [rateCheck] = await db
			.select({ count: count() })
			.from(dmThreads)
			.where(
				and(
					eq(dmThreads.createdByUserId, userId),
					gt(dmThreads.createdAt, oneDayAgo)
				)
			)

		if (rateCheck && rateCheck.count >= MAX_THREADS_PER_DAY) {
			return {
				success: false,
				error: `You can only start ${MAX_THREADS_PER_DAY} new conversations per day`,
			}
		}

		// Create new thread
		const [newThread] = await db
			.insert(dmThreads)
			.values({
				userAId,
				userBId,
				contextCreatorId,
				createdByUserId: userId,
			})
			.returning()

		const [otherUser] = await db
			.select({
				id: users.id,
				usernameSlug: users.usernameSlug,
				displayName: users.displayName,
				avatarUrl: users.avatarUrl,
			})
			.from(users)
			.where(eq(users.id, otherUserId))
			.limit(1)

		return {
			success: true,
			thread: newThread,
			otherUser,
			created: true,
		}
	} catch (error) {
		console.error(
			'Error in getOrCreateThreadDirect:',
			error instanceof Error ? error.message : 'Unknown error'
		)
		return { success: false, error: 'Failed to get or create thread' }
	}
}

// =============================================================================

export interface SendMessageResult {
	success: boolean
	message?: {
		id: string
		threadId: string
		senderId: string
		content: string
		createdAt: Date
		isDeleted: boolean
	}
	error?: string
}

/**
 * Send a message in a thread
 */
export async function sendMessageDirect(
	token: string,
	threadId: string,
	content: string
): Promise<SendMessageResult> {
	let userId: string
	try {
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			return { success: false, error: 'Authentication required' }
		}
		userId = auth.userId
	} catch (authError) {
		const message =
			authError instanceof Error ? authError.message : 'Authentication failed'
		return { success: false, error: message }
	}

	try {
		const trimmedContent = content.trim()
		if (!trimmedContent) {
			return { success: false, error: 'Message cannot be empty' }
		}
		if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
			return {
				success: false,
				error: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`,
			}
		}

		// Get thread and verify participant
		const [thread] = await db
			.select()
			.from(dmThreads)
			.where(eq(dmThreads.id, threadId))
			.limit(1)

		if (!thread) {
			return { success: false, error: 'Thread not found' }
		}

		if (thread.userAId !== userId && thread.userBId !== userId) {
			return { success: false, error: 'Not a participant in this thread' }
		}

		// Check if blocked
		const position = getUserPosition(thread, userId)
		const isBlockedByOther =
			position === 'A' ? thread.userBBlocked : thread.userABlocked

		if (isBlockedByOther) {
			return {
				success: false,
				error: 'You have been blocked by this user',
			}
		}

		// Create message
		const [message] = await db
			.insert(dmMessages)
			.values({
				threadId,
				senderId: userId,
				content: trimmedContent,
			})
			.returning()

		// Update thread denormalized fields + sender's last read
		const senderLastReadField =
			position === 'A'
				? { userALastReadAt: message.createdAt }
				: { userBLastReadAt: message.createdAt }

		await db
			.update(dmThreads)
			.set({
				lastMessageAt: message.createdAt,
				lastMessagePreview: truncatePreview(trimmedContent),
				...senderLastReadField,
				updatedAt: new Date(),
			})
			.where(eq(dmThreads.id, threadId))

		// Publish real-time notification (fire-and-forget)
		const recipientId =
			position === 'A' ? thread.userBId : thread.userAId
		publishNewMessage(
			recipientId,
			threadId,
			message.id,
			userId,
			message.createdAt
		)

		// Dispatch push notification (awaited for serverless compatibility)
		try {
			const actorName = await getActorDisplayName(userId)
			await sendPushNotification(recipientId, {
				type: 'message',
				title: `${actorName} sent you a message`,
				body: truncatePreview(trimmedContent),
				deepLink: `https://desperse.com/messages/${threadId}`,
			})
		} catch (pushErr) {
			console.warn('[messaging] Push notification error:', pushErr instanceof Error ? pushErr.message : 'Unknown error')
		}

		return {
			success: true,
			message: {
				id: message.id,
				threadId: message.threadId,
				senderId: message.senderId,
				content: message.content,
				createdAt: message.createdAt,
				isDeleted: message.isDeleted,
			},
		}
	} catch (error) {
		console.error(
			'Error in sendMessageDirect:',
			error instanceof Error ? error.message : 'Unknown error'
		)
		return { success: false, error: 'Failed to send message' }
	}
}

// =============================================================================

export interface GetMessagesResult {
	success: boolean
	messages?: Array<{
		id: string
		threadId: string
		senderId: string
		content: string
		isDeleted: boolean
		createdAt: Date
	}>
	otherLastReadAt?: Date | null
	nextCursor?: string | null
	error?: string
}

/**
 * Get messages in a thread (paginated, newest first)
 */
export async function getMessagesDirect(
	token: string,
	threadId: string,
	cursor?: string,
	limit: number = 50
): Promise<GetMessagesResult> {
	let userId: string
	try {
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			return { success: false, error: 'Authentication required' }
		}
		userId = auth.userId
	} catch (authError) {
		const message =
			authError instanceof Error ? authError.message : 'Authentication failed'
		return { success: false, error: message }
	}

	try {
		// Verify participant
		const [thread] = await db
			.select()
			.from(dmThreads)
			.where(eq(dmThreads.id, threadId))
			.limit(1)

		if (!thread) {
			return { success: false, error: 'Thread not found' }
		}

		if (thread.userAId !== userId && thread.userBId !== userId) {
			return { success: false, error: 'Not a participant in this thread' }
		}

		const cursorDate = cursor ? new Date(cursor) : null

		const messages = await db
			.select({
				id: dmMessages.id,
				threadId: dmMessages.threadId,
				senderId: dmMessages.senderId,
				content: dmMessages.content,
				isDeleted: dmMessages.isDeleted,
				createdAt: dmMessages.createdAt,
			})
			.from(dmMessages)
			.where(
				and(
					eq(dmMessages.threadId, threadId),
					cursorDate
						? lt(dmMessages.createdAt, cursorDate)
						: undefined
				)
			)
			.orderBy(desc(dmMessages.createdAt))
			.limit(limit + 1)

		const hasMore = messages.length > limit
		const items = hasMore ? messages.slice(0, limit) : messages

		const position = getUserPosition(thread, userId)
		const otherLastReadAt =
			position === 'A'
				? thread.userBLastReadAt
				: thread.userALastReadAt

		return {
			success: true,
			messages: items,
			otherLastReadAt,
			nextCursor:
				hasMore && items.length > 0
					? items[items.length - 1].createdAt.toISOString()
					: null,
		}
	} catch (error) {
		console.error(
			'Error in getMessagesDirect:',
			error instanceof Error ? error.message : 'Unknown error'
		)
		return { success: false, error: 'Failed to get messages' }
	}
}

// =============================================================================

export interface MarkReadResult {
	success: boolean
	readAt?: string
	error?: string
}

/**
 * Mark a thread as read
 */
export async function markThreadReadDirect(
	token: string,
	threadId: string
): Promise<MarkReadResult> {
	let userId: string
	try {
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			return { success: false, error: 'Authentication required' }
		}
		userId = auth.userId
	} catch (authError) {
		const message =
			authError instanceof Error ? authError.message : 'Authentication failed'
		return { success: false, error: message }
	}

	try {
		const [thread] = await db
			.select()
			.from(dmThreads)
			.where(eq(dmThreads.id, threadId))
			.limit(1)

		if (!thread) {
			return { success: false, error: 'Thread not found' }
		}

		if (thread.userAId !== userId && thread.userBId !== userId) {
			return { success: false, error: 'Not a participant in this thread' }
		}

		const position = getUserPosition(thread, userId)
		const myLastReadAt =
			position === 'A'
				? thread.userALastReadAt
				: thread.userBLastReadAt

		const hadUnread =
			thread.lastMessageAt &&
			(!myLastReadAt || thread.lastMessageAt > myLastReadAt)

		const now = new Date()
		const updateField =
			position === 'A'
				? { userALastReadAt: now }
				: { userBLastReadAt: now }

		await db
			.update(dmThreads)
			.set({ ...updateField, updatedAt: now })
			.where(eq(dmThreads.id, threadId))

		// Only publish read receipt if there was actually something unread
		if (hadUnread) {
			const otherUserId =
				position === 'A' ? thread.userBId : thread.userAId
			publishReadReceipt(otherUserId, threadId, userId, now)
		}

		return { success: true, readAt: now.toISOString() }
	} catch (error) {
		console.error(
			'Error in markThreadReadDirect:',
			error instanceof Error ? error.message : 'Unknown error'
		)
		return { success: false, error: 'Failed to mark thread as read' }
	}
}

// =============================================================================

export interface DeleteMessageResult {
	success: boolean
	error?: string
}

/**
 * Delete own message (soft delete)
 */
export async function deleteMessageDirect(
	token: string,
	messageId: string
): Promise<DeleteMessageResult> {
	let userId: string
	try {
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			return { success: false, error: 'Authentication required' }
		}
		userId = auth.userId
	} catch (authError) {
		const message =
			authError instanceof Error ? authError.message : 'Authentication failed'
		return { success: false, error: message }
	}

	try {
		const [message] = await db
			.select()
			.from(dmMessages)
			.where(eq(dmMessages.id, messageId))
			.limit(1)

		if (!message) {
			return { success: false, error: 'Message not found' }
		}

		if (message.senderId !== userId) {
			return { success: false, error: 'Can only delete your own messages' }
		}

		if (message.isDeleted) {
			return { success: true }
		}

		await db
			.update(dmMessages)
			.set({
				isDeleted: true,
				deletedAt: new Date(),
				content: '',
			})
			.where(eq(dmMessages.id, messageId))

		return { success: true }
	} catch (error) {
		console.error(
			'Error in deleteMessageDirect:',
			error instanceof Error ? error.message : 'Unknown error'
		)
		return { success: false, error: 'Failed to delete message' }
	}
}

// =============================================================================

export interface BlockResult {
	success: boolean
	blocked?: boolean
	error?: string
}

/**
 * Block or unblock the other user in a thread
 */
export async function blockInThreadDirect(
	token: string,
	threadId: string,
	blocked: boolean
): Promise<BlockResult> {
	let userId: string
	try {
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			return { success: false, error: 'Authentication required' }
		}
		userId = auth.userId
	} catch (authError) {
		const message =
			authError instanceof Error ? authError.message : 'Authentication failed'
		return { success: false, error: message }
	}

	try {
		const [thread] = await db
			.select()
			.from(dmThreads)
			.where(eq(dmThreads.id, threadId))
			.limit(1)

		if (!thread) {
			return { success: false, error: 'Thread not found' }
		}

		if (thread.userAId !== userId && thread.userBId !== userId) {
			return { success: false, error: 'Not a participant in this thread' }
		}

		const position = getUserPosition(thread, userId)
		const updateField =
			position === 'A'
				? { userABlocked: blocked }
				: { userBBlocked: blocked }

		await db
			.update(dmThreads)
			.set({ ...updateField, updatedAt: new Date() })
			.where(eq(dmThreads.id, threadId))

		return { success: true, blocked }
	} catch (error) {
		console.error(
			'Error in blockInThreadDirect:',
			error instanceof Error ? error.message : 'Unknown error'
		)
		return { success: false, error: 'Failed to block user' }
	}
}

// =============================================================================

export interface ArchiveResult {
	success: boolean
	archived?: boolean
	error?: string
}

/**
 * Archive or unarchive a thread for current user
 */
export async function archiveThreadDirect(
	token: string,
	threadId: string,
	archived: boolean
): Promise<ArchiveResult> {
	let userId: string
	try {
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			return { success: false, error: 'Authentication required' }
		}
		userId = auth.userId
	} catch (authError) {
		const message =
			authError instanceof Error ? authError.message : 'Authentication failed'
		return { success: false, error: message }
	}

	try {
		const [thread] = await db
			.select()
			.from(dmThreads)
			.where(eq(dmThreads.id, threadId))
			.limit(1)

		if (!thread) {
			return { success: false, error: 'Thread not found' }
		}

		if (thread.userAId !== userId && thread.userBId !== userId) {
			return { success: false, error: 'Not a participant in this thread' }
		}

		const position = getUserPosition(thread, userId)
		const updateField =
			position === 'A'
				? { userAArchived: archived }
				: { userBArchived: archived }

		await db
			.update(dmThreads)
			.set({ ...updateField, updatedAt: new Date() })
			.where(eq(dmThreads.id, threadId))

		return { success: true, archived }
	} catch (error) {
		console.error(
			'Error in archiveThreadDirect:',
			error instanceof Error ? error.message : 'Unknown error'
		)
		return { success: false, error: 'Failed to archive thread' }
	}
}
