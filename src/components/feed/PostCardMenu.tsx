/**
 * PostCardMenu Component
 * 3-dot menu for post actions (Go to post, Copy link, etc.)
 */

import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'
import { ReportModal } from '@/components/forms/ReportModal'
import { getExplorerUrl } from '@/server/functions/preferences'
import { usePreferences } from '@/hooks/usePreferences'
import { PostCardUser } from './PostCard'
import { useGatedDownload } from '@/hooks/useGatedDownload'
import type { MediaType } from './PostMedia'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface DownloadableAsset {
  id: string
  url: string
  mimeType: string | null
  fileSize: number | null
  sortOrder: number
}

interface PostCardMenuProps {
  postId: string
  className?: string
  /** Hide "Go to post" option (useful on post detail pages) */
  hideGoToPost?: boolean
  /** Show Edit/Delete options (only for post owner) */
  isOwner?: boolean
  /** Current user ID (required for delete action) */
  userId?: string
  /** Post type for delete warning */
  postType?: 'post' | 'collectible' | 'edition'
  /** Whether post has confirmed collects (for delete warning) */
  hasCollects?: boolean
  /** Whether post has confirmed purchases (for delete warning) */
  hasPurchases?: boolean
  /** Metadata URL for NFT metadata JSON (collectible/edition posts) */
  metadataUrl?: string | null
  /** Master mint address for editions (links to master edition on Orb) */
  masterMint?: string | null
  /** First assetId for collectibles (links to first minted collectible on Orb) */
  collectibleAssetId?: string | null
  /** User's nftMint for editions they own (links to their specific NFT on Orb) */
  userNftMint?: string | null
  /** Post user data (for report modal) */
  postUser?: PostCardUser
  /** Post caption (for report modal) */
  postCaption?: string | null
  /** Post media URL (for report modal) */
  postMediaUrl?: string
  /** Callback when report is submitted */
  onReportSubmit?: (reasons: string[], details?: string) => void
  /** Media type (for download option) */
  mediaType?: MediaType
  /** Whether user has access to download (purchased/collected) */
  hasDownloadAccess?: boolean
  /** Asset ID for protected downloads */
  assetId?: string | null
  /** Direct media URL for unprotected downloads */
  mediaUrl?: string
  /** Downloadable assets (audio, documents, 3D) separate from carousel */
  downloadableAssets?: DownloadableAsset[]
}

