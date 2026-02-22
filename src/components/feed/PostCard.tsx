/**
 * PostCard Component
 * Displays a post in the feed with media, caption, and actions
 */

import { Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { PostMedia, type MediaType } from './PostMedia'
import type { CarouselAsset } from './MediaCarousel'
import { CollectButton } from './CollectButton'
import { BuyButton } from './BuyButton'
import { LikeButton } from './LikeButton'
import { CommentButton } from './CommentButton'
import { PostCardMenu } from './PostCardMenu'
import { PriceTooltip } from './PriceTooltip'
import { useCommentCount } from '@/hooks/useComments'
import { useCreateReport } from '@/hooks/useReports'
import { dmEligibilityQueryKey } from '@/hooks/useDmEligibility'
import { useState, useEffect } from 'react'
import { getPostDisplayState, getEditionLabel, POST_TYPE_COLORS } from './postDisplay'
import { POST_TYPE_META } from '@/constants/postTypes'
import { type Category, isPresetCategory, categoryToSlug } from '@/constants/categories'
import { CategoryPill } from '@/components/ui/category-pill'
import { MediaPill } from '@/components/ui/media-pill'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { TokenText } from '@/components/shared/TokenText'
import { Icon } from '@/components/ui/icon'

// Format relative time
function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const then = new Date(date)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)
  
  if (seconds < 60) return 'now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w`
  
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Detect media type from URL
function detectMediaType(url: string): MediaType {
  const extension = url.split('.').pop()?.toLowerCase()?.split('?')[0]
  
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(extension || '')) {
    return 'image'
  }
  if (['mp4', 'webm', 'mov'].includes(extension || '')) {
    return 'video'
  }
  if (['mp3', 'wav', 'ogg', 'aac'].includes(extension || '')) {
    return 'audio'
  }
  if (['pdf', 'zip'].includes(extension || '')) {
    return 'document'
  }
  if (['glb', 'gltf'].includes(extension || '')) {
    return '3d'
  }
  
  return 'image'
}

