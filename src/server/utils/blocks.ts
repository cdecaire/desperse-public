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
 * `getBlockedUserIdSet` for pairwise checks where direction doesn't
 * matter (e.g., feed filters).
 */
export async function isPairwiseBlocked(
  viewerId: string,
  otherUserId: string,
): Promise<boolean> {
  if (viewerId === otherUserId) return false
  const blocked = await getBlockedUserIdSet(viewerId)
  return blocked.has(otherUserId)
}

/**
 * Directional block state. Use when the response should differ based on
 * who blocked whom — typically:
 *   - `iBlocked.has(target)`  → show the profile/post with an `isBlocked`
 *                                flag so the viewer can unblock from the UI.
 *   - `blockedMe.has(target)` → 404 the response so the blocked viewer
 *                                can't probe / see content.
 *
 * For symmetric content filters (feed, search results), prefer
 * `getBlockedUserIdSet` — it's the union of both sets.
 */
export interface DirectedBlockState {
  iBlocked: Set<string>
  blockedMe: Set<string>
}

export async function getDirectedBlockState(
  viewerId: string | null | undefined,
): Promise<DirectedBlockState> {
  const empty: DirectedBlockState = { iBlocked: new Set(), blockedMe: new Set() }
  if (!viewerId) return empty

  const rows = await db
    .select({
      blockerId: userBlocks.blockerId,
      blockedId: userBlocks.blockedId,
    })
    .from(userBlocks)
    .where(or(eq(userBlocks.blockerId, viewerId), eq(userBlocks.blockedId, viewerId)))

  const iBlocked = new Set<string>()
  const blockedMe = new Set<string>()
  for (const row of rows) {
    if (row.blockerId === viewerId) iBlocked.add(row.blockedId)
    else blockedMe.add(row.blockerId)
  }
  return { iBlocked, blockedMe }
}
