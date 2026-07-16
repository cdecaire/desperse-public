import { createFileRoute } from '@tanstack/react-router'
import { Col, Columns, Stack } from '@cdecaire/sable/layout'
import { MobileHeader, MobileHeaderSpacer } from '@/components/layout/MobileHeader'
import {
  CreatorLeaderboardPanel,
  LeaderboardControls,
  ReferralLeaderboardPanel,
} from '@/components/leaderboard'
import {
  type LeaderboardPeriod,
  type LeaderboardTab,
} from '@/hooks/useLeaderboardQuery'
import { useAuth } from '@/hooks/useAuth'

function isTab(value: unknown): value is LeaderboardTab {
  return value === 'creators' || value === 'collectors' || value === 'referrals'
}

function isPeriod(value: unknown): value is LeaderboardPeriod {
  return value === '7d' || value === '30d' || value === '90d'
}

const SUBHEADINGS: Record<LeaderboardTab, string> = {
  creators: 'Creators earning recent support through editions, collects, likes, and new followers.',
  collectors: 'Collectors supporting creators through purchases, collects, and likes.',
  referrals: 'Members ranked by the invites they’ve activated since Monday.',
}

export const Route = createFileRoute('/leaderboard')({
  validateSearch: (search: Record<string, unknown>): {
    view?: LeaderboardTab
    period?: LeaderboardPeriod
  } => {
    const view = isTab(search.view) ? search.view : undefined
    const period = isPeriod(search.period) ? search.period : undefined
    return {
      view: view === 'creators' ? undefined : view,
      // Period only applies to the creators/collectors views.
      period: view === 'referrals' || period === '30d' ? undefined : period,
    }
  },
  head: () => ({
    meta: [
      { title: 'Leaderboard | Desperse' },
      { name: 'description', content: 'Discover creators earning support, collectors supporting the work they love, and the members growing the community through invites.' },
    ],
  }),
  component: LeaderboardPage,
})

function LeaderboardPage() {
  const search = Route.useSearch()
  const view = search.view ?? 'creators'
  const period = search.period ?? '30d'
  const { isAuthenticated } = useAuth()

  return (
    <>
      {isAuthenticated && (
        <>
          <MobileHeader title="Leaderboard" showBackButton={false} />
          <MobileHeaderSpacer />
        </>
      )}

      <div className="px-4 pb-12 pt-4 md:px-6 lg:px-8">
        <Columns count={12} className="mt-3 items-start">
          <Col span={{ base: 12, xl: 10 }} start={{ xl: 2 }} className="min-w-0">
            <main className="min-w-0">
              <Stack gap={1} className="mb-6 max-w-3xl">
                <h1 className="text-heading-2">Leaderboard</h1>
                <p className="max-w-2xl text-body-lg text-muted-foreground">{SUBHEADINGS[view]}</p>
              </Stack>

              <LeaderboardControls view={view} period={period} />

              {view === 'referrals' ? (
                <ReferralLeaderboardPanel />
              ) : (
                <CreatorLeaderboardPanel view={view} period={period} />
              )}
            </main>
          </Col>
        </Columns>
      </div>
    </>
  )
}
