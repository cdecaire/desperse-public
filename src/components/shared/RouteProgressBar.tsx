/**
 * RouteProgressBar Component
 * Top progress bar indicator for route transitions (similar to NProgress)
 * 
 * Shows a progress bar at the top of the page during route transitions.
 * Only displays if navigation takes longer than 250ms to avoid flicker.
 */

import { useEffect, useState, useRef } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

const SHOW_DELAY_MS = 250 // Show progress bar after 250ms
const COMPLETE_DELAY_MS = 150 // Delay before completing (allows route to render)

export function RouteProgressBar() {
  const routerState = useRouterState()
  const pathname = routerState.location.pathname
  const [isVisible, setIsVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const completeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const previousPathnameRef = useRef<string>(pathname)
  const isNavigatingRef = useRef<boolean>(false)

  // Handle pathname changes (navigation start/end)
  useEffect(() => {
    const pathnameChanged = pathname !== previousPathnameRef.current
    
    if (pathnameChanged) {
      // Navigation started - clear any existing timers
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current)
      }
      if (completeTimeoutRef.current) {
        clearTimeout(completeTimeoutRef.current)
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }

      // If we were already navigating, complete the previous navigation
      if (isNavigatingRef.current) {
        completeProgress()
      }

      // Start new navigation
      isNavigatingRef.current = true
      previousPathnameRef.current = pathname
      setProgress(0)

      // Schedule showing the progress bar after delay
      showTimeoutRef.current = setTimeout(() => {
        // Only show if still navigating (pathname hasn't changed again)
        if (isNavigatingRef.current) {
          setIsVisible(true)
          setProgress(10) // Start at 10%

          // Simulate progress (not real progress, just visual feedback)
          let currentProgress = 10
          progressIntervalRef.current = setInterval(() => {
            // Slow down as we approach 90% (don't go to 100% until route loads)
            const increment = currentProgress < 50 ? 10 : currentProgress < 80 ? 5 : 2
            currentProgress = Math.min(currentProgress + increment, 90)
            setProgress(currentProgress)
          }, 100)
        }
      }, SHOW_DELAY_MS)

      // Schedule completion after a short delay (route should be loaded by then)
      completeTimeoutRef.current = setTimeout(() => {
        if (isNavigatingRef.current) {
          completeProgress()
        }
      }, COMPLETE_DELAY_MS)
    }

    // Cleanup on unmount
    return () => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current)
      }
      if (completeTimeoutRef.current) {
        clearTimeout(completeTimeoutRef.current)
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [pathname])

  const completeProgress = () => {
    isNavigatingRef.current = false
    
    // Complete progress to 100%
    setProgress(100)

    // Clear progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }

    // Hide after a short delay for smooth transition
    setTimeout(() => {
      setIsVisible(false)
      setProgress(0)
    }, 200)
  }

  if (!isVisible) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-0.5 bg-foreground/20"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Loading page"
    >
      <div
        className={cn(
          'h-full bg-foreground transition-all duration-300 ease-out',
          'shadow-[0_0_10px_rgba(0,0,0,0.3)]'
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

