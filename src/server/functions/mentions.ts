/**
 * Mentions server-side utilities
 * Handles @mention parsing and mention processing
 *
 * NOTE: Client-facing server function (searchMentionUsers) is in mention-search.ts
 * to avoid bundling db dependencies in the client.
 */

import { db } from '@/server/db'
import { mentions, users, notifications, comments } from '@/server/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { parseMentions } from '@/lib/tokenParsing'
import { sendPushNotification, getActorDisplayName } from '@/server/utils/pushDispatch'

// Re-export parseMentions for backward compatibility
export { parseMentions }

/**
 * Process mentions for content creation/update
 * - Parses mentions from text
 * - Looks up users by usernameSlug (batch query)
 * - For updates: computes diff (removes old, adds new)
 * - Creates notifications only for newly added mentions
 *
 * @param text - The text content to parse for mentions
 * @param mentionerUserId - The user creating the content
 * @param referenceType - 'post' or 'comment'
 * @param referenceId - The post or comment ID
 * @param isUpdate - Whether this is an update (for diff logic)
 */
export async function processMentions(
  text: string,
  mentionerUserId: string,
  referenceType: 'post' | 'comment',
  referenceId: string,
  isUpdate: boolean = false
): Promise<{ mentionedUserIds: string[] }> {
  // Parse mentions from text
  const mentionedSlugs = parseMentions(text)

  if (mentionedSlugs.length === 0 && !isUpdate) {
    return { mentionedUserIds: [] }
  }

  // Batch lookup users by usernameSlug
  let mentionedUsers: { id: string; usernameSlug: string }[] = []
  if (mentionedSlugs.length > 0) {
    mentionedUsers = await db
      .select({
        id: users.id,
        usernameSlug: users.usernameSlug,
      })
      .from(users)
      .where(inArray(users.usernameSlug, mentionedSlugs))
  }

  // Filter out self-mentions
  const validMentions = mentionedUsers.filter(u => u.id !== mentionerUserId)
  const newMentionedUserIds = new Set(validMentions.map(u => u.id))

  if (isUpdate) {
    // Get existing mentions for this content
    const existingMentions = await db
      .select({ mentionedUserId: mentions.mentionedUserId })
      .from(mentions)
      .where(
        and(
          eq(mentions.referenceType, referenceType),
          eq(mentions.referenceId, referenceId)
        )
      )

    const existingMentionedUserIds = new Set(existingMentions.map(m => m.mentionedUserId))

    // Compute diff
    const toAdd = [...newMentionedUserIds].filter(id => !existingMentionedUserIds.has(id))
    const toRemove = [...existingMentionedUserIds].filter(id => !newMentionedUserIds.has(id))

    // Remove old mentions
    if (toRemove.length > 0) {
      await db
        .delete(mentions)
        .where(
          and(
            eq(mentions.referenceType, referenceType),
            eq(mentions.referenceId, referenceId),
            inArray(mentions.mentionedUserId, toRemove)
          )
        )
    }

    // Add new mentions
    if (toAdd.length > 0) {
      await db.insert(mentions).values(
        toAdd.map(mentionedUserId => ({
          mentionedUserId,
          mentionerUserId,
          referenceType,
          referenceId,
        }))
      )

      // Create notifications only for newly added mentions (non-critical)
      try {
        await db.insert(notifications).values(
          toAdd.map(mentionedUserId => ({
            userId: mentionedUserId,
            actorId: mentionerUserId,
            type: 'mention' as const,
            referenceType,
            referenceId,
          }))
        )
      } catch (notifError) {
        console.warn('[processMentions] Failed to create mention notifications:', notifError instanceof Error ? notifError.message : 'Unknown error')
      }

      // Dispatch push notifications for mentions (awaited for serverless compatibility)
      try {
        const actorName = await getActorDisplayName(mentionerUserId)
        for (const mentionedUserId of toAdd) {
          await sendPushNotification(mentionedUserId, {
            type: 'mention',
            title: `${actorName} mentioned you`,
            body: '',
            deepLink: referenceType === 'post'
              ? `https://desperse.com/p/${referenceId}`
              : `https://desperse.com`,
          })
        }
      } catch (pushErr) {
        console.warn('[mentions] Push notification error:', pushErr instanceof Error ? pushErr.message : 'Unknown error')
      }
    }

    return { mentionedUserIds: [...newMentionedUserIds] }
  }

  // Create mentions (new content)
  if (validMentions.length > 0) {
    await db.insert(mentions).values(
      validMentions.map(user => ({
        mentionedUserId: user.id,
        mentionerUserId,
        referenceType,
        referenceId,
      }))
    )

    // Create notifications for all mentions (non-critical)
    try {
      await db.insert(notifications).values(
        validMentions.map(user => ({
          userId: user.id,
          actorId: mentionerUserId,
          type: 'mention' as const,
          referenceType,
          referenceId,
        }))
      )
    } catch (notifError) {
      console.warn('[processMentions] Failed to create mention notifications:', notifError instanceof Error ? notifError.message : 'Unknown error')
    }

    // Dispatch push notifications for mentions (awaited for serverless compatibility)
    try {
      const actorName = await getActorDisplayName(mentionerUserId)
      for (const user of validMentions) {
        await sendPushNotification(user.id, {
          type: 'mention',
          title: `${actorName} mentioned you`,
          body: '',
          deepLink: referenceType === 'post'
            ? `https://desperse.com/p/${referenceId}`
            : `https://desperse.com`,
        })
      }
    } catch (pushErr) {
      console.warn('[mentions] Push notification error:', pushErr instanceof Error ? pushErr.message : 'Unknown error')
    }
  }

  return { mentionedUserIds: [...newMentionedUserIds] }
}

/**
 * Delete all mentions for a piece of content
 * Called when a post or comment is deleted
 */
export async function deleteMentions(
  referenceType: 'post' | 'comment',
  referenceId: string
): Promise<void> {
  await db
    .delete(mentions)
    .where(
      and(
        eq(mentions.referenceType, referenceType),
        eq(mentions.referenceId, referenceId)
      )
    )
}

/**
 * Get the post ID for a comment (for notification deep linking)
 */
export async function getPostIdForComment(commentId: string): Promise<string | null> {
  const [comment] = await db
    .select({ postId: comments.postId })
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1)

  return comment?.postId ?? null
}
