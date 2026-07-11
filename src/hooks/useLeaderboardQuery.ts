import { useInfiniteQuery } from '@tanstack/react-query'
import { getLeaderboard } from '@/server/functions/leaderboard'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export type LeaderboardView = 'creators' | 'community'
export type LeaderboardPeriod = '7d' | '30d' | '90d'

export type LeaderboardEntry = {
  rank: number
  userId: string
  usernameSlug: string
  displayName: string | null
  avatarUrl: string | null
  recentPost: { id: string; mediaUrl: string; coverUrl: string | null } | null
  score: number
  paidEditionCount: number
  freeCollectCount: number
  likeCount: number
  newFollowerCount: number
  activatedReferralCount: number
  isFollowing: boolean
  isCurrentUser: boolean
}

export type LeaderboardPage = {
  success: boolean
  error?: string
  algorithmVersion: string
  generatedAt: string | null
  view: LeaderboardView
  period: LeaderboardPeriod
  category: string | null
  availableViews: readonly LeaderboardView[]
  entries: LeaderboardEntry[]
  nextCursor: string | null
}

export function useLeaderboardQuery(input: {
  view: LeaderboardView
  period: LeaderboardPeriod
  category?: string
}) {
  const { isAuthenticated, getAuthHeaders } = useAuth()
  const { user } = useCurrentUser()

  return useInfiniteQuery({
    queryKey: [
      'leaderboard',
      user?.id ?? 'public',
      input.view,
      input.period,
      input.category ?? 'all',
    ],
    queryFn: async ({ pageParam }) => {
      const authorization = isAuthenticated
        ? (await getAuthHeaders().catch(() => ({} as Record<string, string>))).Authorization
        : undefined
      const result = await getLeaderboard({
        data: {
          view: input.view,
          period: input.period,
          category: input.view === 'creators' ? input.category : undefined,
          cursor: pageParam,
          limit: 20,
          _authorization: authorization,
        },
      } as never)
      if (!result.success) throw new Error(result.error || 'Failed to load the leaderboard.')
      return result as LeaderboardPage
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 10 * 60 * 1000,
  })
}

export function flattenLeaderboardEntries(data: ReturnType<typeof useLeaderboardQuery>['data']) {
  const seen = new Set<string>()
  return (data?.pages ?? []).flatMap((page) => page.entries).filter((entry) => {
    if (seen.has(entry.userId)) return false
    seen.add(entry.userId)
    return true
  })
}
