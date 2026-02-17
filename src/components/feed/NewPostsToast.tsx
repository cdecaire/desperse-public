/**
 * NewPostsToast Component
 * X.com-style floating toast that appears when new posts are available
 * Shows creator avatars (up to 3, prioritizing followed users)
 * Animates in from top, fades out on click
 */

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { smoothScrollTo } from '@/hooks/useFeedRefresh'
import type { NewPostCreator } from '@/hooks/useNotificationCounters'

interface NewPostsToastProps {
  /** Whether there are new posts to show */
  hasNewPosts: boolean
  /** Creators of the new posts (up to 3) */
  creators: NewPostCreator[]
  /** Called when user clicks the toast to refresh */
  onRefresh: () => void | Promise<void>
  /** CSS class name */
  className?: string
}

/** Scroll threshold in pixels before toast should appear */
const SCROLL_THRESHOLD = 200

export function NewPostsToast({ 
  hasNewPosts, 
  creators, 
  onRefresh, 
  className 
}: NewPostsToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isScrolledPastThreshold, setIsScrolledPastThreshold] = useState(false)
  const [isFadingOut, setIsFadingOut] = useState(false)

  // Track scroll position to determine visibility
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      setIsScrolledPastThreshold(scrollY > SCROLL_THRESHOLD)
    }

    // Initial check
    handleScroll()

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Show toast when both conditions are met: has new posts AND scrolled past threshold
  useEffect(() => {
    if (hasNewPosts && isScrolledPastThreshold && !isFadingOut) {
      setIsVisible(true)
    } else if (!hasNewPosts || !isScrolledPastThreshold) {
      setIsVisible(false)
    }
  }, [hasNewPosts, isScrolledPastThreshold, isFadingOut])

  // Handle click - fade out, scroll to top, refresh
  const handleClick = useCallback(async () => {
    // Start fade out animation
    setIsFadingOut(true)
    
    // Scroll to top smoothly
    await smoothScrollTo({ top: 0, duration: 400 })
    
    // Trigger refresh
    await onRefresh()
    
    // Reset state after animation completes
    setTimeout(() => {
      setIsVisible(false)
      setIsFadingOut(false)
    }, 200)
  }, [onRefresh])

  // Don't render if not visible or no creators
  if (!isVisible || creators.length === 0) {
    return null
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        // Base styles
        'fixed z-50',
        // Center to viewport on mobile, center to main content area on desktop (accounting for 256px sidebar)
        'left-1/2 lg:left-[calc(50%+128px)] -translate-x-1/2',
        'flex items-center gap-2.5 px-4 py-2.5 rounded-full',
        // Light/dark themed background
        'bg-primary text-primary-foreground',
        // Subtle drop shadow
        'shadow-lg shadow-black/10 dark:shadow-black/30',
        // Animation
        'transition-all duration-300 ease-out',
        // Hover effect - use transform-gpu for better performance
        'hover:scale-105 hover:shadow-xl active:scale-95',
        'transform-gpu',
        // Cursor
        'cursor-pointer',
        // Entry animation
        isFadingOut
          ? 'opacity-0 translate-y-[-20px]'
          : 'opacity-100 translate-y-0 animate-in slide-in-from-top-4 fade-in duration-300',
        // Position - below TopNav on mobile (safe area)
        'top-16 md:top-20',
        className
      )}
      type="button"
      aria-label="View new posts"
    >
      {/* Up arrow icon */}
      <i className="fa-solid fa-arrow-up text-sm" />
      
      {/* Overlapping creator avatars */}
      <div className="flex -space-x-2">
        {creators.map((creator, index) => (
          <div
            key={creator.id}
            className={cn(
              'w-7 h-7 rounded-full overflow-hidden',
              'ring-2 ring-primary',
              'bg-muted shrink-0',
              'will-change-transform',
              'transform-gpu'
            )}
            style={{ 
              zIndex: creators.length - index,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            {creator.avatarUrl ? (
              <img
                src={creator.avatarUrl}
                alt={creator.displayName || creator.usernameSlug}
                className="w-full h-full object-cover"
                style={{
                  imageRendering: 'auto',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'translateZ(0)',
                  willChange: 'transform',
                }}
                loading="eager"
                decoding="sync"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-xs font-medium">
                {(creator.displayName || creator.usernameSlug)[0]?.toUpperCase()}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* "Posted" text */}
      <span className="text-sm font-semibold pr-2">Posted</span>
    </button>
  )
}

export default NewPostsToast

