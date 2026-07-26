/**
 * RouteProgressBar Component
 * Top progress bar indicator for route transitions (similar to NProgress)
 * 
 * Shows a progress bar at the top of the page during route transitions.
 * Only displays if navigation takes longer than 250ms to avoid flicker.
 */

import { useEffect, useRef, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { Progress, ProgressTrack, ProgressIndicator } from '@cdecaire/sable'
import { hasUncommittedNavigation } from '@/lib/router-state'

const SHOW_DELAY_MS = 250 // Show progress bar after 250ms
const HIDE_DELAY_MS = 200 // Keep the completed state visible long enough to read

export function RouteProgressBar() {
  const isNavigating = useRouterState({
    select: hasUncommittedNavigation,
  })
  const [isVisible, setIsVisible] = useState(false)
  const [progress, setProgress] = useState(0)

  const isVisibleRef = useRef(false)
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const clearTimers = () => {
      if (showTimeoutRef.current !== null) {
        clearTimeout(showTimeoutRef.current)
        showTimeoutRef.current = null
      }
      if (hideTimeoutRef.current !== null) {
        clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = null
      }
      if (progressIntervalRef.current !== null) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
    }

    const startProgress = () => {
      let currentProgress = 10
      setProgress(currentProgress)
      progressIntervalRef.current = setInterval(() => {
        const increment = currentProgress < 50 ? 10 : currentProgress < 80 ? 5 : 2
        currentProgress = Math.min(currentProgress + increment, 90)
        setProgress(currentProgress)
      }, 100)
    }

    clearTimers()

    if (isNavigating) {
      // Restart cleanly if another navigation begins during the completion phase.
      if (isVisibleRef.current) {
        startProgress()
        return clearTimers
      }

      setProgress(0)
      showTimeoutRef.current = setTimeout(() => {
        showTimeoutRef.current = null
        isVisibleRef.current = true
        setIsVisible(true)
        startProgress()
      }, SHOW_DELAY_MS)
    } else if (isVisibleRef.current) {
      // The router has actually resolved: complete, then dismiss the indicator.
      setProgress(100)
      hideTimeoutRef.current = setTimeout(() => {
        hideTimeoutRef.current = null
        isVisibleRef.current = false
        setIsVisible(false)
        setProgress(0)
      }, HIDE_DELAY_MS)
    } else {
      setProgress(0)
    }

    return clearTimers
  }, [isNavigating])

  if (!isVisible) return null

  return (
    <Progress
      value={progress}
      aria-label="Loading page"
      className="fixed top-0 left-0 right-0 z-(--z-toast)"
    >
      <ProgressTrack className="h-0.5 rounded-none bg-foreground/20">
        <ProgressIndicator className="rounded-none bg-foreground transition-all duration-300 ease-out shadow-[0_0_10px_rgba(0,0,0,0.3)]" />
      </ProgressTrack>
    </Progress>
  )
}
