import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { EmptyState } from '@/components/shared/EmptyState'
import { getOptimizedImageUrl } from '@/lib/imageUrl'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useFollowMutation } from '@/hooks/useProfileQuery'
import type { LeaderboardEntry, LeaderboardView } from '@/hooks/useLeaderboardQuery'

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <span className="whitespace-nowrap text-caption text-muted-foreground">
      <strong className="text-mono-md text-foreground">{value.toLocaleString()}</strong> {label}
    </span>
  )
}

function RecentWorkThumbnail({ entry, displayName }: { entry: LeaderboardEntry; displayName: string }) {
  const postId = entry.recentPost?.id
  const coverUrl = entry.recentPost?.coverUrl
  const mediaUrl = entry.recentPost?.mediaUrl
  const [sourceIndex, setSourceIndex] = useState(0)
  useEffect(() => setSourceIndex(0), [postId, coverUrl, mediaUrl])

  const sources: string[] = []
  if (coverUrl) sources.push(coverUrl)
  if (mediaUrl && mediaUrl !== coverUrl) sources.push(mediaUrl)

  if (!entry.recentPost || sourceIndex >= sources.length) {
    return (
      <span className="grid size-12 place-items-center rounded-md bg-muted/50 text-muted-foreground" aria-hidden="true">
        <Icon name="image" variant="regular" />
      </span>
    )
  }

  return (
    <Link
      to="/post/$postId"
      params={{ postId: entry.recentPost.id }}
      className="block size-12 overflow-hidden rounded-md bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      aria-label={`Open recent work by ${displayName}`}
    >
      <img
        src={getOptimizedImageUrl(sources[sourceIndex]!, { width: 320, quality: 75 })}
        alt=""
        className="size-full object-cover"
        loading="lazy"
        decoding="async"
        onError={() => setSourceIndex((index) => index + 1)}
      />
    </Link>
  )
}

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

export function LeaderboardRow({ entry, view }: { entry: LeaderboardEntry; view: LeaderboardView }) {
  const displayName = entry.displayName || `@${entry.usernameSlug}`
  const scoreLabel = view === 'creators' ? 'support score' : 'activated referrals'

  return (
    <li
      value={entry.rank}
      className="grid grid-cols-[2.5rem_minmax(0,1fr)_6rem] items-center gap-3 border-b border-border/70 px-2 py-4 sm:px-4 lg:grid-cols-[3rem_minmax(12rem,1.2fr)_4rem_7rem_minmax(18rem,1.4fr)_6.5rem] lg:gap-5"
      aria-label={`Rank ${entry.rank}, ${displayName}, ${entry.score} ${scoreLabel}`}
    >
      <span className="text-mono-md text-muted-foreground" aria-hidden="true">
        {entry.rank}
      </span>

      <Link
        to="/profile/$slug"
        params={{ slug: entry.usernameSlug }}
        className="group flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
		<UserAvatar src={entry.avatarUrl} alt="" seed={entry.usernameSlug} size="lg" />
        <span className="min-w-0">
          <span className="block truncate text-label-lg group-hover:underline">{displayName}</span>
          <span className="block truncate text-caption text-muted-foreground">@{entry.usernameSlug}</span>
        </span>
      </Link>

      <div className="hidden lg:block">
        {view === 'creators' ? (
          <RecentWorkThumbnail entry={entry} displayName={displayName} />
        ) : (
          <span className="grid size-12 place-items-center rounded-md bg-muted/50 text-muted-foreground" aria-hidden="true">
            <Icon name="users" variant="regular" />
          </span>
        )}
      </div>

      <div className="text-right lg:text-left">
        <span className="block text-mono-md">{entry.score.toLocaleString()}</span>
        <span className="block text-label-xs text-muted-foreground">
          {view === 'creators' ? 'support' : 'activated'}
        </span>
      </div>

      <div className="col-start-2 flex min-w-0 flex-wrap gap-x-4 gap-y-1 lg:col-auto">
        {view === 'creators' ? (
          <>
            <Metric value={entry.paidEditionCount} label="paid" />
            <Metric value={entry.freeCollectCount} label="collects" />
            <Metric value={entry.likeCount} label="likes" />
            <Metric value={entry.newFollowerCount} label="new followers" />
          </>
        ) : (
          <Metric value={entry.activatedReferralCount} label="activated referrals" />
        )}
      </div>

      <div className="col-start-3 row-start-2 w-24 justify-self-end lg:col-auto lg:row-auto">
        <FollowAction entry={entry} />
      </div>
    </li>
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
          : 'No activated referrals were recorded in this period yet.'}
      />
    )
  }
  return <ol className="overflow-hidden rounded-lg border border-border bg-card">{entries.map((entry) => <LeaderboardRow key={entry.userId} entry={entry} view={view} />)}</ol>
}

export function LeaderboardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card" aria-label="Loading leaderboard">
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="grid grid-cols-[2.5rem_1fr_4rem] items-center gap-3 border-b border-border/70 px-4 py-4 last:border-b-0">
          <div className="h-5 w-5 rounded bg-muted motion-pulse" />
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-full bg-muted motion-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-muted motion-pulse" />
              <div className="h-3 w-20 rounded bg-muted motion-pulse" />
            </div>
          </div>
          <div className="h-6 w-12 rounded bg-muted motion-pulse" />
        </div>
      ))}
    </div>
  )
}
