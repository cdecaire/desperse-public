import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/server/db'
import {
  leaderboardEntries,
  leaderboardSnapshots,
  likes,
  userModerationActions,
} from '@/server/db/schema'
import {
  categoryNameToScope,
  CREATOR_SCORE_WEIGHTS,
  getLeaderboardBucketStart,
  LEADERBOARD_ALGORITHM_VERSION,
  LEADERBOARD_CATEGORY_SCOPES,
  LEADERBOARD_PERIODS,
  type LeaderboardPeriod,
  type LeaderboardView,
} from '@/server/utils/leaderboard-config'
import { removeExpiredLeaderboardSnapshots } from '@/server/utils/leaderboard'

type CreatorAggregateRow = {
  period: LeaderboardPeriod
  category: string
  user_id: string
  score: number | string
  paid_edition_count: number | string
  free_collect_count: number | string
  unique_supporter_count: number | string
  like_count: number | string
  new_follower_count: number | string
  recent_post_id: string | null
  rank: number | string
}

type CommunityAggregateRow = {
  period: LeaderboardPeriod
  user_id: string
  activated_referral_count: number | string
  latest_activation_at: Date | string | null
  rank: number | string
}

type SnapshotEntry = typeof leaderboardEntries.$inferInsert

const periodDates = (now: Date) => ({
  '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
  '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
  '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
})

function participantSql(tableAlias: string) {
  return sql.raw(`
    ${tableAlias}.status = 'active'
    AND COALESCE((${tableAlias}.preferences #>> '{privacy,leaderboardParticipation}')::boolean, true)
  `)
}

