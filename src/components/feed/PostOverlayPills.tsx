/**
 * PostOverlayPills Component
 * Media-overlay status + price/time pills shared by PostCard (feed) and
 * GalleryCard (grids). Pure presentational — pair with usePostOverlayPill.
 */

import { cn } from '@/lib/utils'
import { MediaPill } from '@/components/ui/media-pill'
import { PriceTooltip } from './PriceTooltip'
import { POST_TYPE_META } from '@/constants/postTypes'
import { POST_TYPE_COLORS, type PostDisplayState } from './postDisplay'
import type { MediaType } from '@/lib/media'
import type { PostCardData } from './PostCard'

interface PostOverlayPillsProps {
  display: PostDisplayState
  timedPillText: string | null
  isScheduled: boolean
  mediaType: MediaType
  postType: PostCardData['type']
  price?: number | null
  currency?: 'SOL' | 'USDC' | null
  sellerFeeBasisPoints?: number | null
  /** feed = PostCard's full-bleed media offsets; grid = dense tile offsets */
  position?: 'feed' | 'grid'
}

export function PostOverlayPills({
  display,
  timedPillText,
  isScheduled,
  mediaType,
  postType,
  price,
  currency,
  sellerFeeBasisPoints,
  position = 'feed',
}: PostOverlayPillsProps) {
  const postTypeColor = POST_TYPE_COLORS[postType]

  // Document/3D pills are rendered by PostMedia itself
  const showStatusPill = !!display.statusPillText && mediaType !== 'document' && mediaType !== '3d'
  const showPricePill = !!(timedPillText || display.overlayPillText) && mediaType !== 'document' && mediaType !== '3d'

  if (!showStatusPill && !showPricePill) return null

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      <div
        className={cn(
          'pointer-events-auto absolute flex items-center gap-1.5',
          // grid pills sit top-LEFT: PostMedia's video play / audio badges own top-right
          position === 'feed' ? 'right-7 top-3 md:right-3 md:top-3' : 'left-2 top-2'
        )}
      >
        {/* Status pill (Sold, Sold Out) - NOT shown for document/3D (PostMedia handles it) */}
        {showStatusPill && (
          <MediaPill variant="tone" toneColor={postTypeColor}>
            {display.statusPillText}
          </MediaPill>
        )}
        {/* Price/time pill - hide for PDF/3D since PostMedia shows it */}
        {showPricePill && (
          <>
            {/* Wrap edition price pills with tooltip for breakdown (web only) */}
            {display.overlayPillVariant === 'edition' && price && currency && !isScheduled ? (
              <PriceTooltip
                price={price}
                currency={currency}
                sellerFeeBasisPoints={sellerFeeBasisPoints}
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
  )
}
