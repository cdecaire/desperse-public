/**
 * New Posts Banner Component
 * Reusable banner for showing "X new posts" notifications.
 *
 * Migration shim (Phase 2 — Sable adoption): @cdecaire/sable <Banner> in its
 * sticky + action layout (leading message, trailing Refresh button). Default
 * neutral tone; sticky pins it to the top of the feed scroll.
 */

import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Banner } from '@cdecaire/sable'
import { LoadingSpinner } from './LoadingSpinner'

interface NewPostsBannerProps {
  /** Number of new posts (will be capped at 99+) */
  count: number
  /** Callback when user clicks to refresh */
  onRefresh: () => void
  /** Whether refresh is in progress */
  isRefreshing?: boolean
  /** Optional custom message */
  message?: string
  /** Optional className for styling */
  className?: string
}

export function NewPostsBanner({
  count,
  onRefresh,
  isRefreshing = false,
  message,
  className,
}: NewPostsBannerProps) {
  if (count === 0) return null

  const displayCount = count > 99 ? '99+' : count
  const displayMessage = message || `${displayCount} new post${count === 1 ? '' : 's'}`

  return (
    <Banner
      sticky
      live="polite"
      className={className}
      action={
        <Button
          onClick={onRefresh}
          disabled={isRefreshing}
          variant="outline"
          className="shrink-0"
        >
          {isRefreshing ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              <span>Refreshing...</span>
            </>
          ) : (
            <>
              <Icon name="arrow-rotate-right" variant="regular" className="mr-2" />
              <span>Refresh</span>
            </>
          )}
        </Button>
      }
    >
      <span className="font-medium">{displayMessage}</span>
    </Banner>
  )
}

export default NewPostsBanner