async function aggregateCreatorRows(now: Date): Promise<CreatorAggregateRow[]> {
  const dates = periodDates(now)
  const result = await db.execute<CreatorAggregateRow>(sql`
    WITH period_defs(period, since_at) AS (
      VALUES
        ('7d'::text, ${dates['7d'].toISOString()}::timestamptz),
        ('30d'::text, ${dates['30d'].toISOString()}::timestamptz),
        ('90d'::text, ${dates['90d'].toISOString()}::timestamptz)
    ),
    eligible_users AS (
      SELECT id
      FROM users u
      WHERE ${participantSql('u')}
    ),
    eligible_posts AS (
      SELECT p.id, p.user_id AS creator_id, p.categories, p.created_at
      FROM posts p
      INNER JOIN eligible_users creator ON creator.id = p.user_id
      WHERE p.is_dev = false AND p.is_deleted = false AND p.is_hidden = false
    ),
    latest_post_candidates AS (
      SELECT
        'all'::text AS category,
        ep.creator_id,
        ep.id AS post_id,
        ep.created_at
      FROM eligible_posts ep

      UNION ALL

      SELECT
        category_values.category,
        ep.creator_id,
        ep.id AS post_id,
        ep.created_at
      FROM eligible_posts ep
      CROSS JOIN LATERAL unnest(COALESCE(ep.categories, ARRAY[]::text[])) AS category_values(category)
    ),
    latest_post_scopes AS (
      SELECT category, creator_id, post_id
      FROM (
        SELECT
          category,
          creator_id,
          post_id,
          ROW_NUMBER() OVER (
            PARTITION BY category, creator_id
            ORDER BY created_at DESC, post_id DESC
          ) AS position
        FROM latest_post_candidates
      ) ranked_posts
      WHERE position = 1
    ),
    support_events AS (
      SELECT
        ep.creator_id,
        pur.user_id AS supporter_id,
        ep.id AS post_id,
        ep.categories,
        'paid'::text AS event_kind,
        COALESCE(pur.mint_confirmed_at, pur.confirmed_at, pur.created_at) AS occurred_at
      FROM purchases pur
      INNER JOIN eligible_posts ep ON ep.id = pur.post_id
      INNER JOIN eligible_users supporter ON supporter.id = pur.user_id
      WHERE pur.status = 'confirmed' AND pur.user_id <> ep.creator_id

      UNION ALL

      SELECT
        ep.creator_id,
        col.user_id AS supporter_id,
        ep.id AS post_id,
        ep.categories,
        'collect'::text AS event_kind,
        col.created_at AS occurred_at
      FROM collections col
      INNER JOIN eligible_posts ep ON ep.id = col.post_id
      INNER JOIN eligible_users supporter ON supporter.id = col.user_id
      WHERE col.status = 'confirmed' AND col.user_id <> ep.creator_id
    ),
    support_scopes AS (
      SELECT
        pd.period,
        'all'::text AS category,
        se.creator_id,
        se.supporter_id,
        se.post_id,
        se.event_kind,
        se.occurred_at
      FROM support_events se
      INNER JOIN period_defs pd ON se.occurred_at >= pd.since_at

      UNION ALL

      SELECT
        pd.period,
        category_values.category,
        se.creator_id,
        se.supporter_id,
        se.post_id,
        se.event_kind,
        se.occurred_at
      FROM support_events se
      INNER JOIN period_defs pd ON se.occurred_at >= pd.since_at
      CROSS JOIN LATERAL unnest(COALESCE(se.categories, ARRAY[]::text[])) AS category_values(category)
    ),
    support_metrics AS (
      SELECT
        period,
        category,
        creator_id,
        COUNT(*) FILTER (WHERE event_kind = 'paid')::int AS paid_edition_count,
        COUNT(*) FILTER (WHERE event_kind = 'collect')::int AS free_collect_count,
        COUNT(DISTINCT supporter_id)::int AS unique_supporter_count
      FROM support_scopes
      GROUP BY period, category, creator_id
    ),
    like_scopes AS (
      SELECT
        pd.period,
        'all'::text AS category,
        ep.creator_id,
        l.user_id AS liker_id
      FROM ${likes} l
      INNER JOIN eligible_posts ep ON ep.id = l.post_id
      INNER JOIN eligible_users liker ON liker.id = l.user_id
      INNER JOIN period_defs pd ON l.created_at >= pd.since_at
      WHERE l.user_id <> ep.creator_id

      UNION ALL

      SELECT
        pd.period,
        category_values.category,
        ep.creator_id,
        l.user_id AS liker_id
      FROM ${likes} l
      INNER JOIN eligible_posts ep ON ep.id = l.post_id
      INNER JOIN eligible_users liker ON liker.id = l.user_id
      INNER JOIN period_defs pd ON l.created_at >= pd.since_at
      CROSS JOIN LATERAL unnest(COALESCE(ep.categories, ARRAY[]::text[])) AS category_values(category)
      WHERE l.user_id <> ep.creator_id
    ),
    like_metrics AS (
      SELECT
        period,
        category,
        creator_id,
        COUNT(*)::int AS like_count
      FROM like_scopes
      GROUP BY period, category, creator_id
    ),
    follower_metrics AS (
      SELECT
        pd.period,
        'all'::text AS category,
        f.following_id AS creator_id,
        COUNT(*)::int AS new_follower_count
      FROM follows f
      INNER JOIN period_defs pd ON f.created_at >= pd.since_at
      INNER JOIN eligible_users creator ON creator.id = f.following_id
      INNER JOIN eligible_users follower ON follower.id = f.follower_id
      WHERE f.follower_id <> f.following_id
      GROUP BY pd.period, f.following_id
    ),
    leaderboard_keys AS (
      SELECT period, category, creator_id FROM support_metrics
      UNION
      SELECT period, category, creator_id FROM like_metrics
      UNION
      SELECT period, category, creator_id FROM follower_metrics
    ),
    scored AS (
      SELECT
        lk.period,
        lk.category,
        lk.creator_id AS user_id,
        COALESCE(sm.paid_edition_count, 0)::int AS paid_edition_count,
        COALESCE(sm.free_collect_count, 0)::int AS free_collect_count,
        COALESCE(sm.unique_supporter_count, 0)::int AS unique_supporter_count,
        COALESCE(lm.like_count, 0)::int AS like_count,
        COALESCE(fm.new_follower_count, 0)::int AS new_follower_count,
        latest_post.post_id AS recent_post_id,
        (
          COALESCE(sm.paid_edition_count, 0) * ${CREATOR_SCORE_WEIGHTS.paidEdition} +
          COALESCE(sm.free_collect_count, 0) * ${CREATOR_SCORE_WEIGHTS.freeCollect} +
          COALESCE(sm.unique_supporter_count, 0) * ${CREATOR_SCORE_WEIGHTS.uniqueSupporter} +
          COALESCE(lm.like_count, 0) * ${CREATOR_SCORE_WEIGHTS.like} +
          COALESCE(fm.new_follower_count, 0) * ${CREATOR_SCORE_WEIGHTS.newFollower}
        )::int AS score
      FROM leaderboard_keys lk
      LEFT JOIN support_metrics sm
        ON sm.period = lk.period AND sm.category = lk.category AND sm.creator_id = lk.creator_id
      LEFT JOIN like_metrics lm
        ON lm.period = lk.period AND lm.category = lk.category AND lm.creator_id = lk.creator_id
      LEFT JOIN follower_metrics fm
        ON fm.period = lk.period AND fm.category = lk.category AND fm.creator_id = lk.creator_id
      LEFT JOIN latest_post_scopes latest_post
        ON latest_post.category = lk.category AND latest_post.creator_id = lk.creator_id
    )
    SELECT
      period,
      category,
      user_id,
      score,
      paid_edition_count,
      free_collect_count,
      unique_supporter_count,
      like_count,
      new_follower_count,
      recent_post_id,
      ROW_NUMBER() OVER (PARTITION BY period, category ORDER BY score DESC, user_id ASC)::int AS rank
    FROM scored
    WHERE score > 0
    ORDER BY period, category, rank
  `)
  return Array.from(result as unknown as CreatorAggregateRow[])
}

