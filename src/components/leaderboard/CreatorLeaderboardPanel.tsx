import { Row } from '@cdecaire/sable/layout'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { LeaderboardList, LeaderboardSkeleton } from './LeaderboardList'
import {
  flattenLeaderboardEntries,
  useLeaderboardQuery,
  type LeaderboardPeriod,
  type LeaderboardView,
} from '@/hooks/useLeaderboardQuery'
import { formatRelativeTime } from '@/lib/dates'

/** Creators/Collectors ranking. Owns `useLeaderboardQuery` so the request only
 * fires while this tab is mounted (referrals uses a different data path). */
export function CreatorLeaderboardPanel({
  view,
  period,
}: {
  view: LeaderboardView
  period: LeaderboardPeriod
}) {
  const query = useLeaderboardQuery({ view, period })
  const entries = flattenLeaderboardEntries(query.data)
  const firstPage = query.data?.pages[0]

  return (
    <>
      {query.isLoading ? (
        <LeaderboardSkeleton view={view} />
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
                : 'Support score combines confirmed paid editions, free collects, likes, and distinct creators supported. Self-activity, hidden work, moderated accounts, and opted-out accounts do not count.'}
            </p>
          </PopoverContent>
        </Popover>
      </Row>
    </>
  )
}
