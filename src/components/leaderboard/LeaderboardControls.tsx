import { useNavigate } from '@tanstack/react-router'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { LeaderboardPeriod, LeaderboardTab } from '@/hooks/useLeaderboardQuery'

type LeaderboardSearch = {
  view?: LeaderboardTab
  period?: LeaderboardPeriod
}

export function LeaderboardControls({
  view,
  period,
}: {
  view: LeaderboardTab
  period: LeaderboardPeriod
}) {
  const navigate = useNavigate()
  const updateSearch = (next: LeaderboardSearch) => {
    navigate({ to: '/leaderboard', search: next, replace: true })
  }

  // The referral board is weekly-only, so the period control does not apply.
  const isReferrals = view === 'referrals'

  return (
    <div className="flex flex-col gap-4 pb-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Tabs
            value={view}
            onValueChange={(value) => updateSearch({
              view: value === 'creators' ? undefined : value as LeaderboardTab,
              // Drop the period when moving to referrals (it is not period-based).
              period: value === 'referrals' || period === '30d' ? undefined : period,
            })}
          >
            <TabsList className="shrink-0">
              <TabsTrigger value="creators">Creators</TabsTrigger>
              <TabsTrigger value="collectors">Collectors</TabsTrigger>
              <TabsTrigger value="referrals">Referrals</TabsTrigger>
            </TabsList>
          </Tabs>

        </div>

        {!isReferrals && (
          <ToggleGroup
            value={[period]}
            onValueChange={(value) => {
              const nextPeriod = value[0] as LeaderboardPeriod | undefined
              if (!nextPeriod) return
              updateSearch({
                view: view === 'creators' ? undefined : view,
                period: nextPeriod === '30d' ? undefined : nextPeriod,
              })
            }}
            size="sm"
            spacing={1}
            className="shrink-0 self-end rounded-lg bg-muted p-1 sm:self-auto"
            aria-label="Leaderboard period"
          >
            {(['7d', '30d', '90d'] as const).map((value) => (
              <ToggleGroupItem
                key={value}
                value={value}
                className="rounded-md px-3 text-label-lg text-muted-foreground hover:bg-transparent hover:text-foreground data-[pressed]:bg-background data-[pressed]:text-foreground data-[pressed]:shadow-sm"
              >
                {value === '7d' ? '7 days' : value === '30d' ? '30 days' : '90 days'}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </div>
    </div>
  )
}
