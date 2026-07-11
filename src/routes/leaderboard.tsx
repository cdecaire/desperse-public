import { createFileRoute } from '@tanstack/react-router'
import { Col, Columns, Row, Stack } from '@cdecaire/sable/layout'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { MobileHeader, MobileHeaderSpacer } from '@/components/layout/MobileHeader'
import { LeaderboardControls, LeaderboardList, LeaderboardSkeleton } from '@/components/leaderboard'
import {
  flattenLeaderboardEntries,
  useLeaderboardQuery,
  type LeaderboardPeriod,
  type LeaderboardView,
} from '@/hooks/useLeaderboardQuery'
import { useAuth } from '@/hooks/useAuth'
import { formatRelativeTime } from '@/lib/dates'

function isView(value: unknown): value is LeaderboardView {
  return value === 'creators' || value === 'community'
}

function isPeriod(value: unknown): value is LeaderboardPeriod {
  return value === '7d' || value === '30d' || value === '90d'
}

export const Route = createFileRoute('/leaderboard')({
  validateSearch: (search: Record<string, unknown>): {
    view?: LeaderboardView
    period?: LeaderboardPeriod
  } => {
    const view = isView(search.view) ? search.view : undefined
    const period = isPeriod(search.period) ? search.period : undefined
    return {
      view: view === 'creators' ? undefined : view,
      period: period === '30d' ? undefined : period,
    }
  },
  head: () => ({
    meta: [
      { title: 'Leaderboard | Desperse' },
      { name: 'description', content: 'Discover creators earning support and community members growing Desperse.' },
    ],
  }),
  component: LeaderboardPage,
})

function LeaderboardPage() {
  const search = Route.useSearch()
  const view = search.view ?? 'creators'
  const period = search.period ?? '30d'
  const { isAuthenticated } = useAuth()
  const query = useLeaderboardQuery({ view, period })
  const entries = flattenLeaderboardEntries(query.data)
  const firstPage = query.data?.pages[0]

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
                <p className="max-w-2xl text-body-lg text-muted-foreground">
                  {view === 'creators'
                    ? 'Creators earning recent support through editions, collects, likes, and new followers.'
                    : 'Community members bringing activated people into Desperse.'}
                </p>
              </Stack>

              <LeaderboardControls view={view} period={period} />

              {query.isLoading ? (
                <LeaderboardSkeleton />
              ) : query.error ? (
                <div className="rounded-lg border border-border bg-card px-6 py-12 text-center">
                  <Icon name="triangle-exclamation" variant="regular" className="mb-3 text-3xl text-muted-foreground" />
                  <h2 className="text-title-lg">Leaderboard unavailable</h2>
                  <p className="mx-auto mt-2 max-w-md text-body-sm text-muted-foreground">
                    {query.error.message || 'We could not load the current rankings.'}
                  </p>
                  <Button variant="outline" className="mt-5" onClick={() => query.refetch()}>
                    Try again
                  </Button>
                </div>
              ) : (
                <>
                  <LeaderboardList entries={entries} view={view} />
                  {query.hasNextPage && (
                    <div className="flex justify-center pt-6">
                      <Button
                        variant="outline"
                        disabled={query.isFetchingNextPage}
                        onClick={() => query.fetchNextPage()}
                      >
                        {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
                      </Button>
                    </div>
                  )}
                </>
              )}

              <Row align="center" justify="between" className="mt-4 gap-4">
                <p className="text-caption text-muted-foreground">
                  {firstPage?.generatedAt ? (
                    <time dateTime={firstPage.generatedAt}>
                      Updated {formatRelativeTime(firstPage.generatedAt)}
                    </time>
                  ) : 'Updated every two hours'}
                </p>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="shrink-0 rounded-md text-label-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      How ranking works <Icon name="circle-info" variant="regular" className="ml-1" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    align="end"
                    sideOffset={8}
                    className="w-80 max-w-[calc(100vw-2rem)] rounded-lg p-4"
                    aria-label="How ranking works"
                  >
                    <p className="text-label-lg">How ranking works</p>
                    <p className="mt-2 text-body-sm text-muted-foreground">
                      {view === 'creators'
                        ? 'Support score combines confirmed paid editions, free collects, likes, unique supporters, and new followers. Self-support, hidden work, moderated accounts, and opted-out accounts do not count.'
                        : 'Community rank counts only referrals that completed the verified activation flow. Clicks and incomplete signups never count.'}
                    </p>
                  </PopoverContent>
                </Popover>
              </Row>
            </main>
          </Col>
        </Columns>
      </div>
    </>
  )
}
