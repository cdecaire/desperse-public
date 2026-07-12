import { Buffer } from 'node:buffer'
import { and, desc, eq, gt, inArray, lt, notInArray } from 'drizzle-orm'
import { db } from '@/server/db'
import {
  follows,
  leaderboardEntries,
  leaderboardSnapshots,
  posts,
  users,
} from '@/server/db/schema'
import { getBlockedUserIdSet } from '@/server/utils/blocks'
import {
  LEADERBOARD_ALGORITHM_VERSION,
  type LeaderboardPeriod,
  type LeaderboardView,
  normalizeLeaderboardCategory,
} from './leaderboard-config'

export type LeaderboardCursor = {
  snapshotId: string
  rank: number
}

export type LeaderboardEntryResult = {
  rank: number
  userId: string
  usernameSlug: string
  displayName: string | null
  avatarUrl: string | null
  recentPost: {
    id: string
    mediaUrl: string
    coverUrl: string | null
  } | null
  score: number
  paidEditionCount: number
  freeCollectCount: number
  likeCount: number
  distinctCreatorCount: number
  newFollowerCount: number
  isFollowing: boolean
  isCurrentUser: boolean
}

export type LeaderboardPageResult = {
  success: boolean
  error?: string
  algorithmVersion: string
  generatedAt: string | null
  view: LeaderboardView
  period: LeaderboardPeriod
  category: string | null
  availableViews: LeaderboardView[]
  entries: LeaderboardEntryResult[]
  nextCursor: string | null
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function encodeLeaderboardCursor(cursor: LeaderboardCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

export function decodeLeaderboardCursor(value: string | null | undefined): LeaderboardCursor | null {
  if (!value || value.length > 512) return null
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<LeaderboardCursor>
    if (!parsed.snapshotId || !uuidPattern.test(parsed.snapshotId)) return null
    if (!Number.isInteger(parsed.rank) || (parsed.rank ?? 0) < 0) return null
    return { snapshotId: parsed.snapshotId, rank: parsed.rank! }
  } catch {
    return null
  }
}

function isLeaderboardParticipant(preferences: unknown): boolean {
  return (preferences as { privacy?: { leaderboardParticipation?: boolean } } | null)
    ?.privacy?.leaderboardParticipation !== false
}

async function findSnapshot(input: {
  view: LeaderboardView
  period: LeaderboardPeriod
  category: string
  cursor: LeaderboardCursor | null
}) {
  if (input.cursor) {
    const [snapshot] = await db
      .select()
      .from(leaderboardSnapshots)
      .where(
        and(
          eq(leaderboardSnapshots.id, input.cursor.snapshotId),
          eq(leaderboardSnapshots.view, input.view),
          eq(leaderboardSnapshots.period, input.period),
          eq(leaderboardSnapshots.category, input.category),
          eq(leaderboardSnapshots.isComplete, true),
        ),
      )
      .limit(1)
    return snapshot ?? null
  }

  const [snapshot] = await db
    .select()
    .from(leaderboardSnapshots)
    .where(
      and(
        eq(leaderboardSnapshots.view, input.view),
        eq(leaderboardSnapshots.period, input.period),
        eq(leaderboardSnapshots.category, input.category),
        eq(leaderboardSnapshots.algorithmVersion, LEADERBOARD_ALGORITHM_VERSION),
        eq(leaderboardSnapshots.isComplete, true),
      ),
    )
    .orderBy(desc(leaderboardSnapshots.generatedAt))
    .limit(1)
  return snapshot ?? null
}

export async function getLeaderboardPage(input: {
  view: LeaderboardView
  period: LeaderboardPeriod
  category?: string | null
  cursor?: string | null
  limit: number
  viewerUserId?: string
}): Promise<LeaderboardPageResult> {
  const category = input.view === 'collectors'
    ? 'all'
    : normalizeLeaderboardCategory(input.category)
  const decodedCursor = decodeLeaderboardCursor(input.cursor)
  if (input.cursor && !decodedCursor) {
    return {
      success: false,
      error: 'Invalid leaderboard cursor.',
      algorithmVersion: LEADERBOARD_ALGORITHM_VERSION,
      generatedAt: null,
      view: input.view,
      period: input.period,
      category: category === 'all' ? null : category,
      availableViews: ['creators', 'collectors'],
      entries: [],
      nextCursor: null,
    }
  }

  let snapshot = await findSnapshot({
    view: input.view,
    period: input.period,
    category,
    cursor: decodedCursor,
  })

  if (!snapshot && !decodedCursor) {
    const { refreshLeaderboardSnapshots } = await import('@/server/jobs/leaderboard-refresh')
    await refreshLeaderboardSnapshots({ force: true })
    snapshot = await findSnapshot({
      view: input.view,
      period: input.period,
      category,
      cursor: null,
    })
  }

  if (!snapshot) {
    return {
      success: false,
      error: decodedCursor ? 'This leaderboard snapshot is no longer available.' : 'Leaderboard data is not available yet.',
      algorithmVersion: LEADERBOARD_ALGORITHM_VERSION,
      generatedAt: null,
      view: input.view,
      period: input.period,
      category: category === 'all' ? null : category,
      availableViews: ['creators', 'collectors'],
      entries: [],
      nextCursor: null,
    }
  }

  const blocked = await getBlockedUserIdSet(input.viewerUserId)
  const rows = await db
    .select({
      entry: leaderboardEntries,
      user: {
        id: users.id,
        usernameSlug: users.usernameSlug,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        preferences: users.preferences,
      },
      recentPost: {
        id: posts.id,
        mediaUrl: posts.mediaUrl,
        coverUrl: posts.coverUrl,
      },
    })
    .from(leaderboardEntries)
    .innerJoin(users, eq(leaderboardEntries.userId, users.id))
    .leftJoin(
      posts,
      and(
        eq(leaderboardEntries.recentPostId, posts.id),
        eq(posts.isDeleted, false),
        eq(posts.isHidden, false),
        eq(posts.isDev, false),
      ),
    )
    .where(
      and(
        eq(leaderboardEntries.snapshotId, snapshot.id),
        eq(users.status, 'active'),
        decodedCursor ? gt(leaderboardEntries.rank, decodedCursor.rank) : undefined,
        blocked.size > 0 ? notInArray(users.id, Array.from(blocked)) : undefined,
      ),
    )
    .orderBy(leaderboardEntries.rank, leaderboardEntries.userId)
    .limit(input.limit + 25)

  const eligibleRows = rows
    .filter((row) => isLeaderboardParticipant(row.user.preferences))
    .slice(0, input.limit + 1)
  const hasMore = eligibleRows.length > input.limit
  const pageRows = hasMore ? eligibleRows.slice(0, input.limit) : eligibleRows

  const followingIds = new Set<string>()
  if (input.viewerUserId && pageRows.length > 0) {
    const followedRows = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(
        and(
          eq(follows.followerId, input.viewerUserId),
          inArray(follows.followingId, pageRows.map((row) => row.user.id)),
        ),
      )
    for (const row of followedRows) followingIds.add(row.followingId)
  }

  const entries = pageRows.map(({ entry, user, recentPost }) => ({
    rank: entry.rank,
    userId: user.id,
    usernameSlug: user.usernameSlug,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    recentPost: recentPost?.id ? recentPost : null,
    score: entry.score,
    paidEditionCount: entry.paidEditionCount,
    freeCollectCount: entry.freeCollectCount,
    likeCount: entry.likeCount,
    distinctCreatorCount: entry.distinctCreatorCount,
    newFollowerCount: entry.netNewFollowerCount,
    isFollowing: followingIds.has(user.id),
    isCurrentUser: user.id === input.viewerUserId,
  }))
  const lastEntry = entries.at(-1)

  return {
    success: true,
    algorithmVersion: snapshot.algorithmVersion,
    generatedAt: snapshot.generatedAt.toISOString(),
    view: input.view,
    period: input.period,
    category: category === 'all' ? null : category,
    availableViews: ['creators', 'collectors'],
    entries,
    nextCursor: hasMore && lastEntry
      ? encodeLeaderboardCursor({ snapshotId: snapshot.id, rank: lastEntry.rank })
      : null,
  }
}

export async function removeExpiredLeaderboardSnapshots(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const removed = await db
    .delete(leaderboardSnapshots)
    .where(lt(leaderboardSnapshots.generatedAt, cutoff))
    .returning({ id: leaderboardSnapshots.id })
  return removed.length
}
