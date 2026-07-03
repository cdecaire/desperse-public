/**
 * CreatorCard Component
 * Grid tile for browse-by-creator sections. Banner + avatar + stats,
 * linking to the creator's profile.
 */

import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { getOptimizedImageUrl } from '@/lib/imageUrl'
import { UserAvatar } from '@/components/shared/UserAvatar'

export interface CreatorCardData {
  id: string
  usernameSlug: string
  displayName: string | null
  avatarUrl: string | null
  headerBgUrl?: string | null
  followerCount: number
  postCount: number
  mintCount: number
}

interface CreatorCardProps {
  creator: CreatorCardData
  className?: string
}

function StatItem({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-0">
      <p className="text-title-sm">{value}</p>
      <p className="text-label-xs text-muted-foreground">{label}</p>
    </div>
  )
}

export function CreatorCard({ creator, className }: CreatorCardProps) {
  return (
    <Link
      to="/profile/$slug"
      params={{ slug: creator.usernameSlug }}
      className={cn(
        'group block overflow-hidden rounded-lg border border-border bg-card',
        'transition-colors hover:bg-accent/50',
        className
      )}
    >
      {/* Banner */}
      <div className="h-20 bg-muted overflow-hidden">
        {creator.headerBgUrl && (
          <img
            src={getOptimizedImageUrl(creator.headerBgUrl, { width: 480, quality: 70 })}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        )}
      </div>

      {/* Identity */}
      <div className="px-4 pb-4">
        <div className="-mt-6 mb-2">
          <UserAvatar
            src={creator.avatarUrl}
            alt={creator.displayName || creator.usernameSlug}
            size="lg"
            className="border-2 border-card rounded-full bg-card"
          />
        </div>
        <p className="text-title-sm truncate">
          {creator.displayName || `@${creator.usernameSlug}`}
        </p>
        <p className="text-body-sm text-muted-foreground truncate">
          @{creator.usernameSlug}
        </p>

        {/* Stats */}
        <div className="flex justify-between gap-2 mt-3 pt-3 border-t border-border">
          <StatItem value={creator.postCount} label="Posts" />
          <StatItem value={creator.mintCount} label="Mints" />
          <StatItem value={creator.followerCount} label="Followers" />
        </div>
      </div>
    </Link>
  )
}
