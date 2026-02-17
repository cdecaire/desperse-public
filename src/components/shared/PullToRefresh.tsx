/**
 * Pull-to-refresh wrapper component for mobile devices
 * Provides a visual indicator and triggers refresh on pull-down gesture
 */

import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { cn } from '@/lib/utils'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  disabled?: boolean
  className?: string
}

export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  className,
}: PullToRefreshProps) {
  const {
    pullDistance,
    isPulling,
    isRefreshing,
    canRelease,
    containerRef,
    contentRef,
  } = usePullToRefresh({
    onRefresh,
    threshold: 80,
    disabled,
  })

  const showIndicator = pullDistance > 0 || isRefreshing

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
    >
      {/* Pull indicator - only visible on mobile (md:hidden) */}
      <div
        className={cn(
          'md:hidden absolute left-1/2 flex items-center justify-center z-40',
          'transition-opacity duration-200',
          showIndicator ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        style={{
          top: Math.max(pullDistance - 50, 8),
          transform: 'translateX(-50%)',
        }}
      >
        <div
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-full',
            'bg-background border border-border shadow-lg',
            isRefreshing && 'animate-pulse'
          )}
        >
          {isRefreshing ? (
            <div
              className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-foreground"
              role="status"
              aria-label="Refreshing"
            />
          ) : (
            <i
              className={cn(
                'fa-regular fa-arrow-down text-base transition-all duration-150',
                canRelease ? 'text-primary' : 'text-muted-foreground'
              )}
              style={{
                transform: `rotate(${canRelease ? 180 : 0}deg)`,
                transition: 'transform 0.2s ease-out',
              }}
            />
          )}
        </div>
      </div>

      {/* Content wrapper with pull-down transform */}
      <div
        ref={contentRef}
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  )
}
