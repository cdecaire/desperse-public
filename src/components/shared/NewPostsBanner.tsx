/**
 * New Posts Banner Component
 * Reusable banner for showing "X new posts" notifications
 * Used for For You feed and can be extended for Following feed
 */

import { Button } from '@/components/ui/button'
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
    <div
      className={`sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border py-3 px-4 ${className || ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground flex-1">
          {displayMessage}
        </p>
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
              <i className="fa-regular fa-arrow-rotate-right mr-2" />
              <span>Refresh</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export default NewPostsBanner

