/**
 * Splash Screen Component
 * Shows on every hard refresh/initial load, fades out when app is ready
 * Uses dark theme styling for consistent branded experience
 */

import { useEffect, useState, useCallback } from 'react'

// Timing configuration
const FADE_DURATION_MS = 300 // Fade out animation duration

interface SplashScreenProps {
  /** Whether the app is ready to be shown (auth ready, etc.) */
  isReady: boolean
}

export function SplashScreen({ isReady }: SplashScreenProps) {
  const [shouldShow, setShouldShow] = useState(true)
  const [isVisible, setIsVisible] = useState(true)

  // Handle fade out
  const hideSplash = useCallback(() => {
    setIsVisible(false)
    // Remove from DOM after fade animation
    setTimeout(() => {
      setShouldShow(false)
    }, FADE_DURATION_MS)
  }, [])

  // Hide splash when app is ready (auth initialized)
  useEffect(() => {
    if (!shouldShow) return

    if (isReady) {
      hideSplash()
    }
  }, [shouldShow, isReady, hideSplash])

  // Don't render after hidden
  if (!shouldShow) return null

  return (
    <div
      className="dark fixed inset-0 z-[9999] flex items-center justify-center bg-background"
      style={{
        opacity: isVisible ? 1 : 0,
        transition: `opacity ${FADE_DURATION_MS}ms ease-out`,
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
      aria-hidden={!isVisible}
    >
      {/* Logo - inverted to white for dark background */}
      <img
        src="/desperse_logo.svg"
        alt=""
        className="h-16 w-16 brightness-0 invert"
        aria-hidden="true"
      />
    </div>
  )
}
