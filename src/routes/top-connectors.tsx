import { createFileRoute, Link } from '@tanstack/react-router'
import { Col, Columns, Row, Stack } from '@cdecaire/sable/layout'

import { MobileHeader, MobileHeaderSpacer } from '@/components/layout/MobileHeader'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { useAuth } from '@/hooks/useAuth'
import { useReferralLeaderboard } from '@/hooks/useReferrals'
import type { ReferralLeaderboardEntry } from '@/lib/referrals'

export const Route = createFileRoute('/top-connectors')({
  head: () => ({
    meta: [
      { title: 'Top Connectors This Week | Desperse' },
      { name: 'description', content: 'People bringing active community members into Desperse this week.' },
    ],
  }),
  component: TopConnectorsPage,
})

function ConnectorRow({ entry }: { entry: ReferralLeaderboardEntry }) {
  return (
    <Link
      to="/profile/$slug"
      params={{ slug: entry.usernameSlug }}
      className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/60 px-4 py-3 last:border-b-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <span className="text-mono-md text-muted-foreground">#{entry.rank}</span>
      <Row gap={1.5} align="center" className="min-w-0">
        <UserAvatar src={entry.avatarUrl} alt="" seed={entry.usernameSlug} size="lg" />
        <span className="min-w-0">
          <span className="block truncate text-label-lg">{entry.displayName || `@${entry.usernameSlug}`}</span>
          <span className="block truncate text-caption text-muted-foreground">@{entry.usernameSlug}</span>
        </span>
      </Row>
      <Stack gap={0.25} align="end">
        <Badge variant="secondary" size="sm">{entry.badgeLabel}</Badge>
        <span className="text-body-sm text-muted-foreground">
          {entry.weeklyActivatedCount} activated this week
        </span>
      </Stack>
    </Link>
  )
}

function StatusCard({ status }: { status: NonNullable<ReturnType<typeof useReferralLeaderboard>['data']>['currentUserStatus'] }) {
  if (!status) return null

  const content = status.state === 'ranked'
    ? { title: `You’re #${status.rank} this week`, body: 'Your current valid activations are included in this week’s board.' }
    : status.state === 'ineligible'
      ? { title: 'Keep building your connector status', body: `Activate ${status.remainingToQualify} more invite${status.remainingToQualify === 1 ? '' : 's'} to qualify for Top Connectors.` }
      : status.state === 'review-held'
        ? { title: 'Your leaderboard status is under review', body: 'Your referral credit remains visible on your profile, but it is not included in this board while review is active.' }
        : { title: 'You’re eligible for this week’s board', body: 'Rankings may be reviewed before publication. Activate an invite this week to appear in the ranked list.' }

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <p className="text-title-lg">{content.title}</p>
      <p className="mt-1 text-body-sm text-muted-foreground">{content.body}</p>
    </div>
  )
}

function TopConnectorsPage() {
  const { isAuthenticated } = useAuth()
  const query = useReferralLeaderboard()

  return (
    <>
      {isAuthenticated ? (
        <>
          <MobileHeader title="Top Connectors" />
          <MobileHeaderSpacer />
        </>
      ) : null}

      <div className="px-4 pb-12 pt-4 md:px-6 lg:px-8">
        <Columns count={12} className="mt-3 items-start">
          <Col span={{ base: 12, xl: 8 }} start={{ xl: 3 }} className="min-w-0">
            <main>
              <Stack gap={1} className="mb-6">
                <p className="text-label-md text-muted-foreground">Weekly referral board</p>
                <h1 className="text-heading-2">Top Connectors This Week</h1>
                <p className="max-w-2xl text-body-lg text-muted-foreground">
                  Ranked by valid invites activated since Monday. Connector eligibility starts at 10 total activations.
                </p>
                <p className="text-caption text-muted-foreground">Subject to review. Recognition only, with no cash value.</p>
              </Stack>

              {query.isLoading ? (
                <Row gap={1.5} align="center" justify="center" className="rounded-lg border border-border bg-card py-16 text-muted-foreground">
                  <LoadingSpinner size="sm" />
                  <span>Loading this week’s board…</span>
                </Row>
              ) : query.error ? (
                <div className="rounded-lg border border-border bg-card px-6 py-12 text-center">
                  <Icon name="triangle-exclamation" variant="regular" className="mb-3 text-3xl text-muted-foreground" />
                  <h2 className="text-title-lg">Top Connectors is unavailable</h2>
                  <p className="mt-2 text-body-sm text-muted-foreground">We couldn’t load the current board.</p>
                  <Button variant="outline" className="mt-5" onClick={() => query.refetch()}>Try again</Button>
                </div>
              ) : (
                <Stack gap={2.5}>
                  <StatusCard status={query.data?.currentUserStatus ?? null} />

                  {query.data?.entries.length ? (
                    <div className="overflow-hidden rounded-lg border border-border bg-card">
                      {query.data.entries.map((entry) => <ConnectorRow key={entry.userId} entry={entry} />)}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border bg-card px-6 py-12 text-center">
                      <Icon name="ranking-star" variant="regular" className="mb-3 text-4xl text-muted-foreground" />
                      <h2 className="text-title-lg">No published rankings yet</h2>
                      <p className="mx-auto mt-2 max-w-md text-body-sm text-muted-foreground">
                        Eligible connectors will appear after a valid invite activates this week and the board is reviewed.
                      </p>
                    </div>
                  )}

                  <Row align="center" justify="between" className="gap-4">
                    <p className="text-caption text-muted-foreground">
                      {query.data?.weekStartedAt ? `Week started ${new Date(query.data.weekStartedAt).toLocaleDateString()}` : 'Current week'}
                    </p>
                    <Link to="/settings/invites" className="text-label-lg text-muted-foreground hover:text-foreground">
                      Manage invites <span aria-hidden="true">→</span>
                    </Link>
                  </Row>
                </Stack>
              )}
            </main>
          </Col>
        </Columns>
      </div>
    </>
  )
}
