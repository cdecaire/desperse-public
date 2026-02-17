/**
 * MediaCarousel Component
 * Handles rendering multiple media items as a tap-navigable carousel
 * Phase 1: Multi-asset posts support
 *
 * Uses CSS transforms with cloned slides for smooth infinite cycling
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { getResponsiveImageProps } from '@/lib/imageUrl'

export interface CarouselAsset {
  id: string
  url: string
  mimeType: string
  fileSize?: number | null
  sortOrder: number
}

interface MediaCarouselProps {
  assets: CarouselAsset[]
  alt?: string
  className?: string
  /** Reserved for future use - max aspect ratio constraint */
  maxAspectRatio?: number // eslint-disable-line @typescript-eslint/no-unused-vars
  lazy?: boolean
  onClick?: () => void
  preview?: boolean
  /** If true, carousel fills its container and images use object-contain (for detail views) */
  contained?: boolean
}

function getMediaType(mimeType: string): 'image' | 'video' {
  if (mimeType.startsWith('video/')) return 'video'
  return 'image'
}

export function MediaCarousel({
  assets,
  alt = 'Post media',
  className,
  // maxAspectRatio reserved for future use
  lazy = true,
  onClick,
  preview = false,
  contained = false,
}: MediaCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [trackOffset, setTrackOffset] = useState(1) // Start at 1 because of leading clone
  const [isAnimating, setIsAnimating] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const [hoverSide, setHoverSide] = useState<'left' | 'right' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map())

  const sortedAssets = useMemo(
    () => [...assets].sort((a, b) => a.sortOrder - b.sortOrder),
    [assets]
  )

  const totalCount = sortedAssets.length
  const currentAsset = sortedAssets[currentIndex]
  const hasMultiple = totalCount > 1

  // For infinite loop: [clone of last, ...originals..., clone of first]
  const extendedAssets = useMemo(() => {
    if (!hasMultiple) return sortedAssets
    return [
      { ...sortedAssets[totalCount - 1], id: `clone-start` },
      ...sortedAssets,
      { ...sortedAssets[0], id: `clone-end` },
    ]
  }, [sortedAssets, totalCount, hasMultiple])

  // Navigate to next slide
  const goNext = useCallback(() => {
    if (isAnimating || !hasMultiple) return

    setIsAnimating(true)
    const newOffset = trackOffset + 1
    setTrackOffset(newOffset)

    // If we moved to the clone at the end, snap back to real first
    if (newOffset === totalCount + 1) {
      setCurrentIndex(0)
      setTimeout(() => {
        setIsAnimating(false)
        setTrackOffset(1) // Jump to real first without animation
      }, 300)
    } else {
      setCurrentIndex(currentIndex + 1)
      setTimeout(() => setIsAnimating(false), 300)
    }
  }, [isAnimating, hasMultiple, trackOffset, totalCount, currentIndex])

  // Navigate to previous slide
  const goPrev = useCallback(() => {
    if (isAnimating || !hasMultiple) return

    setIsAnimating(true)
    const newOffset = trackOffset - 1
    setTrackOffset(newOffset)

    // If we moved to the clone at the start, snap back to real last
    if (newOffset === 0) {
      setCurrentIndex(totalCount - 1)
      setTimeout(() => {
        setIsAnimating(false)
        setTrackOffset(totalCount) // Jump to real last without animation
      }, 300)
    } else {
      setCurrentIndex(currentIndex - 1)
      setTimeout(() => setIsAnimating(false), 300)
    }
  }, [isAnimating, hasMultiple, trackOffset, totalCount, currentIndex])

  // Navigate to specific slide (for dots)
  const goToSlide = useCallback((index: number) => {
    if (isAnimating || !hasMultiple || index === currentIndex) return

    setIsAnimating(true)
    setCurrentIndex(index)
    setTrackOffset(index + 1) // +1 for leading clone
    setTimeout(() => setIsAnimating(false), 300)
  }, [isAnimating, hasMultiple, currentIndex])

  // Handle click/tap - zones for prev/next/open
  const handleInteraction = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const x = clientX - rect.left
      const width = rect.width
      const zone = width / 3

      if (x < zone && hasMultiple) {
        goPrev()
      } else if (x > width - zone && hasMultiple) {
        goNext()
      } else {
        onClick?.()
      }
    },
    [hasMultiple, goPrev, goNext, onClick]
  )

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      handleInteraction(e.clientX)
    },
    [handleInteraction]
  )

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.changedTouches[0]
      handleInteraction(touch.clientX)
    },
    [handleInteraction]
  )

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goPrev, goNext])

  // Pause all videos except current
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (index !== currentIndex && !video.paused) {
        video.pause()
      }
    })
  }, [currentIndex])

  // Render a single media item
  const renderMedia = (asset: CarouselAsset, index: number, isContained: boolean = false) => {
    const mediaType = getMediaType(asset.mimeType)
    // For extended assets, map back to real index for video refs
    const realIndex = index === 0 ? totalCount - 1 : index === extendedAssets.length - 1 ? 0 : index - 1
    const isActive = realIndex === currentIndex
    const shouldLoadEager = Math.abs(realIndex - currentIndex) <= 1 || realIndex === 0

    if (mediaType === 'video') {
      if (isContained) {
        return (
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={(el) => {
                if (el) videoRefs.current.set(realIndex, el)
              }}
              src={asset.url}
              className="relative w-full h-full object-contain z-10"
              preload={shouldLoadEager ? 'auto' : 'none'}
              playsInline
              loop
              muted
              autoPlay={isActive && preview}
            >
              <track kind="captions" />
            </video>
          </div>
        )
      }
      return (
        <video
          ref={(el) => {
            if (el) videoRefs.current.set(realIndex, el)
          }}
          src={asset.url}
          className="w-full h-full object-cover"
          preload={shouldLoadEager ? 'auto' : 'none'}
          playsInline
          loop
          muted
          autoPlay={isActive && preview}
        >
          <track kind="captions" />
        </video>
      )
    }

    // Image with blurred background
    // For contained (detail view), request larger images since container can be large
    // For feed view, 640px max is sufficient for aspect-square cards
    const optimizedProps = getResponsiveImageProps(asset.url, {
      sizes: isContained
        ? '(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1200px'
        : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 640px',
      quality: 75,
      includeRetina: true,
    })

    if (isContained) {
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src={optimizedProps.src}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60"
          />
          <img
            src={optimizedProps.src}
            srcSet={optimizedProps.srcSet || undefined}
            sizes={optimizedProps.sizes || undefined}
            alt={`${alt} ${realIndex + 1}`}
            loading={shouldLoadEager && !lazy ? 'eager' : 'lazy'}
            decoding="async"
            className="relative w-full h-full object-contain z-10"
          />
        </div>
      )
    }

    return (
      <div className="relative w-full h-full">
        <img
          src={optimizedProps.src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60"
        />
        <img
          src={optimizedProps.src}
          srcSet={optimizedProps.srcSet || undefined}
          sizes={optimizedProps.sizes || undefined}
          alt={`${alt} ${realIndex + 1}`}
          loading={shouldLoadEager && !lazy ? 'eager' : 'lazy'}
          decoding="async"
          className="relative w-full h-full object-contain"
        />
      </div>
    )
  }

  // Calculate transform for the track - use translate3d to force GPU acceleration
  const trackTransform = hasMultiple
    ? `translate3d(-${trackOffset * 100}%, 0, 0)`
    : 'translate3d(0, 0, 0)'

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden',
        contained ? 'absolute inset-0' : 'w-full bg-muted/30',
        !contained && 'rounded-none lg:rounded-lg border-0 lg:border border-border',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        'select-none', // Prevent text selection on tap
        className
      )}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => {
        setShowControls(false)
        setHoverSide(null)
      }}
      onMouseMove={(e) => {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const midpoint = rect.width / 2
        setHoverSide(x < midpoint ? 'left' : 'right')
      }}
      onClick={handleClick}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
      role="region"
      style={{ touchAction: 'manipulation' }} // Disable double-tap zoom, allow single taps
      aria-label={`Image carousel, showing ${currentIndex + 1} of ${totalCount}`}
      aria-roledescription="carousel"
    >
      {/* Slides track - transforms for navigation */}
      <div
        className={cn(
          'flex',
          contained ? 'h-full' : 'h-full'
        )}
        style={{
          transform: trackTransform,
          transition: isAnimating ? 'transform 300ms ease-out' : 'none',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        {(hasMultiple ? extendedAssets : sortedAssets).map((asset, index) => (
          <div
            key={asset.id}
            className={cn(
              'w-full flex-shrink-0',
              contained ? 'h-full flex items-center justify-center' : 'aspect-square'
            )}
            style={{
              // Force each slide onto its own GPU layer for smoother animation
              transform: 'translate3d(0, 0, 0)',
              backfaceVisibility: 'hidden',
            }}
            role="group"
            aria-roledescription="slide"
            aria-label={`Slide ${(hasMultiple ? (index === 0 ? totalCount : index === extendedAssets.length - 1 ? 1 : index) : index + 1)} of ${totalCount}`}
            aria-hidden={hasMultiple ? (index !== trackOffset) : false}
          >
            {renderMedia(asset, index, contained)}
          </div>
        ))}
      </div>

      {/* Video indicator for current slide */}
      {getMediaType(currentAsset?.mimeType || '') === 'video' && (
        <div className="absolute top-2 right-2 pointer-events-none z-20">
          <div className="w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <i className="fa-solid fa-play text-[10px] text-white" />
          </div>
        </div>
      )}

      {/* Navigation arrows (desktop hover) */}
      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              goPrev()
            }}
            className={cn(
              'absolute left-2 top-1/2 -translate-y-1/2 z-20',
              'w-8 h-8 rounded-full bg-zinc-950/85 backdrop-blur-sm',
              'flex items-center justify-center text-white',
              'transition-opacity duration-200',
              'hover:bg-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-white',
              'hidden md:flex',
              showControls && hoverSide === 'left' ? 'opacity-100' : 'opacity-0'
            )}
            aria-label="Previous image"
          >
            <i className="fa-solid fa-arrow-left text-sm" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              goNext()
            }}
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 z-20',
              'w-8 h-8 rounded-full bg-zinc-950/85 backdrop-blur-sm',
              'flex items-center justify-center text-white',
              'transition-opacity duration-200',
              'hover:bg-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-white',
              'hidden md:flex',
              showControls && hoverSide === 'right' ? 'opacity-100' : 'opacity-0'
            )}
            aria-label="Next image"
          >
            <i className="fa-solid fa-arrow-right text-sm" />
          </button>
        </>
      )}

      {/* Pagination dots */}
      {hasMultiple && (
        <div className={cn(
          "absolute left-1/2 -translate-x-1/2 z-20 pointer-events-auto",
          contained ? "bottom-6" : "bottom-3"
        )}>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-zinc-950/85 backdrop-blur-sm">
            {sortedAssets.map((asset, index) => (
              <button
                key={asset.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  goToSlide(index)
                }}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-all duration-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1',
                  index === currentIndex
                    ? 'bg-white w-2.5'
                    : 'bg-white/50 hover:bg-white/75'
                )}
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === currentIndex ? 'true' : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Slide counter badge */}
      {/* Note: left-6 on mobile accounts for -mx-4 negative margin on PostCard media container */}
      {hasMultiple && (
        <div className={cn(
          "absolute left-6 md:left-2 z-20",
          contained ? "top-4" : "top-2"
        )}>
          <div className="inline-flex items-center h-6 px-3 rounded-full bg-zinc-950/85 backdrop-blur-sm">
            <span className="text-[10px] text-white font-semibold tracking-[0.2px]">
              {currentIndex + 1}/{totalCount}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default MediaCarousel
