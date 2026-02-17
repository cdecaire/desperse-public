/**
 * Pull-to-refresh hook for mobile devices
 * Detects touch gestures and triggers a refresh when pulled down far enough
 */

import { useState, useRef, useCallback, useEffect } from 'react'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number // Distance in pixels required to trigger refresh
  resistance?: number // How much to resist the pull (higher = more resistance)
  disabled?: boolean
}

interface UsePullToRefreshReturn {
  pullDistance: number
  isPulling: boolean
  isRefreshing: boolean
  canRelease: boolean // Pull distance exceeds threshold
  containerRef: React.RefObject<HTMLDivElement | null>
  contentRef: React.RefObject<HTMLDivElement | null>
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const currentY = useRef(0)

  const canRelease = pullDistance >= threshold

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return

    // Only activate when scrolled to top
    const scrollTop = window.scrollY || document.documentElement.scrollTop
    if (scrollTop > 0) return

    startY.current = e.touches[0].clientY
    currentY.current = e.touches[0].clientY
    setIsPulling(true)
  }, [disabled, isRefreshing])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return

    currentY.current = e.touches[0].clientY
    const diff = currentY.current - startY.current

    // Only allow pulling down, not up
    if (diff < 0) {
      setPullDistance(0)
      return
    }

    // Apply resistance to make pull feel natural
    const distance = Math.min(diff / resistance, threshold * 1.5)
    setPullDistance(distance)

    // Prevent default scrolling when pulling
    if (distance > 0) {
      e.preventDefault()
    }
  }, [isPulling, disabled, isRefreshing, resistance, threshold])

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return

    setIsPulling(false)

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      // Keep showing the refreshing indicator
      setPullDistance(threshold * 0.6)

      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      // Animate back to 0
      setPullDistance(0)
    }
  }, [isPulling, disabled, pullDistance, threshold, isRefreshing, onRefresh])

  useEffect(() => {
    const container = containerRef.current
    if (!container || disabled) return

    // Use passive: false to allow preventDefault on touchmove
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, disabled])

  return {
    pullDistance,
    isPulling,
    isRefreshing,
    canRelease,
    containerRef,
    contentRef,
  }
}
