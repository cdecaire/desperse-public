/**
 * Messaging server functions
 * Handles DM threads and messages
 */

import { createServerFn } from '@tanstack/react-start'
import { db } from '@/server/db'
import { dmThreads, dmMessages, users } from '@/server/db/schema'
import type { DmThread } from '@/server/db/schema'
import { eq, and, or, desc, lt, count, sql, gt } from 'drizzle-orm'
import { z } from 'zod'
import { withAuth } from '@/server/auth'
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

const getThreadsSchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(50).optional(),
})

/**
 * List user's threads (paginated by last_message_at)
 */
export const getThreads = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    const result = await withAuth(getThreadsSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }

    const { auth, input: data } = result
    const userId = auth.userId
    const limit = data.limit ?? 20
    const cursor = data.cursor ? new Date(data.cursor) : null

    // Build query conditions
    const userCondition = or(
      eq(dmThreads.userAId, userId),
      eq(dmThreads.userBId, userId)
    )

    // Get threads where user is participant and not archived
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
          // Exclude archived threads for current user
          sql`CASE
            WHEN ${dmThreads.userAId} = ${userId} THEN ${dmThreads.userAArchived} = false
            ELSE ${dmThreads.userBArchived} = false
          END`,
          // Cursor pagination
          cursor ? lt(dmThreads.lastMessageAt, cursor) : undefined
        )
      )
      .orderBy(desc(dmThreads.lastMessageAt))
      .limit(limit + 1)

    const hasMore = threads.length > limit
    const items = hasMore ? threads.slice(0, limit) : threads

    // Transform to include unread status
    const transformedThreads = items.map(({ thread, otherUser }) => {
      const position = getUserPosition(thread, userId)
      const myLastReadAt = position === 'A' ? thread.userALastReadAt : thread.userBLastReadAt
      const isBlocked = position === 'A' ? thread.userABlocked : thread.userBBlocked
      const isBlockedBy = position === 'A' ? thread.userBBlocked : thread.userABlocked

      return {
        id: thread.id,
        otherUser,
        lastMessageAt: thread.lastMessageAt,
        lastMessagePreview: thread.lastMessagePreview,
        hasUnread: thread.lastMessageAt && myLastReadAt
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
      nextCursor: hasMore && items.length > 0
        ? items[items.length - 1].thread.lastMessageAt?.toISOString()
        : null,
    }
  } catch (error) {
    console.error('Error in getThreads:', error instanceof Error ? error.message : 'Unknown error')
    return { success: false, error: 'Failed to get threads' }
  }
})

const getOrCreateThreadSchema = z.object({
  otherUserId: z.string().uuid(),
  contextCreatorId: z.string().uuid(),
})

/**
 * Get or create a thread with another user
 * - Sorts UUIDs to determine user_a/user_b
 * - If thread exists, returns it (no eligibility re-check)
 * - If new, checks eligibility against contextCreatorId, then creates
 */
export const getOrCreateThread = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    const result = await withAuth(getOrCreateThreadSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }

    const { auth, input: data } = result
    const userId = auth.userId
    const { otherUserId, contextCreatorId } = data

    // Cannot message yourself
    if (userId === otherUserId) {
      return { success: false, error: 'Cannot message yourself' }
    }

    // Sort user IDs for unified model
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
      // Get other user info
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

    // Thread doesn't exist - check eligibility
    const eligibilityResult = await checkDmEligibility(contextCreatorId, userId)

    if (!eligibilityResult.success || !eligibilityResult.data?.allowed) {
      return {
        success: false,
        error: 'Not eligible to message this user',
        eligibility: eligibilityResult.data,
      }
    }

    // Check rate limit (max 5 new threads per day)
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

    // Get other user info
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
    console.error('Error in getOrCreateThread:', error instanceof Error ? error.message : 'Unknown error')
    return { success: false, error: 'Failed to get or create thread' }
  }
})

const archiveThreadSchema = z.object({
  threadId: z.string().uuid(),
  archived: z.boolean(),
})

/**
 * Archive or unarchive a thread for current user
 */
export const archiveThread = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    const result = await withAuth(archiveThreadSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }

    const { auth, input: data } = result
    const userId = auth.userId
    const { threadId, archived } = data

    // Get thread and verify user is participant
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
    const updateField = position === 'A' ? { userAArchived: archived } : { userBArchived: archived }

    await db
      .update(dmThreads)
      .set({ ...updateField, updatedAt: new Date() })
      .where(eq(dmThreads.id, threadId))

    return { success: true, archived }
  } catch (error) {
    console.error('Error in archiveThread:', error instanceof Error ? error.message : 'Unknown error')
    return { success: false, error: 'Failed to archive thread' }
  }
})

const blockInThreadSchema = z.object({
  threadId: z.string().uuid(),
  blocked: z.boolean(),
})

/**
 * Block or unblock the other user in a thread
 */
export const blockInThread = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    const result = await withAuth(blockInThreadSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }

    const { auth, input: data } = result
    const userId = auth.userId
    const { threadId, blocked } = data

    // Get thread and verify user is participant
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
    const updateField = position === 'A' ? { userABlocked: blocked } : { userBBlocked: blocked }

    await db
      .update(dmThreads)
      .set({ ...updateField, updatedAt: new Date() })
      .where(eq(dmThreads.id, threadId))

    return { success: true, blocked }
  } catch (error) {
    console.error('Error in blockInThread:', error instanceof Error ? error.message : 'Unknown error')
    return { success: false, error: 'Failed to block user' }
  }
})

