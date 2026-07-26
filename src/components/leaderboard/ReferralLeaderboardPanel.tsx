import { Link } from '@tanstack/react-router'
import { Row, Stack } from '@cdecaire/sable/layout'

import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { useReferralLeaderboard } from '@/hooks/useReferrals'
import type { ReferralLeaderboardEntry } from '@/lib/referrals'

function ReferralRow({ entry }: { entry: ReferralLeaderboardEntry }) {
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
      ? { title: 'Keep building your referral status', body: `Activate ${status.remainingToQualify} more invite${status.remainingToQualify === 1 ? '' : 's'} to qualify for the referral board.` }
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

/** Weekly referral ranking. Owns `useReferralLeaderboard` so the request only
 * fires while this tab is mounted. */
export function ReferralLeaderboardPanel() {
  const query = useReferralLeaderboard()

  if (query.isLoading) {
    return (
      <Row gap={1.5} align="center" justify="center" className="rounded-lg border border-border bg-card py-16 text-muted-foreground">
        <LoadingSpinner size="sm" />
        <span>Loading this week’s board…</span>
      </Row>
    )
  }

  if (query.error) {
    return (
      <div className="rounded-lg border border-border bg-card px-6 py-12 text-center">
        <Icon name="triangle-exclamation" variant="regular" className="mb-3 text-3xl text-muted-foreground" />
        <h2 className="text-title-lg">Referral board unavailable</h2>
        <p className="mt-2 text-body-sm text-muted-foreground">We couldn’t load the current board.</p>
        <Button variant="outline" className="mt-5" onClick={() => query.refetch()}>Try again</Button>
      </div>
    )
  }

  return (
    <Stack gap={2.5}>
      <StatusCard status={query.data?.currentUserStatus ?? null} />

      {query.data?.entries.length ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {query.data.entries.map((entry) => <ReferralRow key={entry.userId} entry={entry} />)}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card px-6 py-12 text-center">
          <Icon name="ranking-star" variant="regular" className="mb-3 text-4xl text-muted-foreground" />
          <h2 className="text-title-lg">No published rankings yet</h2>
          <p className="mx-auto mt-2 max-w-md text-body-sm text-muted-foreground">
            Eligible referrers will appear after a valid invite activates this week and the board is reviewed.
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
  )
}