export function PostCardMenu({
  postId,
  className,
  hideGoToPost = false,
  isOwner = false,
  userId: _userId,
  postType = 'post',
  hasCollects: _hasCollects = false,
  hasPurchases: _hasPurchases = false,
  metadataUrl: _metadataUrl,
  masterMint,
  collectibleAssetId,
  userNftMint,
  postUser,
  postCaption,
  postMediaUrl,
  onReportSubmit,
  mediaType,
  hasDownloadAccess = false,
  assetId,
  mediaUrl,
  downloadableAssets,
}: PostCardMenuProps) {
  const [showReportModal, setShowReportModal] = useState(false)
  const { downloadProtectedAsset, isAuthenticating } = useGatedDownload()
  const { preferences } = usePreferences()

  // Check if this post has a downloadable file (main media is document/3d)
  const isDownloadable = mediaType === 'document' || mediaType === '3d'
  const isLocked = isDownloadable && !hasDownloadAccess

  // Check for separate downloadable assets (from multi-asset posts)
  const hasDownloadableAssets = downloadableAssets && downloadableAssets.length > 0
  // Posts and collectibles always have free downloads
  const canDownloadAssets = postType === 'post' || postType === 'collectible' || hasDownloadAccess

  // Get file type label from URL
  const getFileTypeLabel = (url?: string | null) => {
    if (!url) return 'File'
    const extension = url.split('.').pop()?.toLowerCase()?.split('?')[0]
    if (extension === 'pdf') return 'PDF'
    if (extension === 'zip') return 'ZIP'
    if (extension === 'epub') return 'EPUB'
    if (['mp3', 'wav', 'ogg', 'aac'].includes(extension || '')) return 'Audio'
    if (['glb', 'gltf', 'usdz'].includes(extension || '')) return '3D Model'
    return 'File'
  }

  // Get file type label from MIME type
  const getFileTypeLabelFromMime = (mimeType?: string | null, url?: string | null) => {
    if (mimeType) {
      if (mimeType === 'application/pdf') return 'PDF'
      if (mimeType === 'application/zip') return 'ZIP'
      if (mimeType === 'application/epub+zip') return 'EPUB'
      if (mimeType.startsWith('audio/')) return 'Audio'
      if (mimeType.includes('gltf') || mimeType === 'application/octet-stream') return '3D Model'
    }
    return getFileTypeLabel(url)
  }

  const handleCopyLink = () => {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''
    const postUrl = `${currentOrigin}/post/${postId}`

    navigator.clipboard
      .writeText(postUrl)
      .then(() => {
        toast.success('Link copied to clipboard')
      })
      .catch(() => {
        toast.error('Failed to copy link')
      })
  }

  const handleReportSubmit = (reasons: string[], details?: string) => {
    if (onReportSubmit) {
      onReportSubmit(reasons, details)
    } else {
      // Fallback: show error if no handler provided
      toast.error('Report functionality not available')
    }
  }

  const handleDownload = async () => {
    if (isLocked) {
      // Show message that purchase is required
      toast.error('Purchase this edition to download')
      return
    }

    // For protected assets, use the gated download flow
    if (assetId) {
      const downloadUrl = await downloadProtectedAsset(assetId)
      if (downloadUrl) {
        window.open(downloadUrl, '_blank')
      }
    } else if (mediaUrl) {
      // Direct download for unprotected content
      window.open(mediaUrl, '_blank')
    }
  }

  // Handle download for separate downloadable assets (from multi-asset posts)
  const handleDownloadAsset = async (asset: DownloadableAsset) => {
    if (!canDownloadAssets) {
      toast.error('Purchase this edition to download')
      return
    }

    // For editions, use gated download flow (requires signature verification)
    if (postType === 'edition') {
      const downloadUrl = await downloadProtectedAsset(asset.id)
      if (downloadUrl) {
        window.open(downloadUrl, '_blank')
      }
    } else {
      // Direct download for posts/collectibles (unprotected)
      window.open(asset.url, '_blank')
    }
  }

  // Custom item styles matching original design
  const itemClassName = "flex items-center gap-3 px-4 py-3 text-sm text-foreground rounded-lg cursor-pointer"

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* Menu Button - 44px touch target on mobile */}
          <button
            className={cn(
              "flex items-center justify-center w-11 h-11 md:w-8 md:h-8 rounded-md transition-colors text-muted-foreground hover:text-foreground",
              className
            )}
            aria-label="Post options"
          >
            <Icon name="ellipsis-vertical" className="text-sm" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {!hideGoToPost && (
            <DropdownMenuItem asChild className={itemClassName}>
              <Link
                to="/post/$postId"
                params={{ postId }}
                onClick={(e) => e.stopPropagation()}
              >
                <Icon name="arrow-right" variant="regular" className="w-5 text-center" />
                <span>Go to post</span>
              </Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={handleCopyLink} className={itemClassName}>
            <Icon name="link-simple" variant="regular" className="w-5 text-center" />
            <span>Copy link</span>
          </DropdownMenuItem>

          {/* Download option for documents and 3D models (main media) */}
          {isDownloadable && (
            <DropdownMenuItem
              onClick={handleDownload}
              disabled={isAuthenticating}
              className={cn(
                itemClassName,
                isLocked && "text-muted-foreground"
              )}
            >
              <Icon name="arrow-down-to-bracket" variant="regular" className={cn("w-5 text-center", isAuthenticating && "opacity-50")} />
              <span className="flex-1">
                {isAuthenticating ? 'Verifying...' : `Download ${getFileTypeLabel(mediaUrl)}`}
              </span>
              {isLocked && (
                <Icon name="lock" className="text-xs" />
              )}
            </DropdownMenuItem>
          )}

          {/* Download options for separate downloadable assets (multi-asset posts) */}
          {hasDownloadableAssets && downloadableAssets!.map((asset) => (
            <DropdownMenuItem
              key={asset.id}
              onClick={() => handleDownloadAsset(asset)}
              className={cn(
                itemClassName,
                !canDownloadAssets && "text-muted-foreground"
              )}
            >
              <Icon name="arrow-down-to-bracket" variant="regular" className="w-5 text-center" />
              <span className="flex-1">
                Download {getFileTypeLabelFromMime(asset.mimeType, asset.url)}
              </span>
              {!canDownloadAssets && (
                <Icon name="lock" className="text-xs" />
              )}
            </DropdownMenuItem>
          ))}

          {/* View on explorer: prefer user's NFT, fallback to collection/master */}
          {(userNftMint || masterMint || collectibleAssetId) && (
            <DropdownMenuItem asChild className={itemClassName}>
              <a
                href={getExplorerUrl('token', (userNftMint || collectibleAssetId || masterMint)!, preferences.explorer)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="cube" variant="regular" className="w-5 text-center" />
                <span>View on explorer</span>
              </a>
            </DropdownMenuItem>
          )}

          {/* Report option - available to all users (except post owner) */}
          {postUser && postMediaUrl && onReportSubmit && !isOwner && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowReportModal(true)}
                className={cn(itemClassName, "text-destructive hover:bg-destructive/10")}
              >
                <Icon name="flag" variant="regular" className="w-5 text-center" />
                <span>Report post</span>
              </DropdownMenuItem>
            </>
          )}

          {isOwner && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className={itemClassName}>
                <Link
                  to="/post/$postId/edit"
                  params={{ postId }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Icon name="pencil" variant="regular" className="w-5 text-center" />
                  <span>Edit</span>
                </Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {postUser && postMediaUrl && (
        <ReportModal
          open={showReportModal}
          onOpenChange={setShowReportModal}
          contentType="post"
          contentId={postId}
          postId={postId}
          postUser={postUser}
          postCaption={postCaption}
          postMediaUrl={postMediaUrl}
          onSubmit={handleReportSubmit}
        />
      )}
    </>
  )
}