async function aggregateCommunityRows(now: Date): Promise<CommunityAggregateRow[]> {
  const dates = periodDates(now)
  const result = await db.execute<CommunityAggregateRow>(sql`
    WITH period_defs(period, since_at) AS (
      VALUES
        ('7d'::text, ${dates['7d'].toISOString()}::timestamptz),
        ('30d'::text, ${dates['30d'].toISOString()}::timestamptz),
        ('90d'::text, ${dates['90d'].toISOString()}::timestamptz)
    ),
    eligible_users AS (
      SELECT id
      FROM users u
      WHERE ${participantSql('u')}
    ),
    scored AS (
      SELECT
        pd.period,
        r.referrer_user_id AS user_id,
        COUNT(*)::int AS activated_referral_count,
        MAX(r.activated_at) AS latest_activation_at
      FROM referrals r
      INNER JOIN period_defs pd ON r.activated_at >= pd.since_at
      INNER JOIN eligible_users referrer ON referrer.id = r.referrer_user_id
      INNER JOIN eligible_users referred ON referred.id = r.referred_user_id
      WHERE r.state = 'activated' AND r.activated_at IS NOT NULL
      GROUP BY pd.period, r.referrer_user_id
    )
    SELECT
      period,
      user_id,
      activated_referral_count,
      latest_activation_at,
      ROW_NUMBER() OVER (
        PARTITION BY period
        ORDER BY activated_referral_count DESC, latest_activation_at DESC, user_id ASC
      )::int AS rank
    FROM scored
    ORDER BY period, rank
  `)
  return Array.from(result as unknown as CommunityAggregateRow[])
}

function scopeKey(view: LeaderboardView, period: LeaderboardPeriod, category: string) {
  return `${view}:${period}:${category}`
}

async function publishScope(input: {
  view: LeaderboardView
  period: LeaderboardPeriod
  category: string
  entries: Omit<SnapshotEntry, 'snapshotId'>[]
  bucketStartedAt: Date
  generatedAt: Date
}) {
  const [snapshot] = await db
    .insert(leaderboardSnapshots)
    .values({
      view: input.view,
      period: input.period,
      category: input.category,
      algorithmVersion: LEADERBOARD_ALGORITHM_VERSION,
      bucketStartedAt: input.bucketStartedAt,
      generatedAt: input.generatedAt,
      entryCount: 0,
      isComplete: false,
    })
    .onConflictDoNothing()
    .returning({ id: leaderboardSnapshots.id })

  if (!snapshot) return { published: false, entryCount: 0 }

  try {
    for (let offset = 0; offset < input.entries.length; offset += 500) {
      const chunk = input.entries.slice(offset, offset + 500)
      await db.insert(leaderboardEntries).values(
        chunk.map((entry) => ({ ...entry, snapshotId: snapshot.id })),
      )
    }
    await db
      .update(leaderboardSnapshots)
      .set({ entryCount: input.entries.length, isComplete: true })
      .where(eq(leaderboardSnapshots.id, snapshot.id))
    return { published: true, entryCount: input.entries.length }
  } catch (error) {
    await db.delete(leaderboardSnapshots).where(eq(leaderboardSnapshots.id, snapshot.id))
    throw error
  }
}

export type LeaderboardRefreshSummary = {
  generatedAt: string
  snapshotsPublished: number
  entriesPublished: number
  skipped: boolean
}

let refreshInFlight: Promise<LeaderboardRefreshSummary> | null = null

