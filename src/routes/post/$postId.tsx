/**
 * Post Detail Page
 * Public page showing a single post with full details
 */

import { createFileRoute, Link, Outlet, useMatchRoute, useRouter } from '@tanstack/react-router'
import { fetchPostMeta } from '@/server/functions/meta'
import { type ReactNode, useContext, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQueryClient } from '@tanstack/react-query'
import { usePostQuery } from '@/hooks/usePostQuery'
import { PostMedia } from '@/components/feed/PostMedia'
import { CollectButton } from '@/components/feed/CollectButton'
import { BuyButton } from '@/components/feed/BuyButton'
import { LikeButton } from '@/components/feed/LikeButton'
import { CommentButton } from '@/components/feed/CommentButton'
import { DownloadButton } from '@/components/feed/DownloadButton'
import { CommentSection } from '@/components/feed/CommentSection'
import { PostCardMenu } from '@/components/feed/PostCardMenu'
import { DownloadableAssetsSection } from '@/components/feed/DownloadableAssetsSection'
import { getPrimaryDisplayMedia, type DownloadableAsset } from '@/components/feed/postAssets'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/shared/EmptyState'
import { Logo } from '@/components/shared/Logo'
import { getPostDisplayState, getEditionLabel, POST_TYPE_COLORS, formatPrice as formatPriceDisplay } from '@/components/feed/postDisplay'
import { POST_TYPE_META } from '@/constants/postTypes'
import { MediaPill } from '@/components/ui/media-pill'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'
import { UserAvatarFallback } from '@/components/shared/UserAvatar'
import { Tooltip } from '@/components/ui/tooltip'
import { MintWindowBadge } from '@/components/feed/MintWindowBadge'
import { useGatedDownload } from '@/hooks/useGatedDownload'
import { getExplorerUrl } from '@/lib/user-preferences'
import { formatRelativeTime } from '@/lib/dates'
import { recordDownload } from '@/lib/recordDownload'
import { LICENSE_LABELS } from '@/components/forms/CopyrightFields'
import { usePreferences } from '@/hooks/usePreferences'
import { usePostCollectors, useFollowMutation } from '@/hooks/useProfileQuery'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ContentLoadingSkeleton } from '@/components/shared/ContentLoadingSkeleton'
import { toast } from '@/hooks/use-toast'
import { Description, DescriptionItem, Entity, Note } from '@cdecaire/sable'
import { Row, Stack, Col, Columns, GridOverlay } from '@cdecaire/sable/layout'
import { GridOverlayContext } from '@/components/layout/GridOverlayContext'
import { buildOgMeta } from '@/lib/og-meta'
import { publicPostQueryOptions } from '@/lib/post-query'

const BASE_URL = "https://desperse.com"

export const Route = createFileRoute('/post/$postId')({
  component: PostDetailPage,
  loader: async ({ context, params }) => {
    const [meta] = await Promise.all([
      (fetchPostMeta as any)({ data: { postId: params.postId } }).catch(() => null),
      context.queryClient.ensureQueryData(publicPostQueryOptions(params.postId)).catch(() => null),
    ])
    return { meta }
  },
  head: ({ loaderData, params }) => {
    const meta = loaderData?.meta
    const title = meta ? `${meta.title} | Desperse` : "Desperse"
    const description = meta?.description || "Explore creative work on Desperse"
    const ogImage = `${BASE_URL}/api/og/post/${params.postId}`
    const url = `${BASE_URL}/post/${params.postId}`

    return { meta: buildOgMeta({ title, description, image: ogImage, url, type: 'article' }) }
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
          <span className="text-label-lg text-foreground">Details</span>
        </div>
      )}
      <Description cols="1">
        {rows.map((row) => (
          <DescriptionItem key={row.label} term={row.label} detail={row.value} />
        ))}
      </Description>
    </div>
  )
}

