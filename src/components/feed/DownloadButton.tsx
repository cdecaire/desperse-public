/**
 * DownloadButton Component
 * Compact feed/detail action-row affordance for a post's downloadable attachment(s).
 *
 * Mirrors LikeButton/CommentButton: an icon plus a count, shown to everyone, with
 * a spinner while the download is in flight and an optimistic count bump on success.
 * - Free posts / collectibles, and collected editions: clickable → downloads.
 * - Gated editions the viewer hasn't collected: count is still shown, but the
 *   control is not actionable (locked).
 * - Multiple attachments: routes to the post detail where the full list lives.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'
import { toast } from '@/hooks/use-toast'
import { useGatedDownload } from '@/hooks/useGatedDownload'
import { useAuth } from '@/hooks/useAuth'
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
  const { getAccessToken } = useAuth()
  const serverCount = getTotalDownloadCount(assets)
  const [localCount, setLocalCount] = useState(serverCount)
  const [pending, setPending] = useState(false)

  // Adopt server increases (e.g. background refetch) without ever going backward,
  // so an optimistic bump isn't undone and isn't double-counted.
  useEffect(() => {
    setLocalCount((current) => Math.max(current, serverCount))
  }, [serverCount])

  if (!assets?.length) return null

  const canDownload = hasDownloadAccess(postType, isCollected)
  const locked = !canDownload
  const single = assets.length === 1 ? assets[0] : null

  const handleClick = async () => {
    if (locked) {
      toast.error('Collect to download')
      return
    }

    // Multiple attachments → send the viewer to the detail page list.
    if (!single) {
      navigate({ to: '/post/$postId', params: { postId } })
      return
    }

    setPending(true)
    try {
      let opened = false
      if (postType === 'edition' || single.isGated) {
        const downloadUrl = await downloadProtectedAsset(single.id)
        if (downloadUrl) {
          window.open(downloadUrl, '_blank')
          opened = true
        }
      } else {
        window.open(single.url, '_blank')
        opened = true
      }

      if (opened) {
        // Count once per user; never blocks the download that already happened.
        const token = await getAccessToken()
        const recorded = await recordDownload(single.id, token)
        if (recorded) setLocalCount((current) => current + 1)
      }
    } finally {
      setPending(false)
    }
  }

  const busy = pending || isAuthenticating

  return (
    <Button
      variant={variant}
      className={cn('gap-1 px-2', className)}
      onClick={handleClick}
      disabled={busy || locked}
      title={locked ? 'Collect to download' : 'Download attachment'}
      aria-label={locked ? 'Locked download' : 'Download attachment'}
    >
      {busy ? (
        <LoadingSpinner size="sm" />
      ) : (
        <Icon
          name={locked ? 'lock' : 'download'}
          variant="regular"
          className="text-base"
        />
      )}
      {showCount && localCount > 0 && (
        <span className="text-sm font-medium">{localCount}</span>
      )}
    </Button>
  )
}