async function runRefresh(options: { force?: boolean } = {}): Promise<LeaderboardRefreshSummary> {
  const startedAt = new Date()
  let bucketStartedAt = options.force ? startedAt : getLeaderboardBucketStart(startedAt)

  if (!options.force) {
    const [existing] = await db
      .select({
        id: leaderboardSnapshots.id,
        generatedAt: leaderboardSnapshots.generatedAt,
      })
      .from(leaderboardSnapshots)
      .where(
        and(
          eq(leaderboardSnapshots.view, 'creators'),
          eq(leaderboardSnapshots.period, '30d'),
          eq(leaderboardSnapshots.category, 'all'),
          eq(leaderboardSnapshots.algorithmVersion, LEADERBOARD_ALGORITHM_VERSION),
          eq(leaderboardSnapshots.bucketStartedAt, bucketStartedAt),
          eq(leaderboardSnapshots.isComplete, true),
        ),
      )
      .limit(1)
    if (existing) {
      const [latestModerationAction] = await db
        .select({ createdAt: userModerationActions.createdAt })
        .from(userModerationActions)
        .orderBy(desc(userModerationActions.createdAt))
        .limit(1)
      const isDirty = Boolean(
        latestModerationAction && latestModerationAction.createdAt > existing.generatedAt,
      )
      if (!isDirty) {
        return {
          generatedAt: startedAt.toISOString(),
          snapshotsPublished: 0,
          entriesPublished: 0,
          skipped: true,
        }
      }
      // A recent account action needs a fresh immutable snapshot without
      // waiting for the next two-hour bucket. The 10-minute cron is the debounce.
      bucketStartedAt = startedAt
    }
  }

  console.log('[leaderboard] Snapshot refresh started', {
    algorithmVersion: LEADERBOARD_ALGORITHM_VERSION,
    bucketStartedAt: bucketStartedAt.toISOString(),
  })

  const [creatorRows, communityRows] = await Promise.all([
    aggregateCreatorRows(startedAt),
    aggregateCommunityRows(startedAt),
  ])

  const grouped = new Map<string, Omit<SnapshotEntry, 'snapshotId'>[]>()
  for (const period of LEADERBOARD_PERIODS) {
    for (const category of LEADERBOARD_CATEGORY_SCOPES) {
      grouped.set(scopeKey('creators', period, category), [])
    }
    grouped.set(scopeKey('community', period, 'all'), [])
  }

  for (const row of creatorRows) {
    const category = categoryNameToScope(row.category)
    if (!category) continue
    const group = grouped.get(scopeKey('creators', row.period, category))
    if (!group) continue
    group.push({
      userId: row.user_id,
      rank: Number(row.rank),
      score: Number(row.score),
      paidEditionCount: Number(row.paid_edition_count),
      freeCollectCount: Number(row.free_collect_count),
      uniqueSupporterCount: Number(row.unique_supporter_count),
      likeCount: Number(row.like_count),
      netNewFollowerCount: Number(row.new_follower_count),
      activatedReferralCount: 0,
      recentPostId: row.recent_post_id,
    })
  }

  for (const row of communityRows) {
    const group = grouped.get(scopeKey('community', row.period, 'all'))
    if (!group) continue
    group.push({
      userId: row.user_id,
      rank: Number(row.rank),
      score: Number(row.activated_referral_count),
      paidEditionCount: 0,
      freeCollectCount: 0,
      uniqueSupporterCount: 0,
      likeCount: 0,
      netNewFollowerCount: 0,
      activatedReferralCount: Number(row.activated_referral_count),
      recentPostId: null,
    })
  }

  let snapshotsPublished = 0
  let entriesPublished = 0
  for (const [key, entries] of grouped) {
    const [view, period, category] = key.split(':') as [LeaderboardView, LeaderboardPeriod, string]
    const published = await publishScope({
      view,
      period,
      category,
      entries,
      bucketStartedAt,
      generatedAt: startedAt,
    })
    if (published.published) snapshotsPublished += 1
    entriesPublished += published.entryCount
  }

  try {
    await removeExpiredLeaderboardSnapshots(startedAt)
  } catch (error) {
    console.warn('[leaderboard] Failed to clean old snapshots:', error instanceof Error ? error.message : 'Unknown error')
  }

  console.log('[leaderboard] Snapshot refresh completed', {
    durationMs: Date.now() - startedAt.getTime(),
    snapshotsPublished,
    entriesPublished,
  })
  return {
    generatedAt: startedAt.toISOString(),
    snapshotsPublished,
    entriesPublished,
    skipped: false,
  }
}

export function refreshLeaderboardSnapshots(
  options: { force?: boolean } = {},
): Promise<LeaderboardRefreshSummary> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = runRefresh(options).finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}
