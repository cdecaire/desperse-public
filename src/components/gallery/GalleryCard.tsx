/**
 * GalleryCard Component
 * Dense grid tile for gallery/marketplace surfaces (Home, Explore).
 * Media with price/status pill on the art, metadata placard below —
 * the artwork stays unobscured, per the gallery-at-night direction.
 */

import { Link } from '@tanstack/react-router'
import { useRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { PostMedia } from '@/components/feed/PostMedia'
import { PostOverlayPills } from '@/components/feed/PostOverlayPills'
import { usePostOverlayPill } from '@/components/feed/postOverlay'
import { getPrimaryDisplayMedia } from '@/components/feed/postAssets'
import { POST_TYPE_COLORS } from '@/components/feed/postDisplay'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Icon } from '@/components/ui/icon'
import type { PostCardData } from '@/components/feed/PostCard'

export interface GalleryCardProps {
  post: PostCardData
  /** portrait = 4:5 (default, gallery rows); square = 1:1 (dense grids) */
  aspect?: 'portrait' | 'square'
  /** Disable lazy-loading for above-the-fold rows */
  eager?: boolean
  className?: string
}

export function GalleryCard({
  post,
  aspect = 'portrait',
  eager = false,
  className,
}: GalleryCardProps) {
  const displayMedia = getPrimaryDisplayMedia({
    mediaUrl: post.mediaUrl,
    coverUrl: post.coverUrl,
    mediaMimeType: post.downloadableAssets?.[0]?.mimeType,
    assets: post.assets,
  })
  const mediaType = displayMedia.mediaType

  // Pause countdown ticking while the card is off-screen
  const cardRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(true)
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const { display, timedPillText, isScheduled } = usePostOverlayPill(post, { isVisible })

  const user = post.user
  const isLimitedEdition = post.type === 'edition' && typeof post.maxSupply === 'number'

  return (
    <article ref={cardRef} className={cn('group min-w-0', className)}>
      {/* Media frame — the whole frame links to the post */}
      <Link
        to="/post/$postId"
        params={{ postId: post.id }}
        className={cn(
          'relative block overflow-hidden rounded-lg bg-muted',
          aspect === 'square' ? 'aspect-square' : 'aspect-4/5'
        )}
      >
        <div className="w-full h-full overflow-hidden [&_img]:object-cover [&_img]:w-full [&_img]:h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full">
          <div className="w-full h-full transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
            <PostMedia
              mediaUrl={displayMedia.mediaUrl}
              coverUrl={displayMedia.coverUrl}
              mediaType={mediaType}
              alt={post.caption || 'Post media'}
              aspectRatio={aspect === 'square' ? 'square' : 'auto'}
              lazy={!eager}
              preview
              hasAccess={!!post.isCollected || post.type === 'post'}
              postType={post.type}
              // Document/3D pills render inside PostMedia (PostOverlayPills
              // suppresses them for those types) — mirror PostCard's props
              price={post.price ?? null}
              currency={post.currency ?? null}
              sellerFeeBasisPoints={post.sellerFeeBasisPoints}
              statusPillText={(mediaType === 'document' || mediaType === '3d') ? display.statusPillText : undefined}
              statusPillColor={POST_TYPE_COLORS[post.type]}
              className={cn('rounded-none! border-0! bg-transparent!', aspect === 'portrait' && 'h-full')}
            />
          </div>
        </div>
        <PostOverlayPills
          display={display}
          timedPillText={timedPillText}
          isScheduled={isScheduled}
          mediaType={mediaType}
          postType={post.type}
          price={post.price}
          currency={post.currency}
          sellerFeeBasisPoints={post.sellerFeeBasisPoints}
          position="grid"
        />
      </Link>

      {/* Metadata placard below the art */}
      <div className="pt-2 space-y-1">
        <Link
          to="/post/$postId"
          params={{ postId: post.id }}
          className="block text-title-sm truncate hover:underline"
        >
          {post.caption || 'Untitled'}
        </Link>
        <div className="flex items-center justify-between gap-2">
          {user ? (
            <Link
              to="/profile/$slug"
              params={{ slug: user.usernameSlug }}
              className="flex items-center gap-1.5 min-w-0 hover:opacity-80 transition-opacity"
            >
              <UserAvatar
                src={user.avatarUrl}
                alt={user.displayName || user.usernameSlug}
                size="xs"
              />
              <span className="text-body-sm text-muted-foreground truncate">
                @{user.usernameSlug}
              </span>
            </Link>
          ) : (
            <span />
          )}

          {/* Supply / collect indicator — economic identity at a glance */}
          {post.type === 'edition' && (
            <span className="flex items-center gap-1 text-body-sm text-muted-foreground shrink-0">
              <Icon
                name={post.maxSupply === 1 ? 'hexagon-image' : 'image-stack'}
                variant="regular"
                className="text-xs"
              />
              {post.currentSupply ?? 0}
              {isLimitedEdition && ` / ${post.maxSupply}`}
            </span>
          )}
          {post.type === 'collectible' && (post.collectCount ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-body-sm text-muted-foreground shrink-0">
              <Icon name="gem" variant="regular" className="text-xs" />
              {post.collectCount}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
