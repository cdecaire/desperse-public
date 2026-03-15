/**
 * Post Detail Page
 * Public page showing a single post with full details
 */

import { createFileRoute, Link, Outlet, useMatchRoute } from '@tanstack/react-router'
import { fetchPostMeta } from '@/server/functions/meta'
import { type ReactNode, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQueryClient } from '@tanstack/react-query'
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
import { MediaPill } from '@/components/ui/media-pill'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'
import { Tooltip } from '@/components/ui/tooltip'
import { MintWindowBadge } from '@/components/feed/MintWindowBadge'
import { useGatedDownload } from '@/hooks/useGatedDownload'
import { getExplorerUrl } from '@/server/functions/preferences'
import { formatRelativeTime } from '@/lib/dates'
import { LICENSE_LABELS } from '@/components/forms/CopyrightFields'
import { usePreferences } from '@/hooks/usePreferences'
import { usePostCollectors, useFollowMutation } from '@/hooks/useProfileQuery'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { detectMediaType } from '@/lib/media'
import { toast } from '@/hooks/use-toast'

const BASE_URL = "https://desperse.com"

export const Route = createFileRoute('/post/$postId')({
  component: PostDetailPage,
  loader: async ({ params }) => {
    try {
      const meta = await (fetchPostMeta as any)({ data: { postId: params.postId } })
      return { meta }
    } catch {
      return { meta: null }
    }
  },
  head: ({ loaderData, params }) => {
    const meta = loaderData?.meta
    const title = meta ? `${meta.title} | Desperse` : "Desperse"
    const description = meta?.description || "Explore creative work on Desperse"
    const ogImage = `${BASE_URL}/api/og/post/${params.postId}`
    const url = `${BASE_URL}/post/${params.postId}`

    return {
      meta: [
        { title },
        { name: "description", content: description },
        // Open Graph
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { property: "og:site_name", content: "Desperse" },
        // Twitter Card
        { name: "twitter:site", content: "@desperseapp" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: ogImage },
      ],
    }
  },
})

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function getMediaLabel(mimeType: string | null | undefined): string {
  if (!mimeType) return 'Unknown'
  if (mimeType.startsWith('image/')) return 'Image'
  if (mimeType.startsWith('video/')) return 'Video'
  if (mimeType.startsWith('audio/')) return 'Audio'
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType === 'model/gltf-binary' || mimeType === 'model/gltf+json') return '3D Model'
  return 'File'
}

