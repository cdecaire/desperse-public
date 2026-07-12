import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { EmptyState } from '@/components/shared/EmptyState'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useFollowMutation } from '@/hooks/useProfileQuery'
import type { LeaderboardEntry, LeaderboardView } from '@/hooks/useLeaderboardQuery'

function FollowAction({ entry }: { entry: LeaderboardEntry }) {
  const { user } = useCurrentUser()
  const [isFollowing, setIsFollowing] = useState(entry.isFollowing)
  const mutation = useFollowMutation(entry.userId, user?.id ?? '')
  useEffect(() => setIsFollowing(entry.isFollowing), [entry.isFollowing])

  if (!user) {
    return <span className="block h-8 w-24" aria-hidden="true" />
  }
  if (entry.isCurrentUser) {
    return (
      <span
        className="inline-flex h-8 w-24 items-center justify-center text-label-lg text-muted-foreground"
        aria-label="Your account"
      >
        You
      </span>
    )
  }
  const action = isFollowing ? 'unfollow' : 'follow'
  return (
    <Button
      variant={isFollowing ? 'outline' : 'default'}
      className="h-8 w-24 justify-center px-2"
      disabled={mutation.isPending}
      onClick={() => {
        setIsFollowing(!isFollowing)
        mutation.mutate({ action }, { onError: () => setIsFollowing(isFollowing) })
      }}
      aria-label={`${action === 'follow' ? 'Follow' : 'Unfollow'} @${entry.usernameSlug}`}
    >
      {isFollowing ? 'Following' : 'Follow'}
    </Button>
  )
}

function LeaderboardTableHeader({ view }: { view: LeaderboardView }) {
  const isCreators = view === 'creators'
  const headerCellClass = 'bg-muted/50 text-label-xs'

  return (
    <TableHeader className="bg-transparent">
      <TableRow className="hover:bg-transparent">
        <TableHead scope="col" className={`sticky left-0 z-10 px-4 ${headerCellClass}`}>
          {isCreators ? 'Artist' : 'Collector'}
        </TableHead>
        <TableHead scope="col" className={`w-16 text-right ${headerCellClass}`}>Rank</TableHead>
        {isCreators ? (
          <>
            <TableHead scope="col" className={`w-20 text-right ${headerCellClass}`}>Support</TableHead>
            <TableHead scope="col" className={`w-16 text-right ${headerCellClass}`}>Paid</TableHead>
            <TableHead scope="col" className={`w-20 text-right ${headerCellClass}`}>Collects</TableHead>
            <TableHead scope="col" className={`w-16 text-right ${headerCellClass}`}>Likes</TableHead>
            <TableHead scope="col" className={`w-24 text-right ${headerCellClass}`}>Followers</TableHead>
          </>
        ) : (
          <>
            <TableHead scope="col" className={`w-20 text-right ${headerCellClass}`}>Support</TableHead>
            <TableHead scope="col" className={`w-24 text-right ${headerCellClass}`}>Purchases</TableHead>
            <TableHead scope="col" className={`w-20 text-right ${headerCellClass}`}>Collects</TableHead>
            <TableHead scope="col" className={`w-16 text-right ${headerCellClass}`}>Likes</TableHead>
            <TableHead scope="col" className={`w-24 text-right ${headerCellClass}`}>Creators</TableHead>
          </>
        )}
        <TableHead scope="col" className={`w-28 pr-4 text-right ${headerCellClass}`}>
          <span className="sr-only">Actions</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  )
}

