/**
 * MediaCarousel Component
 * Handles rendering multiple media items as a tap-navigable carousel.
 *
 * Migration shim (Phase 2 — Sable adoption).
 *
 * INTERNALLY this composes @cdecaire/sable's <Carousel> as the slide engine —
 * Sable owns cloning, the infinite loop, drag-to-swipe, snap, and the
 * inert/aria-hidden bookkeeping on off-screen slides. We keep Desperse's OWN
 * overlay chrome (hover-glass arrows, the bottom-center dot pill, the top-left
 * {n}/{total} counter, the video indicator) and drive it from the controlled
 * `currentIndex`. Sable's built-in arrows/dots/counter are disabled.
 *
 * The PUBLIC API is unchanged: `CarouselAsset`, `MediaCarouselProps`, and the
 * `MediaCarousel` export are byte-identical in shape to the pre-Sable version,
 * so no call site changes (PostMedia, PostCard, postAssets, CreatePostForm).
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Carousel } from '@cdecaire/sable'
import { Icon } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
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

// Drag-guard threshold: pointer travel (px) above which a release is treated as
// a swipe (Sable owns it) rather than a tap-to-open. Below this, fire onClick.
const TAP_SLOP = 6

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
  const [showControls, setShowControls] = useState(false)
  const [hoverSide, setHoverSide] = useState<'left' | 'right' | null>(null)
  const [videoPlaying, setVideoPlaying] = useState<Map<string, boolean>>(new Map())
  const [videoMuted, setVideoMuted] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  // pointer-down X per asset id, used to distinguish a tap from a drag/swipe.
  const pointerDownX = useRef<number | null>(null)

  const sortedAssets = useMemo(
    () => [...assets].sort((a, b) => a.sortOrder - b.sortOrder),
    [assets]
  )

  const totalCount = sortedAssets.length
  const currentAsset = sortedAssets[currentIndex]
  const hasMultiple = totalCount > 1

  // Apply a shared mute state to every <video> Sable has mounted (including the
  // clones it creates for the loop seam). Sable's slides live under the section
  // root, so query the wrapper.
  const applyMuteToAllVideos = useCallback((muted: boolean) => {
    const root = containerRef.current
    if (!root) return
    root.querySelectorAll('video').forEach((video) => {
      video.muted = muted
    })
  }, [])

  // ---- Video lifecycle (clone-safe) --------------------------------------
  //
  // Sable clones slides for the infinite loop, so the SAME logical video can be
  // mounted as a DUPLICATE <video>. Keying a ref map by logical index would be
  // last-writer-wins and cause double audio at the loop seam. Instead we operate
  // directly on the DOM: a slide that is off-screen is marked by Sable with
  // `inert` and/or `aria-hidden="true"`. Pause every <video> inside such a slide;
  // play the one in the on-screen (non-inert) slide if it's a muted video.
  const syncVideoPlayback = useCallback(() => {
    const root = containerRef.current
    if (!root) return
    root.querySelectorAll('video').forEach((video) => {
      const slide = video.closest('[aria-roledescription="slide"]')
      const offscreen =
        slide?.hasAttribute('inert') ||
        slide?.getAttribute('aria-hidden') === 'true'
      if (offscreen) {
        if (!video.paused) video.pause()
      } else if (video.muted) {
        // On-screen, muted → autoplay (Instagram-like). Unmuted videos are left
        // to the user's explicit play/pause control.
        video.play().catch(() => {})
      }
    })
  }, [])

  // Re-sync whenever the active slide changes. A microtask defer lets Sable
  // settle its inert/aria-hidden attributes for the new position first.
  useEffect(() => {
    const id = requestAnimationFrame(syncVideoPlayback)
    return () => cancelAnimationFrame(id)
  }, [currentIndex, syncVideoPlayback])

  // Auto-play muted videos when the carousel is >50% visible (Instagram-like),
  // pause everything when it scrolls away. Bound to the OUTER wrapper.
  useEffect(() => {
    const root = containerRef.current
    if (!root) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            syncVideoPlayback()
          } else {
            root.querySelectorAll('video').forEach((video) => {
              if (!video.paused) video.pause()
            })
          }
        })
      },
      { threshold: [0, 0.5, 1] }
    )

    observer.observe(root)
    return () => observer.disconnect()
  }, [syncVideoPlayback])

  // ---- Chrome navigation -------------------------------------------------
  // Dots/arrows drive the controlled index; Sable animates to it.
  const goToSlide = useCallback(
    (index: number) => {
      if (index === currentIndex) return
      setCurrentIndex(index)
    },
    [currentIndex]
  )

  const goPrev = useCallback(() => {
    if (!hasMultiple) return
    setCurrentIndex((i) => (i - 1 + totalCount) % totalCount)
  }, [hasMultiple, totalCount])

  const goNext = useCallback(() => {
    if (!hasMultiple) return
    setCurrentIndex((i) => (i + 1) % totalCount)
  }, [hasMultiple, totalCount])

  // ---- Per-slide media renderer ------------------------------------------
  const renderMedia = (asset: CarouselAsset, index: number) => {
    const mediaType = getMediaType(asset.mimeType)
    const isActive = index === currentIndex
    const shouldLoadEager = Math.abs(index - currentIndex) <= 1 || index === 0

    if (mediaType === 'video') {
      const isCurrentlyPlaying = videoPlaying.get(asset.id) ?? false

      const handlePlayPause = (e: React.MouseEvent) => {
        e.stopPropagation()
        // Find the on-screen <video> for this asset (the clone is inert/hidden).
        const root = containerRef.current
        if (!root) return
        const videos = root.querySelectorAll<HTMLVideoElement>(
          `video[data-asset-id="${asset.id}"]`
        )
        const video = Array.from(videos).find((v) => {
          const slide = v.closest('[aria-roledescription="slide"]')
          return !(
            slide?.hasAttribute('inert') ||
            slide?.getAttribute('aria-hidden') === 'true'
          )
        })
        if (!video) return
        if (video.paused) video.play().catch(() => {})
        else video.pause()
      }

      const handleMuteToggle = (e: React.MouseEvent) => {
        e.stopPropagation()
        const newMuted = !videoMuted
        setVideoMuted(newMuted)
        applyMuteToAllVideos(newMuted)
      }

      return (
        <div className="relative w-full h-full bg-black">
          <video
            ref={(el) => {
              if (el) {
                el.muted = videoMuted
                el.onplay = () =>
                  setVideoPlaying((prev) => new Map(prev).set(asset.id, true))
                el.onpause = () =>
                  setVideoPlaying((prev) => new Map(prev).set(asset.id, false))
              }
            }}
            data-asset-id={asset.id}
            src={asset.url}
            className="absolute inset-0 w-full h-full object-contain"
            preload={shouldLoadEager ? 'auto' : 'none'}
            playsInline
            loop
            muted={videoMuted}
            autoPlay={isActive && preview}
          >
            <track kind="captions" />
          </video>

          {/* Play/Pause center overlay */}
          {!preview && !isCurrentlyPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <Button
                variant="ghost"
                size="icon-lg"
                className="rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/60 text-white pointer-events-auto"
                onClick={handlePlayPause}
                aria-label="Play video"
              >
                <Icon name="play" className="text-2xl ml-1" />
              </Button>
            </div>
          )}

          {/* Bottom controls */}
          {!preview && (
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-linear-to-t from-black/60 to-transparent pointer-events-none z-20">
              <div className="flex items-center justify-end gap-2 pointer-events-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/60 text-white"
                  onClick={handleMuteToggle}
                  aria-label={videoMuted ? 'Unmute video' : 'Mute video'}
                >
                  <Icon name={videoMuted ? "volume-xmark" : "volume-high"} />
                </Button>
                {isCurrentlyPlaying && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/60 text-white"
                    onClick={handlePlayPause}
                    aria-label="Pause video"
                  >
                    <Icon name="pause" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )
    }

    // Image with blurred background.
    // For contained (detail view), request larger images since container can be large.
    // For feed view, 640px max is sufficient for aspect-square cards.
    const optimizedProps = getResponsiveImageProps(asset.url, {
      sizes: contained
        ? '(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1200px'
        : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 640px',
      quality: 75,
      includeRetina: true,
    })

    // Tap-to-open with a drag-guard: Sable owns pointer events for drag, so we
    // record the pointerdown X and only fire onClick when the pointer barely
    // moved (a tap, not a swipe). Video slides handle their own play/pause.
    const handlePointerDown = (e: React.PointerEvent) => {
      pointerDownX.current = e.clientX
    }
    const handlePointerUp = (e: React.PointerEvent) => {
      const startX = pointerDownX.current
      pointerDownX.current = null
      if (startX == null) return
      if (Math.abs(e.clientX - startX) < TAP_SLOP) {
        onClick?.()
      }
    }

    if (contained) {
      return (
        <div
          className="relative w-full h-full flex items-center justify-center"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          <img
            src={optimizedProps.src}
            srcSet={optimizedProps.srcSet || undefined}
            sizes={optimizedProps.sizes || undefined}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60"
          />
          <img
            src={optimizedProps.src}
            srcSet={optimizedProps.srcSet || undefined}
            sizes={optimizedProps.sizes || undefined}
            alt={`${alt} ${index + 1}`}
            loading={shouldLoadEager && !lazy ? 'eager' : 'lazy'}
            decoding="async"
            className="relative w-full h-full object-contain z-10"
          />
        </div>
      )
    }

    return (
      <div
        className="relative w-full h-full"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <img
          src={optimizedProps.src}
          srcSet={optimizedProps.srcSet || undefined}
          sizes={optimizedProps.sizes || undefined}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60"
        />
        <img
          src={optimizedProps.src}
          srcSet={optimizedProps.srcSet || undefined}
          sizes={optimizedProps.sizes || undefined}
          alt={`${alt} ${index + 1}`}
          loading={shouldLoadEager && !lazy ? 'eager' : 'lazy'}
          decoding="async"
          className="relative w-full h-full object-cover"
        />
      </div>
    )
  }

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
      role="region"
      aria-label={`Image carousel, showing ${currentIndex + 1} of ${totalCount}`}
      aria-roledescription="carousel"
    >
      {/* Sable Carousel = the slide engine. Chrome is disabled (we render our
          own below); the viewport is already rounded-lg by Sable, so the frame
          (border / conditional rounding / bg) lives on the OUTER wrapper to
          avoid double-rounding. */}
      <Carousel
        arrows={false}
        dots={false}
        counter={false}
        draggable={hasMultiple}
        loop={hasMultiple}
        index={currentIndex}
        onIndexChange={setCurrentIndex}
        label={`Image carousel, showing ${currentIndex + 1} of ${totalCount}`}
        slideClassName={
          contained ? 'h-full flex items-center justify-center' : 'aspect-square'
        }
      >
        {sortedAssets.map((asset, index) => renderMedia(asset, index))}
      </Carousel>

      {/* Video indicator for current slide */}
      {getMediaType(currentAsset?.mimeType || '') === 'video' && (
        <div className="absolute top-2 right-2 pointer-events-none z-20" aria-label="Video" role="img">
          <div className="w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <Icon name="play" className="text-[10px] text-white" aria-hidden="true" />
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
            <Icon name="arrow-left" className="text-sm" />
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
            <Icon name="arrow-right" className="text-sm" />
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
                  'shadow-[0_0_2px_rgba(0,0,0,0.5)]',
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
