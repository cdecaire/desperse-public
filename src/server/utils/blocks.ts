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
import { userBlocks, users } from '@/server/db/schema'
import { and, desc, eq, or } from 'drizzle-orm'
import { isUniqueViolation } from './db-errors'

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

/**
 * Idempotent insert. Returns true if a new row was created, false if the pair
 * was already blocked. Throws on self-block or missing target.
 */
export async function createBlock(blockerId: string, blockedId: string): Promise<boolean> {
  if (blockerId === blockedId) {
    throw new Error('Cannot block yourself')
  }
  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, blockedId)).limit(1)
  if (!target) {
    throw new Error('User not found')
  }
  try {
    await db.insert(userBlocks).values({ blockerId, blockedId })
    return true
  } catch (err) {
    if (isUniqueViolation(err)) {
      return false
    }
    throw err
  }
}

/**
 * Idempotent delete. Returns true if a row was removed, false if there was
 * nothing to remove.
 */
export async function deleteBlock(blockerId: string, blockedId: string): Promise<boolean> {
  const result = await db
    .delete(userBlocks)
    .where(and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedId, blockedId)))
    .returning({ id: userBlocks.id })
  return result.length > 0
}

export interface BlockedUserSummary {
  id: string
  slug: string
  displayName: string | null
  avatarUrl: string | null
}

/**
 * List the users this blocker has blocked, newest first. Joins onto `users`
 * for the lightweight summary the settings UI needs.
 */
export async function listBlockedUsers(blockerId: string): Promise<BlockedUserSummary[]> {
  const rows = await db
    .select({
      id: users.id,
      slug: users.usernameSlug,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      createdAt: userBlocks.createdAt,
    })
    .from(userBlocks)
    .innerJoin(users, eq(userBlocks.blockedId, users.id))
    .where(eq(userBlocks.blockerId, blockerId))
    .orderBy(desc(userBlocks.createdAt))
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    displayName: r.displayName,
    avatarUrl: r.avatarUrl,
  }))
}

/**
 * Throws a labeled error if either party has blocked the other. Use as a
 * write-side guard for follow / like / collect / comment / tip / DM endpoints
 * to short-circuit before producing a state that conflicts with the block.
 */
export class PairwiseBlockError extends Error {
  constructor(message = 'This action is not available between these users.') {
    super(message)
    this.name = 'PairwiseBlockError'
  }
}

export async function assertNotPairwiseBlocked(viewerId: string, otherUserId: string): Promise<void> {
  if (viewerId === otherUserId) return
  const blocked = await isPairwiseBlocked(viewerId, otherUserId)
  if (blocked) {
    throw new PairwiseBlockError()
  }
}