export function LeaderboardRow({ entry, view }: { entry: LeaderboardEntry; view: LeaderboardView }) {
  const displayName = entry.displayName || `@${entry.usernameSlug}`
  const isCreators = view === 'creators'
  const hoverCellClass = 'group-hover:bg-muted/50'

  return (
    <TableRow className="group hover:bg-transparent">
      <th scope="row" className={`sticky left-0 z-10 bg-card px-4 py-3 text-left ${hoverCellClass}`}>
        <Link
          to="/profile/$slug"
          params={{ slug: entry.usernameSlug }}
          className="flex min-w-52 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <UserAvatar src={entry.avatarUrl} alt="" seed={entry.usernameSlug} size="lg" />
          <span className="min-w-0">
            <span className="block truncate text-label-lg group-hover:underline">{displayName}</span>
            <span className="block truncate text-caption text-muted-foreground">@{entry.usernameSlug}</span>
          </span>
        </Link>
      </th>
      <TableCell className={`text-right text-mono-md text-muted-foreground ${hoverCellClass}`}>#{entry.rank}</TableCell>
      {isCreators ? (
        <>
          <TableCell className={`text-right text-mono-md ${hoverCellClass}`}>{entry.score.toLocaleString()}</TableCell>
          <TableCell className={`text-right text-mono-md ${hoverCellClass}`}>{entry.paidEditionCount.toLocaleString()}</TableCell>
          <TableCell className={`text-right text-mono-md ${hoverCellClass}`}>{entry.freeCollectCount.toLocaleString()}</TableCell>
          <TableCell className={`text-right text-mono-md ${hoverCellClass}`}>{entry.likeCount.toLocaleString()}</TableCell>
          <TableCell className={`text-right text-mono-md ${hoverCellClass}`}>{entry.newFollowerCount.toLocaleString()}</TableCell>
        </>
      ) : (
        <>
          <TableCell className={`text-right text-mono-md ${hoverCellClass}`}>{entry.score.toLocaleString()}</TableCell>
          <TableCell className={`text-right text-mono-md ${hoverCellClass}`}>{entry.paidEditionCount.toLocaleString()}</TableCell>
          <TableCell className={`text-right text-mono-md ${hoverCellClass}`}>{entry.freeCollectCount.toLocaleString()}</TableCell>
          <TableCell className={`text-right text-mono-md ${hoverCellClass}`}>{entry.likeCount.toLocaleString()}</TableCell>
          <TableCell className={`text-right text-mono-md ${hoverCellClass}`}>{entry.distinctCreatorCount.toLocaleString()}</TableCell>
        </>
      )}
      <TableCell className={`pr-4 text-right ${hoverCellClass}`}><FollowAction entry={entry} /></TableCell>
    </TableRow>
  )
}

function LeaderboardSkeletonRow() {
  const metricCount = 5

  return (
    <TableRow>
      <TableCell className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-muted motion-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-muted motion-pulse" />
            <div className="h-3 w-20 rounded bg-muted motion-pulse" />
          </div>
        </div>
      </TableCell>
      <TableCell><div className="ml-auto h-4 w-8 rounded bg-muted motion-pulse" /></TableCell>
      {Array.from({ length: metricCount }).map((_, index) => (
        <TableCell key={index}><div className="ml-auto h-4 w-10 rounded bg-muted motion-pulse" /></TableCell>
      ))}
      <TableCell className="pr-4"><div className="ml-auto h-8 w-24 rounded-full bg-muted motion-pulse" /></TableCell>
    </TableRow>
  )
}

export function LeaderboardList({ entries, view }: { entries: LeaderboardEntry[]; view: LeaderboardView }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Icon name="ranking-star" variant="regular" className="text-4xl" />}
        title="No rankings yet"
        description={view === 'creators'
          ? 'No creators have qualifying support in this period. Try a longer period.'
          : 'No collectors have qualifying activity in this period. Try a longer period.'}
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <Table className="min-w-[48rem]">
        <LeaderboardTableHeader view={view} />
        <TableBody>{entries.map((entry) => <LeaderboardRow key={entry.userId} entry={entry} view={view} />)}</TableBody>
      </Table>
    </div>
  )
}

export function LeaderboardSkeleton({ view }: { view: LeaderboardView }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card" aria-label="Loading leaderboard">
      <Table className="min-w-[48rem]">
        <LeaderboardTableHeader view={view} />
        <TableBody>
          {Array.from({ length: 10 }).map((_, index) => <LeaderboardSkeletonRow key={index} />)}
        </TableBody>
      </Table>
    </div>
  )
}