function CaptionBlock({ caption, className, muted = false, maxHeight = 'max-h-48' }: { caption: string; className?: string; muted?: boolean; maxHeight?: string }) {
  return (
    <p
      className={cn(
        'text-body-sm whitespace-pre-wrap wrap-break-word overflow-y-auto scrollbar-hide',
        muted ? 'text-muted-foreground' : 'text-foreground',
        maxHeight,
        className,
      )}
    >
      {caption}
    </p>
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
    <Entity
      className="px-4"
      leading={
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
            <UserAvatarFallback seed={collector.id} contained />
          )}
        </Link>
      }
      title={
        <Link
          to="/profile/$slug"
          params={{ slug: collector.usernameSlug }}
          className="truncate block hover:underline"
        >
          {collector.displayName || collector.usernameSlug}
        </Link>
      }
      subtitle={
        collector.collectedAt && txUrl ? (
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
          <span className="text-xs text-muted-foreground truncate">
            Collected {formatCollectedDate(collector.collectedAt)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground truncate">
            @{collector.usernameSlug}
          </span>
        )
      }
      action={
        isAuthenticated && currentUserId && !isOwnProfile ? (
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
        ) : undefined
      }
    />
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
    return <ContentLoadingSkeleton label="Loading collectors" rows={3} variant="compact" />
  }

  if (!collectors || collectors.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-body-sm">
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
  const { isAuthenticated, isReady, login, getAccessToken } = useAuth()
  const { user: currentUser, isLoading: isCurrentUserLoading, isAuthInitializing } = useCurrentUser()
  const matchRoute = useMatchRoute()
  const router = useRouter()
  const showGrid = useContext(GridOverlayContext)

  // Back returns to wherever the user came from (Explore, feed, profile, …).
  // On a direct load (no in-app history) fall back to Explore.
  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.history.back()
    } else {
      router.navigate({ to: '/explore' })
    }
  }

  // Call all hooks first (hooks must be called unconditionally)
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error, isPlaceholderData } = usePostQuery({ postId })
  // Public loader data can paint the destination immediately, but ownership
  // actions wait for the authenticated viewer response to settle.
  const isUserReady = !isAuthInitializing && !isCurrentUserLoading && !isPlaceholderData
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

  const displayMedia = getPrimaryDisplayMedia({
    mediaUrl: post.mediaUrl,
    coverUrl: post.coverUrl,
    mediaMimeType: (post as any).mediaMimeType,
    assets: (post as any).assets,
  })
  const mediaType = displayMedia.mediaType

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
  const downloadableAssets = (post as any).downloadableAssets as DownloadableAsset[] | undefined
  const hasLegacyDownload = mediaType === 'document' || mediaType === '3d'
  const showDownload = isCollected && hasLegacyDownload && !downloadableAssets?.length

  const handleDownload = async () => {
    if (post.type === 'edition' && post.assetId) {
      // Gated download — signature verification
      const downloadUrl = await downloadProtectedAsset(post.assetId)
      if (downloadUrl) {
        window.open(downloadUrl, '_blank')
        recordDownload(post.assetId, await getAccessToken())
      }
    } else if (downloadableAssets && downloadableAssets.length > 0) {
      // Use first downloadable asset
      if (post.type === 'edition') {
        const downloadUrl = await downloadProtectedAsset(downloadableAssets[0].id)
        if (downloadUrl) {
          window.open(downloadUrl, '_blank')
          recordDownload(downloadableAssets[0].id, await getAccessToken())
        }
      } else {
        window.open(downloadableAssets[0].url, '_blank')
        recordDownload(downloadableAssets[0].id, await getAccessToken())
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
    <Row gap={0.5} align="center" justify="between" className={className}>
      <Row gap={0.5} align="center">
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
        <DownloadButton
          postId={post.id}
          postType={post.type}
          assets={downloadableAssets}
          isCollected={isCollected}
          variant="ghost"
          showCount={true}
        />
      </Row>

      {/* Collect/Buy stats indicator + edition buy shortcut */}
      {post.type !== 'post' && (
        <Row gap={1} align="center" className="flex-shrink-0">
          {post.type === 'collectible' && (
            <Row gap={0.75} align="center" className="px-2 py-1.5 text-muted-foreground">
              {collectCount > 0 && (
                <span className="text-label-lg">{collectCount}</span>
              )}
              <span style={isCollected && postTypeColor ? { color: postTypeColor } : undefined}>
                <Icon name="gem" variant={isCollected ? "solid" : "regular"} className="text-base" />
              </span>
            </Row>
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
            <Note variant="warning">
              {arweaveStatus === 'unfunded'
                ? "This edition's permanent storage needs to be re-funded by the creator."
                : "This edition is experiencing a temporary storage issue. Please try again later."}
            </Note>
          )}

          {/* Static supply count when BuyButton is rendered elsewhere */}
          {post.type === 'edition' && skipBuy && (
            <Row gap={0.5} align="center" className="px-2">
              <span className="text-label-lg">
                {post.maxSupply ? `${editionSupply}/${post.maxSupply}` : `${editionSupply}`}
              </span>
              <span style={isCollected ? { color: postTypeColor } : undefined}>
                <Icon
                  name={post.maxSupply === 1 ? 'hexagon-image' : 'image-stack'}
                  className="text-base"
                />
              </span>
            </Row>
          )}
        </Row>
      )}
    </Row>
  )

  // Shared caption component (with avatar — used in mobile standard posts)
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
                <UserAvatarFallback seed={user.id} contained />
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
                className="text-label-lg hover:underline"
              >
                {user.displayName || user.usernameSlug}
              </Link>
            </div>
          )}
          {post.caption && <CaptionBlock caption={post.caption} maxHeight="max-h-[60vh]" />}
        </div>
      </div>
    ) : null
  )


  // Shared tab bar for both desktop and mobile
  const tabs = isCollectibleOrEdition
    ? (['comments', 'details', 'collectors'] as const)
    : (['comments', 'details'] as const)
  const tabLabels: Record<string, string> = { comments: 'Comments', details: 'Details', collectors: 'Collectors' }

  const TabBar = ({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: any) => void }) => (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value)} className="shrink-0">
      <TabsList className="flex w-full">
        {tabs.map((tab) => (
          <TabsTrigger key={tab} value={tab} className="flex-1 justify-center">
            {tabLabels[tab]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )

  // Shared tab content renderer
  const TabContent = ({ activeTab, showHeading = false }: { activeTab: string; showHeading?: boolean }) => (
    <>
      {activeTab === 'comments' ? (
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
            <div className="px-4 py-8 text-center text-muted-foreground text-body-sm">
              Sign in to view and add comments
            </div>
          )}
        </>
      ) : activeTab === 'details' ? (
        <div className="px-4 py-3">
          <PostDetails post={post} editionSupply={editionSupply} collectCount={collectCount} showHeading={showHeading} getTokenUrl={(addr) => getExplorerUrl('token', addr, preferences.explorer)} />
        </div>
      ) : activeTab === 'collectors' ? (
        <CollectorsList
          collectors={postCollectors}
          isLoading={isLoadingCollectors}
          currentUserId={currentUser?.id}
          isAuthenticated={isAuthenticated}
          getTokenUrl={(sig) => getExplorerUrl('tx', sig, preferences.explorer)}
        />
      ) : null}
    </>
  )

  // Shared comment footer (input or login CTA)
  const CommentFooter = ({ activeTab, sticky = false }: { activeTab: string; sticky?: boolean }) => {
    if (activeTab !== 'comments') return null
    return (
      <div className={cn(
        'shrink-0 bg-background',
        // Sticky (mobile, bottom of screen) sits above content → top border.
        // Otherwise it's the composer at the top of the comments → bottom border.
        sticky ? 'sticky bottom-0 border-t border-border' : 'border-b border-border',
      )} style={sticky ? { paddingBottom: 'env(safe-area-inset-bottom, 0px)' } : undefined}>
        {isAuthenticated ? (
          <div className="px-4 py-3">
            <CommentSection
              postId={post.id}
              userId={currentUser?.id || undefined}
              isAuthenticated={isAuthenticated}
              variant="input-only"
            />
          </div>
        ) : isReady ? (
          <div className="px-4 py-3">
            <Button onClick={() => login()} className="w-full">
              Log in or Sign up
            </Button>
          </div>
        ) : null}
      </div>
    )
  }

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
            <UserAvatarFallback seed={user.id} contained />
          )}
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <Link
          to="/profile/$slug"
          params={{ slug: user.usernameSlug }}
          className="text-label-lg hover:underline truncate block"
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
      {/* Desktop (lg+): a page on the Sable grid — image left (sticky), content
          right. No card container; the page scrolls. Capped at region-full so
          media doesn't sprawl on ultra-wide monitors. */}
      <div
        className="relative hidden lg:block mx-auto w-full px-4 xl:px-6 pt-4 pb-16"
        style={{ maxWidth: 'var(--region-full)' }}
      >
        {/* Dev grid overlay (⌘/Ctrl+Shift+G) — aligned to this page's own
            capped grid, since the post page renders outside AppShell's grid. */}
        {showGrid && <GridOverlay inset={false} className="px-4 xl:px-6" />}

        {/* Back — returns to wherever the user came from (Explore, feed,
            profile, …); falls back to Explore on a direct load. */}
        <Button variant="ghost" className="mb-4 w-fit" onClick={handleBack}>
          <Icon name="arrow-left" variant="regular" className="mr-2" />
          Back
        </Button>

        <Columns count={12}>
          {/* Left: media — sticky, framed to the viewport so tall images (and a
              carousel's dots/controls) stay fully visible instead of overflowing. */}
          <Col span={{ lg: 7, xl: 8 }} className="min-w-0 self-stretch">
            <div className="sticky top-4">
              {/* Gallery canvas (mallow-style): the piece floats centered on a
                  subtle padded canvas, capped to the viewport so the whole
                  image — and a carousel's dots/controls — stay visible. The
                  padding also keeps the art off the canvas's rounded corners. */}
              <div className="relative flex h-[calc(100vh-6rem)] items-center justify-center rounded-lg bg-muted/30 p-4 xl:p-8">
                <div className="relative h-full w-full">
                  <PostMedia
                    mediaUrl={displayMedia.mediaUrl}
                    coverUrl={displayMedia.coverUrl}
                    mediaType={displayMedia.mediaType}
                    alt={post.caption || 'Post media'}
                    aspectRatio="auto"
                    lazy={false}
                    noBorder
                    contained
                    price={post.price ?? null}
                    currency={post.currency ?? null}
                    hasAccess={isCollected || post.type === 'post'}
                    postType={post.type}
                    assetId={post.assetId}
                    statusPillText={(mediaType === 'document' || mediaType === '3d') ? display.statusPillText : undefined}
                    statusPillColor={postTypeColor}
                    assets={displayMedia.displayAssets}
                    expandable
                  />
                  <MediaOverlay />
                </div>
              </div>
            </div>
          </Col>

          {/* Right: content — flows with the page (no internal scroll) */}
          <Col span={{ lg: 5, xl: 4 }} className="min-w-0">
            {isCollectibleOrEdition ? (
              <Stack gap={2}>
                <UserHeader showTypeBadge={false} />

                <div className="space-y-2">
                  <span className="text-title-lg block">
                    {(post as any).nftName || post.caption?.split('\n')[0] || 'Untitled'}
                  </span>
                  {post.caption && <CaptionBlock caption={post.caption} muted maxHeight="max-h-[40vh]" />}
                </div>

                {/* Action area: download if owned + has downloads, collect/buy if not owned */}
                <Stack gap={1.5}>
                  {isMintingPaused && (
                    <Note variant="warning">
                      {arweaveStatus === 'unfunded'
                        ? "This edition's permanent storage needs to be re-funded by the creator. Minting is temporarily paused."
                        : "This edition is experiencing a temporary storage issue. Please try again later."}
                    </Note>
                  )}
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

                  <DownloadableAssetsSection
                    assets={downloadableAssets}
                    postType={post.type}
                    isCollected={isCollected}
                  />
                </Stack>

                <ActionButtons skipBuy className="-ml-2" />

                <div>
                  <TabBar activeTab={desktopTab} onTabChange={setDesktopTab} />
                  {/* Composer sits above the list (Reddit-style) so it stays
                      reachable instead of being pushed off-screen by a long
                      thread. */}
                  <CommentFooter activeTab={desktopTab} />
                  <div role="tabpanel" className="pt-1">
                    <TabContent activeTab={desktopTab} />
                  </div>
                </div>
              </Stack>
            ) : (
              <Stack gap={2}>
                <UserHeader />
                {post.caption && <CaptionBlock caption={post.caption} />}

                <div className="space-y-3">
                  <ActionButtons className="-ml-2" />
                  <DownloadableAssetsSection
                    assets={downloadableAssets}
                    postType={post.type}
                    isCollected={isCollected}
                  />
                </div>

                <div>
                  <TabBar activeTab={desktopTab} onTabChange={setDesktopTab} />
                  {/* Composer sits above the list (Reddit-style) so it stays
                      reachable instead of being pushed off-screen by a long
                      thread. */}
                  <CommentFooter activeTab={desktopTab} />
                  <div role="tabpanel" className="pt-1">
                    <TabContent activeTab={desktopTab} />
                  </div>
                </div>
              </Stack>
            )}
          </Col>
        </Columns>
      </div>

      {/* Mobile/Tablet single-column layout (<lg) */}
      <div className="lg:hidden flex justify-center px-0 md:px-3 sm:px-4">
        <article className="w-full" style={{ maxWidth: 'var(--region-feed)' }}>
          {/* Header */}
          <div className="px-4 py-3 md:px-2">
            <UserHeader />
          </div>

          {/* Media - Full bleed on mobile */}
          <div className="relative bg-background mx-0 md:mx-0">
            <PostMedia
              mediaUrl={displayMedia.mediaUrl}
              coverUrl={displayMedia.coverUrl}
              mediaType={displayMedia.mediaType}
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
              assets={displayMedia.displayAssets}
              expandable
            />
            <MediaOverlay />
          </div>

          {/* Content */}
          <div className="px-4 py-3 md:px-2">
            {isCollectibleOrEdition ? (
              <>
                {/* Action buttons + collect — single section */}
                <Stack gap={1.5} className="pb-4 border-b border-border">
                  <ActionButtons skipBuy onCommentClick={() => setMobileTab('comments')} />

                  {isMintingPaused && (
                    <Note variant="warning">
                      {arweaveStatus === 'unfunded'
                        ? "This edition's permanent storage needs to be re-funded by the creator. Minting is temporarily paused."
                        : "This edition is experiencing a temporary storage issue. Please try again later."}
                    </Note>
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

                  <DownloadableAssetsSection
                    assets={downloadableAssets}
                    postType={post.type}
                    isCollected={isCollected}
                  />
                </Stack>

                {/* Title + description */}
                <div className="py-4 border-b border-border space-y-2">
                  <span className="text-title-lg min-w-0 truncate block">
                    {(post as any).nftName || post.caption?.split('\n')[0] || 'Untitled'}
                  </span>
                  {post.caption && <CaptionBlock caption={post.caption} muted maxHeight="max-h-[60vh]" />}
                </div>

                <TabBar activeTab={mobileTab} onTabChange={setMobileTab} />
                <TabContent activeTab={mobileTab} />
                <CommentFooter activeTab={mobileTab} sticky />
              </>
            ) : (
              <>
                {/* Standard post: action buttons + caption */}
                <div className="pb-4 border-b border-border space-y-2">
                  <ActionButtons onCommentClick={() => setMobileTab('comments')} />
                  <DownloadableAssetsSection
                    assets={downloadableAssets}
                    postType={post.type}
                    isCollected={isCollected}
                  />
                  <Caption showAvatar={true} />
                </div>

                <TabBar activeTab={mobileTab} onTabChange={setMobileTab} />
                <TabContent activeTab={mobileTab} />
                <CommentFooter activeTab={mobileTab} sticky />
              </>
            )}
          </div>

        </article>

      </div>

      {/* Login CTA banner for unauthenticated users (mobile only) */}
      {isReady && !isAuthenticated && (
        <div
        className="lg:hidden mx-auto px-4 mt-8"
        style={{ maxWidth: 'var(--region-feed)' }}
      >
          <div className="p-6 bg-card/60 backdrop-blur-sm border border-border rounded-2xl shadow-sm">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="shrink-0">
                <Logo size={40} className="text-foreground" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-semibold">Join Desperse</h3>
                <p className="text-body-sm text-muted-foreground">
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
      {/* Desktop skeleton (lg+): image left + content right on the grid. */}
      <div
        className="hidden lg:block mx-auto w-full px-4 xl:px-6 pt-4 pb-16"
        style={{ maxWidth: 'var(--region-full)' }}
      >
        <Skeleton className="h-9 w-20 rounded-md mb-4" />
        <Columns count={12}>
          <Col span={{ lg: 7, xl: 8 }} className="min-w-0">
            <Skeleton className="w-full h-[calc(100vh-6rem)] rounded-lg" />
          </Col>

          <Col span={{ lg: 5, xl: 4 }} className="min-w-0 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-6 w-2/3" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-11 w-full rounded-md" />
            <div className="space-y-4 pt-2">
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
          </Col>
        </Columns>
      </div>

      {/* Mobile/Tablet single-column skeleton (<lg) */}
      <div className="lg:hidden flex justify-center px-0 md:px-3 sm:px-4">
        <div
          className="w-full overflow-hidden"
          style={{ maxWidth: 'var(--region-feed)' }}
        >
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
