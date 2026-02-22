/**
 * Post Detail Page
 * Public page showing a single post with full details
 */

import { createFileRoute, Link, Outlet, useMatchRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { usePostQuery } from '@/hooks/usePostQuery'
import { PostMedia } from '@/components/feed/PostMedia'
import { CollectButton } from '@/components/feed/CollectButton'
import { BuyButton } from '@/components/feed/BuyButton'
import { LikeButton } from '@/components/feed/LikeButton'
import { CommentButton } from '@/components/feed/CommentButton'
import { CommentSection } from '@/components/feed/CommentSection'
import { PostCardMenu } from '@/components/feed/PostCardMenu'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { Logo } from '@/components/shared/Logo'
import { getPostDisplayState, getEditionLabel, POST_TYPE_COLORS, formatPrice as formatPriceDisplay } from '@/components/feed/postDisplay'
import { POST_TYPE_META } from '@/constants/postTypes'
import { type Category, isPresetCategory, categoryToSlug } from '@/constants/categories'
import { CategoryPill } from '@/components/ui/category-pill'
import { MediaPill } from '@/components/ui/media-pill'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'
import { MintWindowBadge } from '@/components/feed/MintWindowBadge'
import { useGatedDownload } from '@/hooks/useGatedDownload'

export const Route = createFileRoute('/post/$postId')({
  component: PostDetailPage,
})

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
function detectMediaType(url: string): 'image' | 'video' | 'audio' | 'document' | '3d' {
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
  
  return 'image' // Default fallback
}


function PostDetailPage() {
  const { postId } = Route.useParams()
  const { isAuthenticated, isReady, login } = useAuth()
  const { user: currentUser, isLoading: isCurrentUserLoading, isAuthInitializing } = useCurrentUser()
  // User state is settled when auth is initialized and user data is loaded
  const isUserReady = !isAuthInitializing && !isCurrentUserLoading
  const matchRoute = useMatchRoute()
  
  // Call all hooks first (hooks must be called unconditionally)
  const { data, isLoading, isError, error } = usePostQuery({ postId })
  const { downloadProtectedAsset, isAuthenticating: isDownloading } = useGatedDownload()
  
  // Local state for collect count (updated on successful collect)
  const [localCollectCount, setLocalCollectCount] = useState<number | null>(null)
  const [localEditionSupply, setLocalEditionSupply] = useState<number | null>(null)
  const [localIsOwned, setLocalIsOwned] = useState(false)
  
  // Sync ownership with fetched data to keep flag consistent
  const initialCollected =
    (data?.post as unknown as { isCollected?: boolean } | undefined)?.isCollected ?? false

  useEffect(() => {
    if (data?.post) {
      setLocalIsOwned(initialCollected)
    }
  }, [data?.post?.id, initialCollected])
  
  // Check if we're on the edit child route (after all hooks)
  const isEditRoute = matchRoute({ to: '/post/$postId/edit', params: { postId } })
  
  // If we're on a child route, render the outlet for child routes
  // (child routes handle their own loading/error states)
  if (isEditRoute) {
    return <Outlet />
  }
  
  // Loading state - only show skeleton if we don't have data yet
  // This prevents flashing when query key changes (e.g., currentUser loads)
  if (isLoading && !data) {
    return <PostDetailSkeleton />
  }
  
  // Error / Not found state
  if (isError || !data) {
    return (
      <EmptyState
        icon={<Icon name="circle-exclamation" variant="regular" className="text-4xl" />}
        title="This post doesn't exist or was removed"
        description={error?.message || "The post you're looking for is no longer available."}
        action={{ label: 'Go to Feed', to: '/' }}
      />
    )
  }
  
  const { post, user } = data
  
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
  
  // Get current collect count (use local state if available, otherwise from post data)
  const collectCount = localCollectCount ?? post.collectCount ?? 0
  const editionSupply = localEditionSupply ?? post.currentSupply ?? 0
  const isCollected = localIsOwned || initialCollected

  const mediaType = detectMediaType(post.mediaUrl)
  
  const display = getPostDisplayState(
    {
      id: post.id,
      type: post.type,
      mediaUrl: post.mediaUrl,
      caption: post.caption,
      price: post.price,
      currency: post.currency,
      maxSupply: post.maxSupply,
      currentSupply: editionSupply,
      collectCount,
      isCollected,
      coverUrl: post.coverUrl,
      createdAt: post.createdAt,
      user,
    },
    {
      localCollectCount: collectCount,
      localEditionSupply: editionSupply,
    }
  )
  const postTypeColor = POST_TYPE_COLORS[post.type]
  const isTimedEdition = post.type === 'edition' && (post.mintWindowStart || post.mintWindowEnd)
  const isCollectibleOrEdition = post.type === 'edition' || post.type === 'collectible'
  const isSoldOut = post.type === 'edition' && typeof post.maxSupply === 'number' && editionSupply >= post.maxSupply
  const isTimedExpired = isTimedEdition && post.mintWindowEnd && new Date(post.mintWindowEnd) <= new Date()
  const isNoLongerCollectible = isSoldOut || isTimedExpired

  // Download: show download button when user has collected and post has downloadable content
  const downloadableAssets = (post as any).downloadableAssets as Array<{ id: string; url: string; mimeType: string | null }> | undefined
  const hasDownloads = mediaType === 'document' || mediaType === '3d' || (downloadableAssets && downloadableAssets.length > 0)
  const showDownload = isCollected && hasDownloads

  const handleDownload = async () => {
    if (post.type === 'edition' && post.assetId) {
      // Gated download — signature verification
      const downloadUrl = await downloadProtectedAsset(post.assetId)
      if (downloadUrl) window.open(downloadUrl, '_blank')
    } else if (downloadableAssets && downloadableAssets.length > 0) {
      // Use first downloadable asset
      if (post.type === 'edition') {
        const downloadUrl = await downloadProtectedAsset(downloadableAssets[0].id)
        if (downloadUrl) window.open(downloadUrl, '_blank')
      } else {
        window.open(downloadableAssets[0].url, '_blank')
      }
    } else if (post.mediaUrl) {
      window.open(post.mediaUrl, '_blank')
    }
  }

  // Display values for Price/Collected card
  const priceText = post.type === 'collectible'
    ? 'Free'
    : post.price && post.currency
      ? formatPriceDisplay(post.price, post.currency)
      : null
  const collectedText = post.type === 'collectible'
    ? collectCount.toLocaleString()
    : post.maxSupply === 1
      ? `${editionSupply} of 1`
      : post.maxSupply
        ? `${editionSupply}/${post.maxSupply} Minted`
        : `${editionSupply} Minted`

  // Handle collect success
  const handleCollectSuccess = () => {
    setLocalCollectCount(collectCount + 1)
    setLocalIsOwned(true)
  }
  
  // Handle buy success
  const handleBuySuccess = () => {
    setLocalEditionSupply(editionSupply + 1)
    setLocalIsOwned(true)
  }

  // Shared action buttons component
  // skipBuy: when true, BuyButton is rendered elsewhere (e.g., timed edition dark bar)
  const ActionButtons = ({ className, skipBuy = false }: { className?: string; skipBuy?: boolean }) => (
    <div className={cn('flex items-center justify-between gap-0.5', className)}>
      <div className="flex items-center gap-0.5">
        <LikeButton
          postId={post.id}
          userId={currentUser?.id || undefined}
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

      {/* Collect/Buy Button - Gate on user readiness to prevent flash */}
      {post.type !== 'post' && isUserReady && isAuthenticated && currentUser?.id ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          {post.type === 'collectible' && (
            <CollectButton
              postId={post.id}
              userId={currentUser.id}
              isAuthenticated={isAuthenticated}
              currentCollectCount={collectCount}
              onCollectSuccess={handleCollectSuccess}
              onCollected={() => {
                setLocalIsOwned(true)
              }}
              variant="ghost"
              compact
              toneColor={postTypeColor}
            />
          )}

          {post.type === 'edition' && post.price && post.currency && !skipBuy && (
            <BuyButton
              postId={post.id}
              userId={currentUser.id}
              price={post.price}
              currency={post.currency}
              maxSupply={post.maxSupply}
              currentSupply={editionSupply}
              isAuthenticated={isAuthenticated}
              onSuccess={handleBuySuccess}
              onPurchased={() => setLocalIsOwned(true)}
              variant="ghost"
              compact
              toneColor={postTypeColor}
              isCollected={isCollected}
              isSoldOut={typeof post.maxSupply === 'number' && editionSupply >= post.maxSupply}
              mintWindowStart={post.mintWindowStart}
              mintWindowEnd={post.mintWindowEnd}
            />
          )}

          {/* Static supply count when BuyButton is rendered elsewhere */}
          {post.type === 'edition' && skipBuy && (
            <div className="flex items-center gap-1 px-2">
              <span className="text-sm font-medium">
                {post.maxSupply ? `${editionSupply}/${post.maxSupply}` : `${editionSupply}`}
              </span>
              <span style={isCollected ? { color: postTypeColor } : undefined}>
                <Icon
                  name={post.maxSupply === 1 ? 'hexagon-image' : 'image-stack'}
                  className="text-base"
                />
              </span>
            </div>
          )}
        </div>
      ) : post.type !== 'post' && isUserReady && (
        // Show count for unauthenticated users (only when user state is settled)
        <div className="flex items-center gap-1 text-muted-foreground px-2">
          {post.type === 'collectible' && collectCount > 0 && (
            <>
              <Icon name="gem" variant="regular" className="text-base" />
              <span className="text-sm font-medium">{collectCount}</span>
            </>
          )}
          {post.type === 'edition' && editionSupply > 0 && (
            <>
              <Icon name="gem" variant="regular" className="text-base" />
              <span className="text-sm font-medium">{editionSupply}</span>
            </>
          )}
        </div>
      )}
    </div>
  )

  // Shared caption component
  const Caption = ({ showAvatar = true }: { showAvatar?: boolean }) => (
    post.caption ? (
      <div className={cn('flex items-start gap-3', showAvatar ? 'py-2' : 'py-1')}>
        {showAvatar && (
          <Link to="/profile/$slug" params={{ slug: user.usernameSlug }}>
            <div className="w-8 h-8 rounded-full overflow-hidden bg-muted shrink-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName || user.usernameSlug}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Icon name="user" variant="regular" className="text-xs text-muted-foreground" />
                </div>
              )}
            </div>
          </Link>
        )}

        <div className="flex-1 min-w-0">
          {showAvatar && (
            <div className="flex items-center gap-2 mb-1">
              <Link
                to="/profile/$slug"
                params={{ slug: user.usernameSlug }}
                className="font-semibold text-sm hover:underline"
              >
                {user.displayName || user.usernameSlug}
              </Link>
            </div>
          )}
          <p className="text-sm text-foreground whitespace-pre-wrap wrap-break-word">
            {post.caption}
          </p>
        </div>
      </div>
    ) : null
  )

  // Shared categories component
  const Categories = () => (
    post.categories && post.categories.length > 0 ? (
      <div className="flex flex-wrap gap-1.5 pt-2">
        {post.categories.map((category) => {
          const displayText = typeof category === 'string' ? category : (category as Category).display
          const key = typeof category === 'string' ? category : (category as Category).key
          const isPreset = isPresetCategory(displayText)
          const slug = categoryToSlug(displayText)

          if (isPreset) {
            return (
              <CategoryPill key={key} variant="link" asChild>
                <Link to="/category/$categorySlug" params={{ categorySlug: slug }}>
                  {displayText}
                </Link>
              </CategoryPill>
            )
          }

          return <CategoryPill key={key}>{displayText}</CategoryPill>
        })}
      </div>
    ) : null
  )

  // User header component
  const UserHeader = ({ showMenu = true, showTypeBadge = true }: { showMenu?: boolean; showTypeBadge?: boolean }) => (
    <div className="flex items-center gap-3">
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

      <div className="flex-1 min-w-0">
        <Link
          to="/profile/$slug"
          params={{ slug: user.usernameSlug }}
          className="font-semibold text-sm hover:underline truncate block"
        >
          {user.displayName || `@${user.usernameSlug}`}
        </Link>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>@{user.usernameSlug}</span>
          <span>·</span>
          <span>{formatRelativeTime(post.createdAt)}</span>
          {showTypeBadge && typeBadge && (
            <>
              <span>·</span>
              <span className={cn('flex items-center gap-1', typeBadge.color)}>
                <Icon
                  name={typeBadge.icon}
                  variant={typeBadge.solid ? 'solid' : 'regular'}
                  className="text-[10px]"
                />
                {typeBadge.label}
              </span>
            </>
          )}
          {showTypeBadge && post.type === 'edition' && (post.mintWindowStart || post.mintWindowEnd) && (
            <>
              <span>·</span>
              <MintWindowBadge
                mintWindowStart={post.mintWindowStart}
                mintWindowEnd={post.mintWindowEnd}
                mintedCount={editionSupply}
                variant="compact"
              />
            </>
          )}
        </div>
      </div>

      {showMenu && (
        <PostCardMenu
          postId={post.id}
          hideGoToPost
          isOwner={isUserReady && currentUser?.id === user.id}
          userId={currentUser?.id}
          postType={post.type}
          hasCollects={post.type === 'collectible' && collectCount > 0}
          hasPurchases={post.type === 'edition' && editionSupply > 0}
          metadataUrl={post.metadataUrl}
          masterMint={post.masterMint}
          collectibleAssetId={(post as any).collectibleAssetId}
          userNftMint={(post as any).userNftMint}
          mediaType={mediaType}
          hasDownloadAccess={isCollected || post.type === 'post'}
          assetId={post.assetId}
          mediaUrl={post.mediaUrl}
          downloadableAssets={(post as any).downloadableAssets}
        />
      )}
    </div>
  )

  // Media overlay component
  const MediaOverlay = () => (
    (display.overlayPillText || display.statusPillText || display.showCta || ((display.isEdition || display.isCollectible) && isCollected)) ? (
      <div className="absolute inset-0 pointer-events-none z-20">
        {/* Only show overlay pills for non-document/3D types (PostMedia handles those) */}
        {display.statusPillText && mediaType !== 'document' && mediaType !== '3d' && (
          <div className="absolute right-3 top-3 flex items-center gap-1.5">
            <MediaPill variant="tone" toneColor={postTypeColor}>
              {display.statusPillText}
            </MediaPill>
          </div>
        )}
      </div>
    ) : null
  )

  return (
    <div className="pb-20 lg:pb-0">
      {/* Desktop 2-column layout (lg+) */}
      <div className="hidden lg:flex flex-col p-4 h-screen">
        {/* Back button */}
        <Link to="/" className="w-fit">
          <Button variant="ghost" className="mb-4">
            <Icon name="arrow-left" variant="regular" className="mr-2" />
            Back to Feed
          </Button>
        </Link>

        <div className="flex gap-0 w-full flex-1 min-h-0 bg-card border border-border rounded-lg overflow-hidden">
          {/* Left column: Media */}
          <div className="flex-1 bg-black min-w-0 relative overflow-hidden">
            <PostMedia
              mediaUrl={post.mediaUrl}
              coverUrl={post.coverUrl}
              mediaType={mediaType}
              alt={post.caption || 'Post media'}
              aspectRatio="auto"
              price={post.price ?? null}
              currency={post.currency ?? null}
              hasAccess={isCollected || post.type === 'post'}
              postType={post.type}
              assetId={post.assetId}
              noBorder
              contained
              statusPillText={(mediaType === 'document' || mediaType === '3d') ? display.statusPillText : undefined}
              statusPillColor={postTypeColor}
              assets={(post as any).assets}
            />
            <MediaOverlay />
          </div>

          {/* Right column: Info panel */}
          <div className="w-[340px] flex flex-col bg-background border-l border-border shrink-0">
            {isCollectibleOrEdition ? (
              <>
                {/* Edition/Collectible: Header + price/collected + action */}
                <div className="px-4 pb-3 pt-3 border-b border-border shrink-0 flex flex-col gap-3">
                  <UserHeader showTypeBadge={false} />

                  {/* Price / Collected info card */}
                  {priceText && (
                    <div className="bg-muted/30 border border-border rounded-2xl px-[17px] py-[9px]">
                      <div className="flex items-start justify-between text-xs">
                        <div className="flex flex-col flex-1 justify-center">
                          <span className="text-muted-foreground font-medium leading-snug">Price</span>
                          <span className="text-foreground font-semibold leading-tight">
                            {priceText}
                          </span>
                        </div>
                        <div className="flex flex-col flex-1 justify-center">
                          <span className="text-muted-foreground font-medium leading-snug">Collected</span>
                          <span className="text-foreground font-semibold leading-tight">
                            {collectedText}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action area */}
                  {showDownload ? (
                    <Button onClick={handleDownload} disabled={isDownloading} className="w-full">
                      <Icon name="download" variant="regular" className="mr-2" />
                      {isDownloading ? 'Verifying...' : 'Download'}
                    </Button>
                  ) : !isNoLongerCollectible && (
                    isTimedEdition ? (
                      <MintWindowBadge
                        mintWindowStart={post.mintWindowStart}
                        mintWindowEnd={post.mintWindowEnd}
                        mintedCount={editionSupply}
                        variant="dark"
                        action={
                          isUserReady && isAuthenticated && currentUser?.id && post.price && post.currency ? (
                            <BuyButton
                              postId={post.id}
                              userId={currentUser.id}
                              price={post.price}
                              currency={post.currency}
                              maxSupply={post.maxSupply}
                              currentSupply={editionSupply}
                              isAuthenticated={isAuthenticated}
                              onSuccess={handleBuySuccess}
                              onPurchased={() => setLocalIsOwned(true)}
                              variant="default"
                              toneColor={postTypeColor}
                              isCollected={isCollected}
                              isSoldOut={isSoldOut}
                              mintWindowStart={post.mintWindowStart}
                              mintWindowEnd={post.mintWindowEnd}
                              label="Collect"
                              className="!bg-background !text-foreground !rounded-full !px-3.5 !h-8 !text-xs !font-medium"
                            />
                          ) : undefined
                        }
                      />
                    ) : isUserReady && isAuthenticated && currentUser?.id ? (
                      post.type === 'edition' && post.price && post.currency ? (
                        <BuyButton
                          postId={post.id}
                          userId={currentUser.id}
                          price={post.price}
                          currency={post.currency}
                          maxSupply={post.maxSupply}
                          currentSupply={editionSupply}
                          isAuthenticated={isAuthenticated}
                          onSuccess={handleBuySuccess}
                          onPurchased={() => setLocalIsOwned(true)}
                          variant="default"
                          toneColor={postTypeColor}
                          isCollected={isCollected}
                          isSoldOut={isSoldOut}
                          label="Collect"
                          className="w-full"
                        />
                      ) : post.type === 'collectible' ? (
                        <CollectButton
                          postId={post.id}
                          userId={currentUser.id}
                          isAuthenticated={isAuthenticated}
                          currentCollectCount={collectCount}
                          onCollectSuccess={handleCollectSuccess}
                          onCollected={() => setLocalIsOwned(true)}
                          variant="default"
                          className="w-full"
                        />
                      ) : null
                    ) : isReady && !isAuthenticated ? (
                      <Button onClick={() => login()} className="w-full">
                        Log in to Collect
                      </Button>
                    ) : null
                  )}
                </div>

                {/* Post info: title + badge, description, categories */}
                <div className="px-4 py-3 border-b border-border shrink-0">
                  <div className="flex items-center gap-2.5">
                    <span className="flex-1 font-semibold text-sm min-w-0">
                      {(post as any).nftName || post.caption?.split('\n')[0] || 'Untitled'}
                    </span>
                    {typeBadge && (
                      <span
                        className={cn(
                          'shrink-0 text-xs font-medium px-2 py-0.5 rounded-full',
                          POST_TYPE_META[post.type].accentBgClass,
                          POST_TYPE_META[post.type].badgeClass,
                        )}
                      >
                        {typeBadge.label}
                      </span>
                    )}
                  </div>
                  {post.caption && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap wrap-break-word mt-2">
                      {post.caption}
                    </p>
                  )}
                  <Categories />
                </div>

                {/* Scrollable middle: Comments */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  <div className="px-4 pt-3">
                    <span className="text-xs font-semibold text-muted-foreground">Comments</span>
                  </div>
                  {isAuthenticated ? (
                    <CommentSection
                      postId={post.id}
                      userId={currentUser?.id || undefined}
                      isAuthenticated={isAuthenticated}
                      className="px-4"
                      variant="inline"
                    />
                  ) : (
                    <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                      Sign in to view and add comments
                    </div>
                  )}
                </div>

                {/* Fixed footer: Actions + Comment input */}
                <div className="border-t border-border shrink-0">
                  <div className="px-4 py-2">
                    <ActionButtons skipBuy />
                  </div>
                  {isAuthenticated && (
                    <div className="px-4 pb-3">
                      <CommentSection
                        postId={post.id}
                        userId={currentUser?.id || undefined}
                        isAuthenticated={isAuthenticated}
                        variant="input-only"
                      />
                    </div>
                  )}
                  {isReady && !isAuthenticated && (
                    <div className="px-4 pb-3">
                      <Button onClick={() => login()} className="w-full">
                        Log in or Sign up
                      </Button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Standard layout for plain posts */}
                <div className="px-4 py-3 border-b border-border shrink-0">
                  <UserHeader />
                  {post.caption && (
                    <p className="text-sm text-foreground whitespace-pre-wrap wrap-break-word mt-3">
                      {post.caption}
                    </p>
                  )}
                  <Categories />
                </div>

                {/* Scrollable middle: Comments */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  {isAuthenticated ? (
                    <CommentSection
                      postId={post.id}
                      userId={currentUser?.id || undefined}
                      isAuthenticated={isAuthenticated}
                      className="px-4"
                      variant="inline"
                    />
                  ) : (
                    <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                      Sign in to view and add comments
                    </div>
                  )}
                </div>

                {/* Fixed footer: Actions + Comment input */}
                <div className="border-t border-border shrink-0">
                  <div className="px-4 py-2">
                    <ActionButtons />
                  </div>
                  {isAuthenticated && (
                    <div className="px-4 pb-3">
                      <CommentSection
                        postId={post.id}
                        userId={currentUser?.id || undefined}
                        isAuthenticated={isAuthenticated}
                        variant="input-only"
                      />
                    </div>
                  )}
                  {isReady && !isAuthenticated && (
                    <div className="px-4 pb-3">
                      <Button onClick={() => login()} className="w-full">
                        Log in or Sign up
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile/Tablet single-column layout (<lg) */}
      <div className="lg:hidden flex justify-center px-0 md:px-3 sm:px-4">
        <article className="w-full max-w-2xl overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 md:px-2">
            <UserHeader />
          </div>

          {/* Media - Full bleed on mobile */}
          <div className="relative bg-background mx-0 md:mx-0">
            <PostMedia
              mediaUrl={post.mediaUrl}
              coverUrl={post.coverUrl}
              mediaType={mediaType}
              alt={post.caption || 'Post media'}
              aspectRatio="auto"
              className="w-full"
              price={post.price ?? null}
              currency={post.currency ?? null}
              hasAccess={isCollected || post.type === 'post'}
              postType={post.type}
              assetId={post.assetId}
              statusPillText={(mediaType === 'document' || mediaType === '3d') ? display.statusPillText : undefined}
              statusPillColor={postTypeColor}
              assets={(post as any).assets}
            />
            <MediaOverlay />
          </div>

          {/* Content */}
          <div className="px-4 py-3 md:px-2 space-y-4">
            {isCollectibleOrEdition ? (
              <>
                {/* Price / Collected info card */}
                {priceText && (
                  <div className="bg-muted/30 border border-border rounded-2xl px-[17px] py-[9px]">
                    <div className="flex items-start justify-between text-xs">
                      <div className="flex flex-col flex-1 justify-center">
                        <span className="text-muted-foreground font-medium leading-snug">Price</span>
                        <span className="text-foreground font-semibold leading-tight">
                          {priceText}
                        </span>
                      </div>
                      <div className="flex flex-col flex-1 justify-center">
                        <span className="text-muted-foreground font-medium leading-snug">Collected</span>
                        <span className="text-foreground font-semibold leading-tight">
                          {collectedText}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action area */}
                {showDownload ? (
                  <Button onClick={handleDownload} disabled={isDownloading} className="w-full">
                    <Icon name="download" variant="regular" className="mr-2" />
                    {isDownloading ? 'Verifying...' : 'Download'}
                  </Button>
                ) : !isNoLongerCollectible && (
                  isTimedEdition ? (
                    <MintWindowBadge
                      mintWindowStart={post.mintWindowStart}
                      mintWindowEnd={post.mintWindowEnd}
                      mintedCount={editionSupply}
                      variant="dark"
                      action={
                        isUserReady && isAuthenticated && currentUser?.id && post.price && post.currency ? (
                          <BuyButton
                            postId={post.id}
                            userId={currentUser.id}
                            price={post.price}
                            currency={post.currency}
                            maxSupply={post.maxSupply}
                            currentSupply={editionSupply}
                            isAuthenticated={isAuthenticated}
                            onSuccess={handleBuySuccess}
                            onPurchased={() => setLocalIsOwned(true)}
                            variant="default"
                            toneColor={postTypeColor}
                            isCollected={isCollected}
                            isSoldOut={isSoldOut}
                            mintWindowStart={post.mintWindowStart}
                            mintWindowEnd={post.mintWindowEnd}
                            label="Collect"
                            className="!bg-background !text-foreground !rounded-full !px-3.5 !h-8 !text-xs !font-medium"
                          />
                        ) : undefined
                      }
                    />
                  ) : isUserReady && isAuthenticated && currentUser?.id ? (
                    post.type === 'edition' && post.price && post.currency ? (
                      <BuyButton
                        postId={post.id}
                        userId={currentUser.id}
                        price={post.price}
                        currency={post.currency}
                        maxSupply={post.maxSupply}
                        currentSupply={editionSupply}
                        isAuthenticated={isAuthenticated}
                        onSuccess={handleBuySuccess}
                        onPurchased={() => setLocalIsOwned(true)}
                        variant="default"
                        toneColor={postTypeColor}
                        isCollected={isCollected}
                        isSoldOut={isSoldOut}
                        label="Collect"
                        className="w-full"
                      />
                    ) : post.type === 'collectible' ? (
                      <CollectButton
                        postId={post.id}
                        userId={currentUser.id}
                        isAuthenticated={isAuthenticated}
                        currentCollectCount={collectCount}
                        onCollectSuccess={handleCollectSuccess}
                        onCollected={() => setLocalIsOwned(true)}
                        variant="default"
                        className="w-full"
                      />
                    ) : null
                  ) : isReady && !isAuthenticated ? (
                    <Button onClick={() => login()} className="w-full">
                      Log in to Collect
                    </Button>
                  ) : null
                )}

                {/* Title + badge */}
                <div className="flex items-center gap-2.5">
                  <span className="flex-1 font-semibold text-sm min-w-0">
                    {(post as any).nftName || post.caption?.split('\n')[0] || 'Untitled'}
                  </span>
                  {typeBadge && (
                    <span
                      className={cn(
                        'shrink-0 text-xs font-medium px-2 py-0.5 rounded-full',
                        POST_TYPE_META[post.type].accentBgClass,
                        POST_TYPE_META[post.type].badgeClass,
                      )}
                    >
                      {typeBadge.label}
                    </span>
                  )}
                </div>

                {/* Description */}
                {post.caption && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap wrap-break-word">
                    {post.caption}
                  </p>
                )}

                <Categories />
                <ActionButtons skipBuy />
              </>
            ) : (
              <>
                <ActionButtons />
                <Caption showAvatar={true} />
                <Categories />
              </>
            )}

            {/* Comments Section - Only show when authenticated */}
            {isAuthenticated && (
              <CommentSection
                postId={post.id}
                userId={currentUser?.id || undefined}
                isAuthenticated={isAuthenticated}
                className="mt-4"
              />
            )}
          </div>
        </article>
      </div>

      {/* Login CTA banner for unauthenticated users (mobile only) */}
      {isReady && !isAuthenticated && (
        <div className="lg:hidden max-w-2xl mx-auto px-4 mt-8">
          <div className="p-6 bg-card/60 backdrop-blur-sm border border-border rounded-2xl shadow-sm">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="shrink-0">
                <Logo size={40} className="text-foreground" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-semibold">Join Desperse</h3>
                <p className="text-sm text-muted-foreground">
                  Sign in to collect this piece and support the creator.
                </p>
              </div>
              <Button onClick={() => login()}>
                Log in or Sign up
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Loading skeleton for post detail
 */
function PostDetailSkeleton() {
  return (
    <div className="pb-20 lg:pb-0">
      {/* Desktop 2-column skeleton (lg+) */}
      <div className="hidden lg:flex p-4 h-screen">
        <div className="flex gap-0 w-full bg-card border border-border rounded-lg overflow-hidden">
          {/* Left column: Media skeleton */}
          <div className="flex-1 bg-black min-w-0 flex items-center justify-center">
            <Skeleton className="w-3/4 aspect-square rounded-none" />
          </div>

          {/* Right column: Info panel skeleton */}
          <div className="w-[340px] flex flex-col bg-background border-l border-border shrink-0">
            {/* Header skeleton */}
            <div className="px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>

            {/* Comments skeleton */}
            <div className="flex-1 overflow-hidden px-4 py-3 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>

            {/* Footer skeleton */}
            <div className="border-t border-border shrink-0 px-4 py-3 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-16 rounded-full" />
                <Skeleton className="h-8 w-16 rounded-full" />
              </div>
              <Skeleton className="h-11 w-full rounded-md" />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet single-column skeleton (<lg) */}
      <div className="lg:hidden flex justify-center px-0 md:px-3 sm:px-4">
        <div className="w-full max-w-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 md:px-2">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="w-full aspect-square" />
          <div className="px-4 py-3 md:px-2 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    </div>
  )
}
