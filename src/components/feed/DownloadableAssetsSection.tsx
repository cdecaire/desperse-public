import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { toast } from '@/hooks/use-toast'
import { useGatedDownload } from '@/hooks/useGatedDownload'
import { useAuth } from '@/hooks/useAuth'
import { recordDownload } from '@/lib/recordDownload'
import {
  formatAssetFileSize,
  getAssetIconName,
  getAssetTypeLabel,
  hasDownloadAccess,
  type DownloadableAsset,
} from './postAssets'

interface DownloadableAssetsSectionProps {
  assets?: DownloadableAsset[] | null
  postType: 'post' | 'collectible' | 'edition'
  isCollected: boolean
  className?: string
  compact?: boolean
}

export function DownloadableAssetsSection({
  assets,
  postType,
  isCollected,
  className,
  compact = false,
}: DownloadableAssetsSectionProps) {
  const { downloadProtectedAsset, isAuthenticating } = useGatedDownload()
  const { getAccessToken } = useAuth()
  const canDownload = hasDownloadAccess(postType, isCollected)
  // Optimistic per-asset download bumps + in-flight asset id, so the count ticks
  // up immediately and the button shows a spinner (matching the like affordance).
  const [bumps, setBumps] = useState<Record<string, number>>({})
  const [pendingId, setPendingId] = useState<string | null>(null)

  if (!assets?.length) return null

  const handleDownload = async (asset: DownloadableAsset) => {
    if (!canDownload) {
      toast.error('Collect to download')
      return
    }

    setPendingId(asset.id)
    try {
      let opened = false
      if (postType === 'edition' || asset.isGated) {
        const downloadUrl = await downloadProtectedAsset(asset.id)
        if (downloadUrl) {
          window.open(downloadUrl, '_blank')
          opened = true
        }
      } else {
        window.open(asset.url, '_blank')
        opened = true
      }

      if (opened) {
        // Count once per user; the download already happened regardless.
        const token = await getAccessToken()
        const recorded = await recordDownload(asset.id, token)
        if (recorded) {
          setBumps((prev) => ({ ...prev, [asset.id]: (prev[asset.id] ?? 0) + 1 }))
        }
      }
    } finally {
      setPendingId(null)
    }
  }

  return (
    <section className={cn('space-y-2', className)} aria-label="Downloadable attachments">
      {!compact && (
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Attachments
        </div>
      )}
      <div className="space-y-1.5">
        {[...assets]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((asset) => {
            const locked = !canDownload
            const fileSize = formatAssetFileSize(asset.fileSize)
            const fileType = getAssetTypeLabel(asset)
            const downloadCount = (asset.downloadCount ?? 0) + (bumps[asset.id] ?? 0)
            const downloading = pendingId === asset.id

            return (
              <div
                key={asset.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2"
              >
                <Icon name={getAssetIconName(asset)} variant="regular" className="shrink-0 text-2xl text-muted-foreground" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <span className="truncate">{fileType}</span>
                    {locked && (
                      <Icon name="lock" variant="solid" className="shrink-0 text-xs text-muted-foreground" aria-label="Locked" />
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {[asset.mimeType, fileSize, downloadCount > 0 ? `${downloadCount} download${downloadCount === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ')}
                  </div>
                </div>

                {locked ? (
                  // Gated and no access: surface the lock + count, but not actionable.
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    Collect to download
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={downloading}
                    onClick={() => handleDownload(asset)}
                    className="shrink-0 gap-2"
                  >
                    {downloading ? (
                      <>
                        <LoadingSpinner size="sm" />
                        {isAuthenticating ? 'Verifying...' : 'Downloading...'}
                      </>
                    ) : (
                      'Download'
                    )}
                  </Button>
                )}
              </div>
            )
          })}
      </div>
    </section>
  )
}

export type { DownloadableAsset }
