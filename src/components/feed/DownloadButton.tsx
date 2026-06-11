/**
 * DownloadButton Component
 * Compact feed action-row affordance for a post's downloadable attachment(s).
 *
 * Mirrors LikeButton/CommentButton: an icon plus a count, shown to everyone.
 * - Free posts / collectibles, and collected editions: clickable → downloads.
 * - Gated editions the viewer hasn't collected: count is still shown, but the
 *   control is not actionable (locked).
 * - Multiple attachments: routes to the post detail where the full list lives.
 */

import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'
import { toast } from '@/hooks/use-toast'
import { useGatedDownload } from '@/hooks/useGatedDownload'
import { recordDownload } from '@/lib/recordDownload'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import {
  getTotalDownloadCount,
  hasDownloadAccess,
  type DownloadableAsset,
} from './postAssets'

interface DownloadButtonProps {
  postId: string
  postType: 'post' | 'collectible' | 'edition'
  assets?: DownloadableAsset[] | null
  isCollected: boolean
  className?: string
  variant?: 'default' | 'ghost' | 'outline'
  showCount?: boolean
}

export function DownloadButton({
  postId,
  postType,
  assets,
  isCollected,
  className,
  variant = 'ghost',
  showCount = true,
}: DownloadButtonProps) {
  const navigate = useNavigate()
  const { downloadProtectedAsset, isAuthenticating } = useGatedDownload()

  if (!assets?.length) return null

  const canDownload = hasDownloadAccess(postType, isCollected)
  const downloadCount = getTotalDownloadCount(assets)
  const single = assets.length === 1 ? assets[0] : null

  const handleClick = async () => {
    if (!canDownload) {
      toast.error('Collect to download')
      return
    }

    // Multiple attachments → send the viewer to the detail page list.
    if (!single) {
      navigate({ to: '/post/$postId', params: { postId } })
      return
    }

    if (postType === 'edition' || single.isGated) {
      const downloadUrl = await downloadProtectedAsset(single.id)
      if (downloadUrl) {
        window.open(downloadUrl, '_blank')
        recordDownload(single.id)
      }
      return
    }

    window.open(single.url, '_blank')
    recordDownload(single.id)
  }

  const locked = !canDownload
  const count = (
    showCount && downloadCount > 0 ? (
      <span className="text-sm font-medium">{downloadCount}</span>
    ) : null
  )

  return (
    <Button
      variant={variant}
      className={cn('gap-1 px-2', className)}
      onClick={handleClick}
      disabled={isAuthenticating || locked}
      title={locked ? 'Collect to download' : 'Download attachment'}
      aria-label={locked ? 'Locked download' : 'Download attachment'}
    >
      {isAuthenticating ? (
        <LoadingSpinner size="sm" />
      ) : (
        <Icon
          name={locked ? 'lock' : 'download'}
          variant="regular"
          className="text-base"
        />
      )}
      {count}
    </Button>
  )
}