// =============================================================================
// Message Operations
// =============================================================================

const sendMessageSchema = z.object({
  threadId: z.string().uuid(),
  content: z.string().min(1).max(MAX_MESSAGE_LENGTH),
})

/**
 * Send a message in a thread
 * NO eligibility re-check - thread existence is the grant
 * Only checks: thread exists, user is participant, not blocked
 */
export const sendMessage = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    const result = await withAuth(sendMessageSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }

    const { auth, input: data } = result
    const userId = auth.userId
    const { threadId, content } = data

    // Trim and validate content
    const trimmedContent = content.trim()
    if (!trimmedContent) {
      return { success: false, error: 'Message cannot be empty' }
    }

    // Get thread and verify user is participant
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
    const isBlockedByOther = position === 'A' ? thread.userBBlocked : thread.userABlocked

    if (isBlockedByOther) {
      return { success: false, error: 'You have been blocked by this user' }
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

    // Update thread denormalized fields and sender's last read timestamp
    // (so sender doesn't see their own message as "unread")
    const senderLastReadField = position === 'A'
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

    // Publish real-time notification to recipient (fire-and-forget)
    const recipientId = position === 'A' ? thread.userBId : thread.userAId
    publishNewMessage(recipientId, threadId, message.id, userId, message.createdAt)

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
    console.error('Error in sendMessage:', error instanceof Error ? error.message : 'Unknown error')
    return { success: false, error: 'Failed to send message' }
  }
})

const getMessagesSchema = z.object({
  threadId: z.string().uuid(),
  cursor: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).optional(),
})

/**
 * Get messages in a thread (paginated, cursor-based)
 */
export const getMessages = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    const result = await withAuth(getMessagesSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }

    const { auth, input: data } = result
    const userId = auth.userId
    const { threadId, limit: inputLimit, cursor } = data
    const limit = inputLimit ?? 50

    // Verify user is participant in thread
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

    // Get messages (newest first, cursor for older messages)
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
          cursorDate ? lt(dmMessages.createdAt, cursorDate) : undefined
        )
      )
      .orderBy(desc(dmMessages.createdAt))
      .limit(limit + 1)

    const hasMore = messages.length > limit
    const items = hasMore ? messages.slice(0, limit) : messages

    // Get other user's last read timestamp for read receipt display
    const position = getUserPosition(thread, userId)
    const otherLastReadAt = position === 'A' ? thread.userBLastReadAt : thread.userALastReadAt

    return {
      success: true,
      messages: items,
      otherLastReadAt,
      nextCursor: hasMore && items.length > 0
        ? items[items.length - 1].createdAt.toISOString()
        : null,
    }
  } catch (error) {
    console.error('Error in getMessages:', error instanceof Error ? error.message : 'Unknown error')
    return { success: false, error: 'Failed to get messages' }
  }
})

const markThreadReadSchema = z.object({
  threadId: z.string().uuid(),
})

/**
 * Mark a thread as read (updates user_a_last_read_at or user_b_last_read_at)
 */
export const markThreadRead = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    const result = await withAuth(markThreadReadSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }

    const { auth, input: data } = result
    const userId = auth.userId
    const { threadId } = data

    // Get thread and verify user is participant
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
    const myLastReadAt = position === 'A' ? thread.userALastReadAt : thread.userBLastReadAt

    // Check if there's actually something unread
    // Only publish read receipt if lastMessageAt > myLastReadAt (i.e., there were unread messages)
    const hadUnread = thread.lastMessageAt && (!myLastReadAt || thread.lastMessageAt > myLastReadAt)

    const now = new Date()
    const updateField = position === 'A'
      ? { userALastReadAt: now }
      : { userBLastReadAt: now }

    await db
      .update(dmThreads)
      .set({ ...updateField, updatedAt: now })
      .where(eq(dmThreads.id, threadId))

    // Only publish read receipt if there was actually something unread
    // This prevents the infinite loop of read receipts
    if (hadUnread) {
      const otherUserId = position === 'A' ? thread.userBId : thread.userAId
      publishReadReceipt(otherUserId, threadId, userId, now)
    }

    return { success: true, readAt: now.toISOString() }
  } catch (error) {
    console.error('Error in markThreadRead:', error instanceof Error ? error.message : 'Unknown error')
    return { success: false, error: 'Failed to mark thread as read' }
  }
})

const deleteMessageSchema = z.object({
  messageId: z.string().uuid(),
})

/**
 * Delete own message (soft delete)
 */
export const deleteMessage = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    const result = await withAuth(deleteMessageSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }

    const { auth, input: data } = result
    const userId = auth.userId
    const { messageId } = data

    // Get message and verify ownership
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
      return { success: true, message: 'Message already deleted' }
    }

    // Soft delete
    await db
      .update(dmMessages)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        content: '', // Clear content on delete
      })
      .where(eq(dmMessages.id, messageId))

    return { success: true }
  } catch (error) {
    console.error('Error in deleteMessage:', error instanceof Error ? error.message : 'Unknown error')
    return { success: false, error: 'Failed to delete message' }
  }
})
