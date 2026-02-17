import { useEffect, useState } from 'react'

// Shared state for nav visibility across components
let listeners: Set<(hidden: boolean) => void> = new Set()
let isNavHidden = false

function setHidden(hidden: boolean) {
  if (isNavHidden !== hidden) {
    isNavHidden = hidden
    listeners.forEach((listener) => listener(hidden))
  }
}

export function useScrollHideNav() {
  const [isHidden, setIsHidden] = useState(isNavHidden)

  useEffect(() => {
    // Subscribe to shared state
    const listener = (hidden: boolean) => setIsHidden(hidden)
    listeners.add(listener)

    // Reset visibility on mount
    setHidden(false)

    let lastY = window.scrollY

    const handleScroll = () => {
      const currentY = window.scrollY
      const delta = currentY - lastY

      // Hide when scrolling down (past threshold), show when scrolling up
      if (delta > 8 && currentY > 48) {
        setHidden(true)
      } else if (delta < -8 || currentY <= 48) {
        setHidden(false)
      }

      lastY = currentY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      listeners.delete(listener)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return isHidden
}

// Call this to reset nav visibility (e.g., on route change)
export function resetNavVisibility() {
  setHidden(false)
}
