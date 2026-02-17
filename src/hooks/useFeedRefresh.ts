/**
 * Feed Refresh Hook
 * Provides a way to trigger feed refresh from navigation components
 * when clicking Home while already on the home page.
 * 
 * Features:
 * - Smooth scroll to top with easing
 * - Triggers feed data refetch if there are new posts
 * - Scrolls again after content loads to ensure top position
 */

import { useEffect, useCallback, useRef } from 'react'

// Custom event name for feed refresh
const FEED_REFRESH_EVENT = 'feed:refresh'

/**
 * Options for smooth scroll animation
 */
interface ScrollOptions {
  /** Target scroll position (default: 0) */
  top?: number
  /** Animation duration in ms (default: 500) */
  duration?: number
}

/**
 * Smooth scroll to position using easeOutCubic easing
 * Returns a promise that resolves when the animation completes
 */
function smoothScrollTo({ top = 0, duration = 500 }: ScrollOptions = {}): Promise<void> {
  return new Promise((resolve) => {
    const startPosition = window.scrollY
    const distance = top - startPosition
    
    // If already at target, resolve immediately
    if (Math.abs(distance) < 1) {
      resolve()
      return
    }
    
    const startTime = performance.now()
    
    // easeOutCubic: decelerates to zero velocity
    const easeOutCubic = (t: number): number => {
      return 1 - Math.pow(1 - t, 3)
    }
    
    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutCubic(progress)
      
      window.scrollTo(0, startPosition + distance * easedProgress)
      
      if (progress < 1) {
        requestAnimationFrame(animateScroll)
      } else {
        resolve()
      }
    }
    
    requestAnimationFrame(animateScroll)
  })
}

/**
 * Dispatch feed refresh event from navigation components
 * Call this when user clicks Home while already on home page
 */
export function triggerFeedRefresh() {
  window.dispatchEvent(new CustomEvent(FEED_REFRESH_EVENT))
}

/**
 * Hook to handle feed refresh events in the Feed component
 * 
 * @param onRefresh - Callback to execute when refresh is triggered (e.g., refetch data)
 * @param scrollOptions - Options for smooth scroll animation
 */
export function useFeedRefreshListener(
  onRefresh?: () => void | Promise<void>,
  scrollOptions?: ScrollOptions
) {
  // Track if we're in a refresh cycle to scroll after content loads
  const isRefreshingRef = useRef(false)
  
  const handleRefresh = useCallback(async () => {
    isRefreshingRef.current = true
    
    // Smooth scroll to top first
    await smoothScrollTo(scrollOptions)
    
    // Trigger data refresh if callback provided
    if (onRefresh) {
      await onRefresh()
    }
    
    // After refetch completes, ensure we're still at top
    // Use a small delay to let React re-render the new content
    setTimeout(() => {
      if (window.scrollY > 0) {
        // Quick scroll to top if content load shifted the position
        smoothScrollTo({ top: 0, duration: 200 })
      }
      isRefreshingRef.current = false
    }, 100)
  }, [onRefresh, scrollOptions])
  
  useEffect(() => {
    window.addEventListener(FEED_REFRESH_EVENT, handleRefresh)
    return () => {
      window.removeEventListener(FEED_REFRESH_EVENT, handleRefresh)
    }
  }, [handleRefresh])
}

/**
 * Utility to scroll to top with smooth animation
 * Can be used independently of the refresh event system
 */
export { smoothScrollTo }

