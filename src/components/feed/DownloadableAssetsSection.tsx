import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { toast } from '@/hooks/use-toast'
import { useGatedDownload } from '@/hooks/useGatedDownload'
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
  const canDownload = hasDownloadAccess(postType, isCollected)

  if (!assets?.length) return null

  const handleDownload = async (asset: DownloadableAsset) => {
    if (!canDownload) {
      toast.error('Collect to download')
      return
    }

    if (postType === 'edition' || asset.isGated) {
      const downloadUrl = await downloadProtectedAsset(asset.id)
      if (downloadUrl) {
        window.open(downloadUrl, '_blank')
        recordDownload(asset.id)
      }
      return
    }

    window.open(asset.url, '_blank')
    recordDownload(asset.id)
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
            const downloadCount = asset.downloadCount ?? 0

            return (
              <div
                key={asset.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
                  <Icon name={getAssetIconName(asset)} variant="regular" className="text-sm" />
                </div>

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
                    disabled={isAuthenticating}
                    onClick={() => handleDownload(asset)}
                    className="shrink-0"
                  >
                    {isAuthenticating ? 'Verifying...' : 'Download'}
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
