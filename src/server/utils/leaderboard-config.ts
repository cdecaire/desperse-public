import { PRESET_CATEGORIES, categoryToSlug, isPresetCategory } from '@/constants/categories'

export const LEADERBOARD_ALGORITHM_VERSION = 'v3' as const
export const LEADERBOARD_PERIODS = ['7d', '30d', '90d'] as const
export const LEADERBOARD_VIEWS = ['creators', 'collectors'] as const

export type LeaderboardPeriod = (typeof LEADERBOARD_PERIODS)[number]
export type LeaderboardView = (typeof LEADERBOARD_VIEWS)[number]

export const LEADERBOARD_PERIOD_DAYS: Record<LeaderboardPeriod, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

export const CREATOR_SCORE_WEIGHTS = Object.freeze({
  paidEdition: 6,
  freeCollect: 2,
  uniqueSupporter: 3,
  like: 1,
  newFollower: 1,
})

export const COLLECTOR_SCORE_WEIGHTS = Object.freeze({
  paidEdition: 6,
  freeCollect: 2,
  like: 1,
  distinctCreator: 3,
})

export const LEADERBOARD_CATEGORY_SCOPES = [
  'all',
  ...PRESET_CATEGORIES.map(categoryToSlug),
] as const

export function normalizeLeaderboardCategory(value: string | null | undefined): string {
  if (!value || value === 'all') return 'all'
  return isPresetCategory(value) ? value : 'all'
}

export function categoryNameToScope(value: string | null | undefined): string | null {
  if (!value || value === 'all') return 'all'
  const slug = categoryToSlug(value)
  return isPresetCategory(slug) ? slug : null
}

export function getLeaderboardBucketStart(now = new Date()): Date {
  const bucketMs = 2 * 60 * 60 * 1000
  return new Date(Math.floor(now.getTime() / bucketMs) * bucketMs)
}