// Compute a compact time label for timed edition price pills
function getMintTimeLabel(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
): string | null {
  if (!start && !end) return null
  const now = new Date()
  const startDate = start ? new Date(start) : null
  const endDate = end ? new Date(end) : null

  // Not started yet → show scheduled date
  if (startDate && now < startDate) {
    return startDate.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    }) + ' @ ' + startDate.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit',
    })
  }

  // Active → show time remaining
  if (endDate && now < endDate) {
    const ms = endDate.getTime() - now.getTime()
    const totalMin = Math.floor(ms / 60000)
    if (totalMin < 60) return `${totalMin}m left`
    const hours = Math.floor(totalMin / 60)
    if (hours < 24) return `${hours}h ${totalMin % 60}m left`
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h left`
  }

  // Ended
  return null
}

export interface PostCardUser {
  id: string
  displayName: string | null
  usernameSlug: string
  avatarUrl: string | null
}

export interface PostCardData {
  id: string
  type: 'post' | 'collectible' | 'edition'
  mediaUrl: string
  coverUrl?: string | null
  caption: string | null
  categories?: (string | Category)[] | null
  price?: number | null
  currency?: 'SOL' | 'USDC' | null
  maxSupply?: number | null
  currentSupply?: number
  collectCount?: number
  createdAt: Date | string
  user?: PostCardUser
  /** Optional flags for profile contexts */
  isCollected?: boolean
  isEdition?: boolean
  remainingSupply?: number | null
  /** Metadata URL for NFT metadata JSON (collectible/edition posts) */
  metadataUrl?: string | null
  /** Master mint address for editions (links to master edition on Orb) */
  masterMint?: string | null
  /** First assetId for collectibles (links to first minted collectible on Orb) */
  collectibleAssetId?: string | null
  /** Asset ID from postAssets table (for protected downloads) */
  assetId?: string | null
  /** Whether the post is hidden (only visible to moderators/admins) */
  isHidden?: boolean
  /** User's nftMint for editions they own (for Orb link to their specific NFT) */
  userNftMint?: string | null
  /** Creator royalty in basis points (0-1000 = 0-10%) */
  sellerFeeBasisPoints?: number | null
  /** Multi-asset support: array of carousel assets */
  assets?: CarouselAsset[]
  /** Downloadable assets (audio, documents, 3D) for download menu */
  downloadableAssets?: Array<{
    id: string
    url: string
    mimeType: string | null
    fileSize: number | null
    sortOrder: number
  }>
  /** Timed edition: when the mint window opens */
  mintWindowStart?: Date | string | null
  /** Timed edition: when the mint window closes */
  mintWindowEnd?: Date | string | null
}

interface PostCardProps {
  post: PostCardData
  user?: PostCardUser
  /** Max aspect ratio for media (height/width). E.g., 1.25 = 4:5 portrait max. */
  maxMediaAspectRatio?: number
  /** Current authenticated user's ID (for collect functionality) */
  currentUserId?: string | null
  showHeader?: boolean
  showActions?: boolean
  isAuthenticated?: boolean
  onCollect?: () => void
  onBuy?: () => void
  /** Callback when collect count changes */
  onCollectCountChange?: (count: number) => void
  className?: string
  /** If true, removes rounded corners and border from media (useful for preview modals) */
  noBorder?: boolean
  /** If true, disables all interactions (links, buttons, clicks) - useful for preview mode */
  isPreview?: boolean
}

export function PostCard({
  post,
  user: propUser,
  maxMediaAspectRatio,
  currentUserId,
  showHeader = true,
  showActions = true,
  isAuthenticated = false,
  onCollect,
  onBuy,
  onCollectCountChange,
  className,
  noBorder = false,
  isPreview = false,
}: PostCardProps) {
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false)
  const [localCollectCount, setLocalCollectCount] = useState(post.collectCount ?? 0)
  const [localEditionSupply, setLocalEditionSupply] = useState(post.currentSupply ?? 0)
  const [localIsOwned, setLocalIsOwned] = useState(!!post.isCollected)
  
  // Get comment count
  const { data: commentCount } = useCommentCount(post.id)

  // Report mutation
  const createReportMutation = useCreateReport()

  // Query client for eligibility invalidation
  const queryClient = useQueryClient()

  // Check if current user is moderator/admin (for showing hidden badge)
  const { user: currentUser } = useCurrentUser()
  const isModeratorOrAdmin = currentUser?.role === 'moderator' || currentUser?.role === 'admin'
  
  // Sync local state with prop updates (from polling)
  useEffect(() => {
    if (post.collectCount !== undefined && post.collectCount !== localCollectCount) {
      setLocalCollectCount(post.collectCount)
    }
  }, [post.collectCount])
  
  useEffect(() => {
    if (post.currentSupply !== undefined && post.currentSupply !== localEditionSupply) {
      setLocalEditionSupply(post.currentSupply)
    }
  }, [post.currentSupply])
  
  const user = propUser || post.user
  const mediaType = detectMediaType(post.mediaUrl)
  const computedPost = {
    ...post,
    isCollected: post.isCollected || localIsOwned,
  }
  const display = getPostDisplayState(computedPost, {
    localCollectCount,
    localEditionSupply,
  })

  // Time-aware pill text for timed editions
  const mintTimeLabel = post.type === 'edition'
    ? getMintTimeLabel(post.mintWindowStart, post.mintWindowEnd)
    : null
  const isScheduled = !!(post.mintWindowStart && new Date(post.mintWindowStart) > new Date())
  // For active timed editions: "53m left · 0.10 SOL"
  // For scheduled: "Starts Feb 22, 2026 @ 5:30PM"
  const timedPillText = mintTimeLabel
    ? isScheduled
      ? display.overlayPillText
        ? `Starts ${mintTimeLabel} · ${display.overlayPillText.replace(/^✓\s*/, '')}`
        : `Starts ${mintTimeLabel}`
      : display.overlayPillText
        ? `${mintTimeLabel} · ${display.overlayPillText.replace(/^✓\s*/, '')}`
        : mintTimeLabel
    : null

  // Handle collect success - update local count and invalidate DM eligibility
  const handleCollectSuccess = () => {
    const newCount = localCollectCount + 1
    setLocalCollectCount(newCount)
    setLocalIsOwned(true)
    onCollectCountChange?.(newCount)
    onCollect?.()

    // Invalidate DM eligibility for this creator (they may now be messageable)
    const creatorId = user?.id
    if (creatorId) {
      queryClient.invalidateQueries({ queryKey: dmEligibilityQueryKey(creatorId) })
    }
  }

  // Handle buy success - update local count and invalidate DM eligibility
  const handleBuySuccess = () => {
    const next = (localEditionSupply || 0) + 1
    setLocalEditionSupply(next)
    setLocalIsOwned(true)
    onBuy?.()

    // Invalidate DM eligibility for this creator (they may now be messageable)
    const creatorId = user?.id
    if (creatorId) {
      queryClient.invalidateQueries({ queryKey: dmEligibilityQueryKey(creatorId) })
    }
  }

  // Handle report submission
  const handleReportSubmit = (reasons: string[], details?: string) => {
    if (!currentUserId) {
      return
    }
    
    createReportMutation.mutate({
      contentType: 'post',
      contentId: post.id,
      reasons,
      details: details || null,
    })
  }

  // Caption truncation
  const maxCaptionLength = 150
  const isLongCaption = (post.caption?.length || 0) > maxCaptionLength
  const displayCaption = isCaptionExpanded || !isLongCaption
    ? post.caption
    : post.caption?.slice(0, maxCaptionLength)
  
  // Type badge info
  const typeMeta = POST_TYPE_META[post.type]
  const typeBadge =
    post.type === 'post'
      ? null
      : {
          icon: post.type === 'edition' && post.maxSupply === 1
            ? 'fa-hexagon-image'
            : typeMeta.icon,
          label:
            post.type === 'edition'
              ? getEditionLabel(post.maxSupply)
              : typeMeta.label,
          color: typeMeta.badgeClass,
          solid: typeMeta.iconStyle === 'solid',
        }

  const showActionButtons = showActions && post.type !== 'post' && !isPreview
  const postTypeColor = POST_TYPE_COLORS[post.type]

  return (
    <article className={cn('rounded-lg group', isPreview ? '' : 'mx-4 md:mx-0', className)}>
      {/* Header */}
      {showHeader && user && (
        <div className="flex items-center gap-3 px-4 py-2 md:px-2 md:py-3">
          {isPreview ? (
            <div className="w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName || user.usernameSlug}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <Icon name="user" variant="regular" className="text-muted-foreground" />
                </div>
              )}
            </div>
          ) : (
            <Link to="/profile/$slug" params={{ slug: user.usernameSlug }}>
              <div className="w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName || user.usernameSlug}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Icon name="user" variant="regular" className="text-muted-foreground" />
                  </div>
                )}
              </div>
            </Link>
          )}
          
          <div className="flex-1 min-w-0">
            {isPreview ? (
              <span className="font-semibold text-sm truncate block">
                {user.displayName || `@${user.usernameSlug}`}
              </span>
            ) : (
              <Link 
                to="/profile/$slug" 
                params={{ slug: user.usernameSlug }}
                className="font-semibold text-sm hover:underline truncate block"
              >
                {user.displayName || `@${user.usernameSlug}`}
              </Link>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>@{user.usernameSlug}</span>
              <span>·</span>
              <span>{formatRelativeTime(post.createdAt)}</span>
              {typeBadge && (
                <>
                  <span>·</span>
                  <span className={cn('flex items-center gap-1', typeBadge.color)}>
                    <Icon name={typeBadge.icon} variant={typeBadge.solid ? "solid" : "regular"} className="text-[10px]" />
                    {typeBadge.label}
                  </span>
                </>
              )}
              {isModeratorOrAdmin && (post.isHidden === true) && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-destructive">
                    <Icon name="eye-slash" variant="regular" className="text-[10px]" />
                    Hidden
                  </span>
                </>
              )}
            </div>
          </div>

          {!isPreview && (
            <PostCardMenu
              postId={post.id}
              isOwner={currentUserId !== undefined && currentUserId !== null && user?.id === currentUserId}
              userId={currentUserId || undefined}
              postType={post.type}
              hasCollects={post.type === 'collectible' && (localCollectCount > 0 || (post.collectCount ?? 0) > 0)}
              hasPurchases={post.type === 'edition' && (localEditionSupply > 0 || (post.currentSupply ?? 0) > 0)}
              metadataUrl={post.metadataUrl}
              masterMint={post.masterMint}
              collectibleAssetId={post.collectibleAssetId}
              userNftMint={post.userNftMint}
              postUser={user}
              postCaption={post.caption}
              postMediaUrl={post.mediaUrl}
              onReportSubmit={isAuthenticated && currentUserId ? handleReportSubmit : undefined}
              mediaType={mediaType}
              hasDownloadAccess={computedPost.isCollected || post.type === 'post'}
              assetId={post.assetId}
              mediaUrl={post.mediaUrl}
              downloadableAssets={post.downloadableAssets}
            />
          )}
        </div>
      )}
      
      {/* Media - Full bleed on mobile */}
      <div className="relative -mx-4 md:mx-0">
        <PostMedia
          mediaUrl={post.mediaUrl}
          coverUrl={post.coverUrl}
          mediaType={mediaType}
          alt={post.caption || 'Post media'}
          aspectRatio="auto"
          price={post.price ?? null}
          currency={post.currency ?? null}
          hasAccess={computedPost.isCollected || post.type === 'post'}
          postType={post.type}
          assetId={post.assetId}
          noBorder={noBorder}
          maxAspectRatio={maxMediaAspectRatio ?? (isPreview ? undefined : 1.25)}
          sellerFeeBasisPoints={post.sellerFeeBasisPoints}
          statusPillText={(mediaType === 'document' || mediaType === '3d') ? display.statusPillText : undefined}
          statusPillColor={postTypeColor}
          assets={post.assets}
        />

        {(showActionButtons || display.overlayPillText || timedPillText || display.statusPillText) && (
          <div className="absolute inset-0 pointer-events-none z-20">
            <div className="absolute right-7 top-3 md:right-3 md:top-3 pointer-events-auto flex items-center gap-1.5">
              {/* Status pill (Sold, Sold Out) - NOT shown for document/3D (PostMedia handles it) */}
              {display.statusPillText && mediaType !== 'document' && mediaType !== '3d' && (
                <MediaPill variant="tone" toneColor={postTypeColor}>
                  {display.statusPillText}
                </MediaPill>
              )}
              {/* Price/time pill - hide for PDF/3D since PostMedia shows it */}
              {(timedPillText || display.overlayPillText) && mediaType !== 'document' && mediaType !== '3d' && (
                <>
                  {/* Wrap edition price pills with tooltip for breakdown (web only) */}
                  {display.overlayPillVariant === 'edition' && post.price && post.currency && !isScheduled ? (
                    <PriceTooltip
                      price={post.price}
                      currency={post.currency}
                      sellerFeeBasisPoints={post.sellerFeeBasisPoints}
                    >
                      <MediaPill variant="dark" className="cursor-default">
                        {timedPillText || display.overlayPillText?.replace(/^✓\s*/, '')}
                      </MediaPill>
                    </PriceTooltip>
                  ) : (
                    <MediaPill
                      variant={
                        display.overlayPillVariant === 'edition' || timedPillText ? 'dark' :
                        display.overlayPillVariant === 'soldOut' ? 'muted' : 'tone'
                      }
                      toneColor={
                        display.overlayPillVariant === 'collectible'
                          ? POST_TYPE_META.collectible.tone
                          : display.overlayPillVariant === 'likes'
                            ? 'var(--tone-standard)'
                            : undefined
                      }
                      className={display.overlayPillVariant === 'likes' ? 'text-xs' : undefined}
                    >
                      {timedPillText || display.overlayPillText?.replace(/^✓\s*/, '')}
                    </MediaPill>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Actions & Info */}
      {(post.caption || (post.categories && post.categories.length > 0) || !isPreview) && (
        <div className={cn('px-4 md:px-2 space-y-2', isPreview ? 'pt-3 pb-0' : 'py-2 md:py-3')}>
          {/* Action Buttons Row */}
          {!isPreview && (
          <div className="flex items-center justify-between gap-0.5">
            <div className="flex items-center gap-0.5">
              <LikeButton
                postId={post.id}
                userId={currentUserId || undefined}
                isAuthenticated={isAuthenticated}
                variant="ghost"
                showCount={true}
              />
              <CommentButton
                postId={post.id}
                variant="ghost"
                showCount={true}
              />
            </div>
          
          {/* Collect/Buy Button */}
          {/* Gate on both isAuthenticated AND currentUserId to prevent flash */}
          {/* If authenticated but no userId yet, show nothing (user still loading) */}
          {showActionButtons && isAuthenticated && currentUserId ? (
            <div className="flex items-center">
              {post.type === 'collectible' && (
                <CollectButton
                  postId={post.id}
                  userId={currentUserId}
                  isAuthenticated={isAuthenticated}
                  currentCollectCount={localCollectCount}
                  onCollectSuccess={handleCollectSuccess}
                  onCollected={() => setLocalIsOwned(true)}
                  variant="ghost"
                  compact
                  toneColor={postTypeColor}
                />
              )}

              {post.type === 'edition' && post.price && post.currency && (
                <BuyButton
                  postId={post.id}
                  userId={currentUserId}
                  price={post.price}
                  currency={post.currency}
                  maxSupply={post.maxSupply}
                  currentSupply={localEditionSupply}
                  isAuthenticated={isAuthenticated}
                  onSuccess={handleBuySuccess}
                  onPurchased={() => setLocalIsOwned(true)}
                  variant="ghost"
                  compact
                  toneColor={postTypeColor}
                  isCollected={computedPost.isCollected}
                  isSoldOut={typeof post.maxSupply === 'number' && (localEditionSupply ?? 0) >= post.maxSupply}
                  mintWindowStart={post.mintWindowStart}
                  mintWindowEnd={post.mintWindowEnd}
                />
              )}
            </div>
          ) : showActionButtons && !isAuthenticated && (
            // Show count for unauthenticated users only (not during user loading)
            <div className="flex items-center gap-1 text-muted-foreground px-2">
              {post.type === 'collectible' && localCollectCount > 0 && (
                <>
                  <Icon name="gem" variant="regular" className="text-base" />
                  <span className="text-sm font-medium">{localCollectCount}</span>
                </>
              )}
              {post.type === 'edition' && (localEditionSupply ?? 0) > 0 && (
                <>
                  <Icon name="gem" variant="regular" className="text-base" />
                  <span className="text-sm font-medium">{localEditionSupply}</span>
                </>
              )}
            </div>
          )}
          </div>
        )}

        {/* Caption */}
        {post.caption && user && (
          <div className={cn("text-sm leading-relaxed text-foreground whitespace-pre-wrap", isPreview && "pb-4")}>
            <Link
              to="/profile/$slug"
              params={{ slug: user.usernameSlug }}
              className="font-semibold hover:underline mr-2"
            >
              {user.displayName || user.usernameSlug}
            </Link>
            <span className="text-foreground/90">
              <TokenText text={displayCaption || ''} />
              {isLongCaption && !isCaptionExpanded && '... '}
            </span>
            {isLongCaption && !isCaptionExpanded && (
              <span
                onClick={() => setIsCaptionExpanded(true)}
                className="text-muted-foreground ml-1 cursor-pointer no-hover-bg"
              >
                more
              </span>
            )}
          </div>
        )}

        {/* Comment Count */}
        {commentCount !== undefined && commentCount > 0 && (
          isPreview ? (
            <span className="text-sm text-muted-foreground">
              {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
            </span>
          ) : (
            <Link
              to="/post/$postId"
              params={{ postId: post.id }}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              View {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
            </Link>
          )
        )}

        {/* Categories - Preset categories link, legacy categories display only */}
        {post.categories && post.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {post.categories.map((category) => {
              const displayText = typeof category === 'string' ? category : category.display
              const key = typeof category === 'string' ? category : category.key
              const isPreset = isPresetCategory(displayText)
              const slug = categoryToSlug(displayText)

              if (isPreset) {
                // Preset category - render as link
                return (
                  <CategoryPill key={key} variant="link" asChild>
                    <Link to="/category/$categorySlug" params={{ categorySlug: slug }}>
                      {displayText}
                    </Link>
                  </CategoryPill>
                )
              }

              // Legacy custom category - display only
              return (
                <CategoryPill key={key}>{displayText}</CategoryPill>
              )
            })}
          </div>
        )}
        </div>
      )}
    </article>
  )
}

export default PostCard

