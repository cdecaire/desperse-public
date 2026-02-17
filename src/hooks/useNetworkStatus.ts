/**
 * Network status hook
 * Detects online/offline state using navigator.onLine and online/offline events
 */

import { useState, useEffect } from 'react'

export interface UseNetworkStatusReturn {
  isOnline: boolean
  isOffline: boolean
}

/**
 * Hook to detect network online/offline status
 * Uses navigator.onLine and listens to online/offline events
 */
export function useNetworkStatus(): UseNetworkStatusReturn {
  const [isOnline, setIsOnline] = useState(() => {
    // Initialize with current state (SSR-safe)
    if (typeof window === 'undefined') return true
    return navigator.onLine
  })

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine)

    // Listen to online event
    const handleOnline = () => {
      setIsOnline(true)
    }

    // Listen to offline event
    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return {
    isOnline,
    isOffline: !isOnline,
  }
}

export default useNetworkStatus