function PostDetails({ post, editionSupply, collectCount, showHeading = true, getTokenUrl }: {
  post: any
  editionSupply: number
  collectCount: number
  showHeading?: boolean
  getTokenUrl?: (address: string) => string
}) {
  const isCollectible = post.type === 'collectible'
  const isEdition = post.type === 'edition'
  const isStandard = post.type === 'post'

  const rows: { label: string; value: ReactNode }[] = []

  // Type
  if (isEdition) {
    rows.push({ label: 'Type', value: getEditionLabel(post.maxSupply) })
  } else if (isCollectible) {
    rows.push({ label: 'Type', value: 'Collectible' })
  } else {
    rows.push({ label: 'Type', value: 'Post' })
  }

  // Categories
  if (post.categories && post.categories.length > 0) {
    const cats = post.categories.map((c: any) => typeof c === 'string' ? c : c.display).join(', ')
    rows.push({ label: 'Categories', value: cats })
  }

  // Supply
  if (isCollectible) {
    rows.push({ label: 'Supply', value: `${collectCount} collected` })
  } else if (isEdition) {
    const supplyText = post.maxSupply
      ? `${editionSupply}/${post.maxSupply} Minted`
      : `${editionSupply} Minted`
    rows.push({ label: 'Supply', value: supplyText })
  }

  // Price
  if (isCollectible) {
    rows.push({ label: 'Price', value: 'Free' })
  } else if (isEdition && post.price && post.currency) {
    rows.push({ label: 'Price', value: formatPriceDisplay(post.price, post.currency) })
  }

  // Media type
  const mediaMimeType = (post as any).mediaMimeType
  if (mediaMimeType) {
    rows.push({ label: 'Media', value: getMediaLabel(mediaMimeType) })
  }

  // File size
  const mediaFileSize = (post as any).mediaFileSize
  if (mediaFileSize && typeof mediaFileSize === 'number') {
    rows.push({ label: 'File Size', value: formatFileSize(mediaFileSize) })
  }

  // Storage
  if (!isStandard) {
    const storageType = (post as any).storageType
    rows.push({
      label: 'Storage',
      value: storageType === 'arweave' ? 'Permanent (Arweave)' : 'Centralized',
    })
  }

  // Token Standard
  if (isCollectible) {
    rows.push({ label: 'Token Standard', value: 'Compressed NFT' })
  } else if (isEdition) {
    rows.push({ label: 'Token Standard', value: 'Core' })
  }

  // Rights info from post-level copyright fields
  if (post.copyrightLicense) {
    const licenseLabel = LICENSE_LABELS[post.copyrightLicense] || post.copyrightLicense
    rows.push({
      label: 'License',
      value: post.copyrightStatement ? (
        <Tooltip content={<span className="whitespace-pre-wrap max-w-xs block">{post.copyrightStatement}</span>}>
          <span className="cursor-help border-b border-dotted border-muted-foreground/40">
            {licenseLabel}
          </span>
        </Tooltip>
      ) : licenseLabel,
    })
  }
  if (post.copyrightHolder) {
    rows.push({ label: 'Rights Holder', value: post.copyrightHolder })
  }

  // Token ID
  const tokenAddress = isEdition ? post.masterMint : (post as any).collectibleAssetId
  if (tokenAddress && !isStandard) {
    const tokenUrl = getTokenUrl ? getTokenUrl(tokenAddress) : `https://solscan.io/token/${tokenAddress}`
    rows.push({
      label: 'Token ID',
      value: (
        <a
          href={tokenUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:underline"
        >
          {tokenAddress.slice(0, 4)}...{tokenAddress.slice(-4)}
          <Icon name="arrow-up-right-from-square" variant="regular" className="text-[10px]" />
        </a>
      ),
    })
  }

  if (rows.length === 0) return null

  return (
    <div>
      {showHeading && (
        <div className="py-3 border-b border-border mb-1">
          <span className="text-sm font-medium text-foreground">Details</span>
        </div>
      )}
      <div>
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={cn(
              'flex justify-between py-2.5',
              i < rows.length - 1 && 'border-b border-border',
            )}
          >
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span className="text-sm text-foreground font-medium">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatCollectedDate(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 52) return `${diffWeeks}w ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

function CollectorItem({
  collector,
  currentUserId,
  isAuthenticated,
  getTokenUrl,
}: {
  collector: {
    id: string
    usernameSlug: string
    displayName: string | null
    avatarUrl: string | null
    isFollowingBack: boolean
    collectedAt?: string | null
    txSignature?: string | null
  }
  currentUserId?: string
  isAuthenticated: boolean
  getTokenUrl?: (sig: string) => string
}) {
  const isOwnProfile = currentUserId === collector.id
  const [isFollowing, setIsFollowing] = useState(collector.isFollowingBack)
  const followMutation = useFollowMutation(collector.id, currentUserId || '')

  useEffect(() => {
    setIsFollowing(collector.isFollowingBack)
  }, [collector.isFollowingBack])

  const handleFollowToggle = async () => {
    if (!isAuthenticated || !currentUserId) return
    const newFollowState = !isFollowing
    setIsFollowing(newFollowState)
    try {
      await followMutation.mutateAsync({
        action: newFollowState ? 'follow' : 'unfollow',
      })
      toast.success(newFollowState ? 'Following' : 'Unfollowed')
    } catch (error) {
      setIsFollowing(!newFollowState)
      toast.error(error instanceof Error ? error.message : 'Action failed')
    }
  }

  const txUrl = collector.txSignature && getTokenUrl
    ? getTokenUrl(collector.txSignature)
    : collector.txSignature
      ? `https://solscan.io/tx/${collector.txSignature}`
      : null

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Link
          to="/profile/$slug"
          params={{ slug: collector.usernameSlug }}
          className="size-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0"
        >
          {collector.avatarUrl ? (
            <img
              src={collector.avatarUrl}
              alt={collector.displayName || collector.usernameSlug}
              className="w-full h-full object-cover"
            />
          ) : (
            <Icon name="user" variant="regular" className="text-sm text-muted-foreground" />
          )}
        </Link>
        <div className="flex-1 min-w-0 leading-tight">
          <Link
            to="/profile/$slug"
            params={{ slug: collector.usernameSlug }}
            className="text-sm font-medium truncate block hover:underline"
          >
            {collector.displayName || collector.usernameSlug}
          </Link>
          {collector.collectedAt && txUrl ? (
            <a
              href={txUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground truncate inline-flex items-center gap-1"
            >
              Collected {formatCollectedDate(collector.collectedAt)} · View Tx
              <Icon name="arrow-up-right-from-square" variant="regular" className="text-[9px]" />
            </a>
          ) : collector.collectedAt ? (
            <p className="text-xs text-muted-foreground truncate">
              Collected {formatCollectedDate(collector.collectedAt)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground truncate">
              @{collector.usernameSlug}
            </p>
          )}
        </div>
      </div>
      {isAuthenticated && currentUserId && !isOwnProfile && (
        <Button
          variant={isFollowing ? 'outline' : 'default'}
          className="h-8 w-[76px] px-3 text-xs"
          onClick={handleFollowToggle}
          disabled={followMutation.isPending}
        >
          {followMutation.isPending ? (
            <LoadingSpinner size="sm" />
          ) : isFollowing ? (
            'Unfollow'
          ) : (
            'Follow'
          )}
        </Button>
      )}
    </div>
  )
}

function CollectorsList({
  collectors,
  isLoading,
  currentUserId,
  isAuthenticated,
  getTokenUrl,
}: {
  collectors?: Array<{
    id: string
    usernameSlug: string
    displayName: string | null
    avatarUrl: string | null
    isFollowingBack: boolean
    collectedAt?: string | null
    txSignature?: string | null
  }>
  isLoading: boolean
  currentUserId?: string
  isAuthenticated: boolean
  getTokenUrl?: (sig: string) => string
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (!collectors || collectors.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No collectors yet
      </div>
    )
  }

  return (
    <div className="py-1">
      {collectors.map((collector) => (
        <CollectorItem
          key={collector.id}
          collector={collector}
          currentUserId={currentUserId}
          isAuthenticated={isAuthenticated}
          getTokenUrl={getTokenUrl}
        />
      ))}
    </div>
  )
}

function PostDetailPage() {
  const { postId } = Route.useParams()
  const { isAuthenticated, isReady, login } = useAuth()
  const { user: currentUser, isLoading: isCurrentUserLoading, isAuthInitializing } = useCurrentUser()
  // User state is settled when auth is initialized and user data is loaded
  const isUserReady = !isAuthInitializing && !isCurrentUserLoading
  const matchRoute = useMatchRoute()
  
  // Call all hooks first (hooks must be called unconditionally)
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = usePostQuery({ postId })
  const { downloadProtectedAsset, isAuthenticating: isDownloading } = useGatedDownload()
  const { preferences } = usePreferences()
  
  // Local state for collect count (updated on successful collect)
  const [localCollectCount, setLocalCollectCount] = useState<number | null>(null)
  const [localEditionSupply, setLocalEditionSupply] = useState<number | null>(null)
  const [localIsOwned, setLocalIsOwned] = useState(false)
  const [desktopTab, setDesktopTab] = useState<'comments' | 'details' | 'collectors'>('comments')
  const [mobileTab, setMobileTab] = useState<'comments' | 'details' | 'collectors'>('comments')

  // Fetch collectors for this post (only when tab is active and post is collectible/edition)
  const isCollectibleType = data?.post?.type === 'edition' || data?.post?.type === 'collectible'
  const { data: postCollectors, isLoading: isLoadingCollectors } = usePostCollectors(
    (desktopTab === 'collectors' || mobileTab === 'collectors') && isCollectibleType ? postId : undefined,
    currentUser?.id
  )

  // Sync ownership with fetched data to keep flag consistent
  const initialCollected = data?.post?.isCollected ?? false

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

  // Arweave storage status — minting is paused when unfunded or failed
  const arweaveStatus = (post as any).storageType === 'arweave' ? (post as any).arweaveStatus : undefined
  const isMintingPaused = arweaveStatus === 'unfunded' || arweaveStatus === 'failed'

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

  // Edition buy button label with price (e.g. "Collect 1.00 SOL")
  const buyLabel = post.price && post.currency
    ? `Collect ${formatPriceDisplay(post.price, post.currency)}`
    : 'Collect'

  // Handle collect success
  const handleCollectSuccess = () => {
    setLocalCollectCount(collectCount + 1)
    setLocalIsOwned(true)
    // Refresh post data so menu shows "View on Explorer" with the new NFT mint
    queryClient.invalidateQueries({ queryKey: ['post', post.id] })
  }

  // Handle buy success
  const handleBuySuccess = () => {
    setLocalEditionSupply(editionSupply + 1)
    setLocalIsOwned(true)
    // Refresh post data so menu shows "View on Explorer" with the new NFT mint
    queryClient.invalidateQueries({ queryKey: ['post', post.id] })
  }

  // Shared action buttons component
  // skipBuy: when true, BuyButton is rendered elsewhere (e.g., timed edition dark bar)
  // onCommentClick: when provided, comment button opens sheet instead of linking
  const ActionButtons = ({ className, skipBuy = false, onCommentClick }: { className?: string; skipBuy?: boolean; onCommentClick?: () => void }) => (
    <div className={cn('flex items-center justify-between gap-1', className)}>
      <div className="flex items-center gap-1">
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
          onClick={onCommentClick}
        />
      </div>

      {/* Collect/Buy stats indicator + edition buy shortcut */}
      {post.type !== 'post' && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {post.type === 'collectible' && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 text-muted-foreground">
              {collectCount > 0 && (
                <span className="text-sm font-medium">{collectCount}</span>
              )}
              <span style={isCollected && postTypeColor ? { color: postTypeColor } : undefined}>
                <Icon name="gem" variant={isCollected ? "solid" : "regular"} className="text-base" />
              </span>
            </div>
          )}

          {post.type === 'edition' && post.price && post.currency && !skipBuy && isUserReady && isAuthenticated && currentUser?.id && (
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
              arweaveStatus={arweaveStatus}
            />
          )}

          {/* Arweave minting-paused banner */}
          {isMintingPaused && (
            <div className="px-3 py-2 rounded-lg text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
              {arweaveStatus === 'unfunded'
                ? "This edition's permanent storage needs to be re-funded by the creator."
                : "This edition is experiencing a temporary storage issue. Please try again later."}
            </div>
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
              lazy={false}
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
                {/* Edition/Collectible: Header + action */}
                <div className="px-4 pb-3 pt-3 border-b border-border shrink-0 flex flex-col gap-3">
                  <UserHeader showTypeBadge={false} />

                  {/* Arweave storage issue banner */}
                  {isMintingPaused && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                      <Icon name="circle-info" variant="regular" className="mr-1.5 inline-block" />
                      {arweaveStatus === 'unfunded'
                        ? "This edition's permanent storage needs to be re-funded by the creator. Minting is temporarily paused."
                        : "This edition is experiencing a temporary storage issue. Please try again later."}
                    </div>
                  )}

                  {/* Action area: download if owned + has downloads, collect/buy if not owned */}
                  {showDownload && (
                    <Button onClick={handleDownload} disabled={isDownloading} className="w-full">
                      <Icon name="download" variant="regular" className="mr-2" />
                      {isDownloading ? 'Verifying...' : 'Download'}
                    </Button>
                  )}
                  {!showDownload && !isCollected && !isNoLongerCollectible && isTimedEdition && (
                    <MintWindowBadge
                      mintWindowStart={post.mintWindowStart}
                      mintWindowEnd={post.mintWindowEnd}
                      mintedCount={editionSupply}
                      variant="prominent"
                    />
                  )}
                  {!showDownload && !isCollected && !isNoLongerCollectible && (
                    isUserReady && isAuthenticated && currentUser?.id ? (
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
                          mintWindowStart={post.mintWindowStart}
                          mintWindowEnd={post.mintWindowEnd}
                          arweaveStatus={arweaveStatus}
                          label={buyLabel}
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

                {/* Post info: title + badge, description, action buttons */}
                <div className="px-4 py-3 border-b border-border shrink-0">
                  <span className="font-semibold text-base min-w-0 truncate block">
                    {(post as any).nftName || post.caption?.split('\n')[0] || 'Untitled'}
                  </span>
                  {post.caption && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap wrap-break-word mt-2">
                      {post.caption}
                    </p>
                  )}
                  <ActionButtons skipBuy className="mt-2 -ml-2" />
                </div>

                {/* Segment control: Comments | Details | Collectors */}
                <div className="flex border-b border-border shrink-0" role="tablist">
                  {(['comments', 'details', 'collectors'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={desktopTab === tab}
                      onClick={() => setDesktopTab(tab)}
                      className={cn(
                        'flex-1 py-3 text-sm font-medium transition-colors relative',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                        desktopTab === tab
                          ? 'text-foreground'
                          : 'text-muted-foreground hover:text-foreground/80',
                      )}
                    >
                      <span className="relative inline-flex items-center">
                        {tab === 'comments' ? 'Comments' : tab === 'details' ? 'Details' : 'Collectors'}
                      </span>
                      {desktopTab === tab && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-foreground rounded-full" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Scrollable middle: tab content */}
                <div className="flex-1 overflow-y-auto min-h-0" role="tabpanel">
                  {desktopTab === 'comments' ? (
                    <>
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
                    </>
                  ) : desktopTab === 'details' ? (
                    <div className="px-4 py-3">
                      <PostDetails post={post} editionSupply={editionSupply} collectCount={collectCount} showHeading={false} getTokenUrl={(addr) => getExplorerUrl('token', addr, preferences.explorer)} />
                    </div>
                  ) : (
                    <CollectorsList
                      collectors={postCollectors}
                      isLoading={isLoadingCollectors}
                      currentUserId={currentUser?.id}
                      isAuthenticated={isAuthenticated}
                      getTokenUrl={(sig) => getExplorerUrl('tx', sig, preferences.explorer)}
                    />
                  )}
                </div>

                {/* Fixed footer: Comment input */}
                <div className="border-t border-border shrink-0">
                  {desktopTab === 'comments' && isAuthenticated && (
                    <div className="px-4 py-3">
                      <CommentSection
                        postId={post.id}
                        userId={currentUser?.id || undefined}
                        isAuthenticated={isAuthenticated}
                        variant="input-only"
                      />
                    </div>
                  )}
                  {desktopTab === 'comments' && isReady && !isAuthenticated && (
                    <div className="px-4 py-3">
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
                  <ActionButtons className="mt-2 -ml-2" />
                </div>

                {/* Segment control: Comments | Details */}
                <div className="flex border-b border-border shrink-0" role="tablist">
                  {(['comments', 'details'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={desktopTab === tab}
                      onClick={() => setDesktopTab(tab)}
                      className={cn(
                        'flex-1 py-3 text-sm font-medium transition-colors relative',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                        desktopTab === tab
                          ? 'text-foreground'
                          : 'text-muted-foreground hover:text-foreground/80',
                      )}
                    >
                      <span className="relative inline-flex items-center">
                        {tab === 'comments' ? 'Comments' : 'Details'}
                      </span>
                      {desktopTab === tab && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-foreground rounded-full" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Scrollable middle: tab content */}
                <div className="flex-1 overflow-y-auto min-h-0" role="tabpanel">
                  {desktopTab === 'comments' ? (
                    <>
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
                    </>
                  ) : (
                    <div className="px-4 py-3">
                      <PostDetails post={post} editionSupply={editionSupply} collectCount={collectCount} showHeading={false} getTokenUrl={(addr) => getExplorerUrl('token', addr, preferences.explorer)} />
                    </div>
                  )}
                </div>

                {/* Fixed footer: Comment input */}
                <div className="border-t border-border shrink-0">
                  {desktopTab === 'comments' && isAuthenticated && (
                    <div className="px-4 py-3">
                      <CommentSection
                        postId={post.id}
                        userId={currentUser?.id || undefined}
                        isAuthenticated={isAuthenticated}
                        variant="input-only"
                      />
                    </div>
                  )}
                  {desktopTab === 'comments' && isReady && !isAuthenticated && (
                    <div className="px-4 py-3">
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
        <article className="w-full max-w-2xl">
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
              lazy={false}
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
          <div className="px-4 py-3 md:px-2">
            {isCollectibleOrEdition ? (
              <>
                {/* Action buttons + collect — single section */}
                <div className="pb-4 border-b border-border flex flex-col gap-3">
                  <ActionButtons skipBuy onCommentClick={() => setMobileTab('comments')} />

                  {isMintingPaused && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                      <Icon name="circle-info" variant="regular" className="mr-1.5 inline-block" />
                      {arweaveStatus === 'unfunded'
                        ? "This edition's permanent storage needs to be re-funded by the creator. Minting is temporarily paused."
                        : "This edition is experiencing a temporary storage issue. Please try again later."}
                    </div>
                  )}

                  {/* Download if owned + has downloads, collect/buy if not owned */}
                  {showDownload && (
                    <Button onClick={handleDownload} disabled={isDownloading} className="w-full">
                      <Icon name="download" variant="regular" className="mr-2" />
                      {isDownloading ? 'Verifying...' : 'Download'}
                    </Button>
                  )}
                  {!showDownload && !isCollected && !isNoLongerCollectible && isTimedEdition && (
                    <MintWindowBadge
                      mintWindowStart={post.mintWindowStart}
                      mintWindowEnd={post.mintWindowEnd}
                      mintedCount={editionSupply}
                      variant="prominent"
                    />
                  )}
                  {!showDownload && !isCollected && !isNoLongerCollectible && (
                    isUserReady && isAuthenticated && currentUser?.id ? (
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
                          mintWindowStart={post.mintWindowStart}
                          mintWindowEnd={post.mintWindowEnd}
                          arweaveStatus={arweaveStatus}
                          label={buyLabel}
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
                          initialCollected={isCollected}
                        />
                      ) : null
                    ) : isReady && !isAuthenticated ? (
                      <Button onClick={() => login()} className="w-full">
                        Log in to Collect
                      </Button>
                    ) : null
                  )}
                </div>

                {/* Title + description */}
                <div className="py-4 border-b border-border space-y-2">
                  <span className="font-semibold text-base min-w-0 truncate block">
                    {(post as any).nftName || post.caption?.split('\n')[0] || 'Untitled'}
                  </span>

                  {post.caption && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap wrap-break-word">
                      {post.caption}
                    </p>
                  )}
                </div>

                {/* Segment control: Comments | Details | Collectors */}
                <div className="flex border-b border-border" role="tablist">
                  {(['comments', 'details', 'collectors'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={mobileTab === tab}
                      onClick={() => setMobileTab(tab)}
                      className={cn(
                        'flex-1 py-3 text-sm font-medium transition-colors relative',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                        mobileTab === tab
                          ? 'text-foreground'
                          : 'text-muted-foreground hover:text-foreground/80',
                      )}
                    >
                      <span className="relative inline-flex items-center">
                        {tab === 'comments' ? 'Comments' : tab === 'details' ? 'Details' : 'Collectors'}
                      </span>
                      {mobileTab === tab && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-foreground rounded-full" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                {mobileTab === 'comments' ? (
                  <>
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
                    {isAuthenticated && (
                      <div className="sticky bottom-0 border-t border-border bg-background px-4 pt-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
                        <CommentSection
                          postId={post.id}
                          userId={currentUser?.id || undefined}
                          isAuthenticated={isAuthenticated}
                          variant="input-only"
                        />
                      </div>
                    )}
                    {isReady && !isAuthenticated && (
                      <div className="px-4 py-3">
                        <Button onClick={() => login()} className="w-full">
                          Log in or Sign up
                        </Button>
                      </div>
                    )}
                  </>
                ) : mobileTab === 'details' ? (
                  <div className={isAuthenticated ? 'pb-16' : ''}>
                    <PostDetails post={post} editionSupply={editionSupply} collectCount={collectCount} getTokenUrl={(addr) => getExplorerUrl('token', addr, preferences.explorer)} />
                  </div>
                ) : (
                  <div className={isAuthenticated ? 'pb-16' : ''}>
                    <CollectorsList
                      collectors={postCollectors}
                      isLoading={isLoadingCollectors}
                      currentUserId={currentUser?.id}
                      isAuthenticated={isAuthenticated}
                      getTokenUrl={(sig) => getExplorerUrl('tx', sig, preferences.explorer)}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Standard post: action buttons + caption */}
                <div className="pb-4 border-b border-border space-y-2">
                  <ActionButtons onCommentClick={() => setMobileTab('comments')} />
                  <Caption showAvatar={true} />
                </div>

                {/* Segment control: Comments | Details */}
                <div className="flex border-b border-border" role="tablist">
                  {(['comments', 'details'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={mobileTab === tab}
                      onClick={() => setMobileTab(tab)}
                      className={cn(
                        'flex-1 py-3 text-sm font-medium transition-colors relative',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                        mobileTab === tab
                          ? 'text-foreground'
                          : 'text-muted-foreground hover:text-foreground/80',
                      )}
                    >
                      <span className="relative inline-flex items-center">
                        {tab === 'comments' ? 'Comments' : 'Details'}
                      </span>
                      {mobileTab === tab && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-foreground rounded-full" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                {mobileTab === 'comments' ? (
                  <>
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
                    {isReady && !isAuthenticated && (
                      <div className="px-4 py-3">
                        <Button onClick={() => login()} className="w-full">
                          Log in or Sign up
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className={isAuthenticated ? 'pb-16' : ''}>
                    <PostDetails post={post} editionSupply={editionSupply} collectCount={collectCount} getTokenUrl={(addr) => getExplorerUrl('token', addr, preferences.explorer)} />
                  </div>
                )}
              </>
            )}
          </div>

        </article>

        {/* Fixed comment input — visible on non-comments tabs */}
        {isAuthenticated && mobileTab !== 'comments' && (
          <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-4 pt-3 z-30" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
            <div className="max-w-2xl mx-auto">
              <CommentSection
                postId={post.id}
                userId={currentUser?.id || undefined}
                isAuthenticated={isAuthenticated}
                variant="input-only"
              />
            </div>
          </div>
        )}
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
    <div className="pb-20 lg:pb-0" aria-hidden="true">
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
