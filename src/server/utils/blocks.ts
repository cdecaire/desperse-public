/**
 * User-block helpers — returns lists of user IDs the viewer should not see
 * (and vice versa). Use in WHERE clauses on any endpoint that returns user
 * content (feed, profile, post detail, comments, search, mentions,
 * notifications, DMs).
 *
 * Block semantics: if EITHER party has blocked the other, content is hidden
 * symmetrically. Storing a single directed row simplifies create/delete UI
 * but the read-side filter must always check both directions.
 */

import { db } from '@/server/db'
import { userBlocks } from '@/server/db/schema'
import { eq, or } from 'drizzle-orm'

/**
 * Returns the set of user IDs the viewer should NOT see content from —
 * union of (users I've blocked) and (users who've blocked me). Pass an
 * empty viewerId (anonymous viewer) to short-circuit and return an empty
 * Set; anonymous users see public content unfiltered.
 *
 * The `user_blocks` table has indexes on both directions, so the OR
 * scan is cheap. Call once per request and reuse the resulting Set.
 */
export async function getBlockedUserIdSet(viewerId: string | null | undefined): Promise<Set<string>> {
  if (!viewerId) return new Set()

  const rows = await db
    .select({
      blockerId: userBlocks.blockerId,
      blockedId: userBlocks.blockedId,
    })
    .from(userBlocks)
    .where(or(eq(userBlocks.blockerId, viewerId), eq(userBlocks.blockedId, viewerId)))

  const out = new Set<string>()
  for (const row of rows) {
    out.add(row.blockerId === viewerId ? row.blockedId : row.blockerId)
  }
  return out
}

/**
 * Returns true if either user has blocked the other. Convenience over
 * `getBlockedUserIdSet` for pairwise checks (e.g., loading another user's
 * profile, opening a DM). For batch filtering, use `getBlockedUserIdSet`
 * directly.
 */
export async function isPairwiseBlocked(
  viewerId: string,
  otherUserId: string,
): Promise<boolean> {
  if (viewerId === otherUserId) return false
  const blocked = await getBlockedUserIdSet(viewerId)
  return blocked.has(otherUserId)
}
