/**
 * PostMedia Component
 * Handles rendering of different media types (image, video, audio) in posts
 * Supports multi-asset carousel for Phase 1 multi-asset posts
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { formatPrice } from './postDisplay'
import { PriceTooltip } from './PriceTooltip'
import { ModelViewer } from '@/components/shared/ModelViewer'
import { useGatedDownload } from '@/hooks/useGatedDownload'
import { getResponsiveImageProps } from '@/lib/imageUrl'
import { MediaCarousel, type CarouselAsset } from './MediaCarousel'

export type MediaType = 'image' | 'video' | 'audio' | 'document' | '3d'

interface PostMediaProps {
  mediaUrl: string
  coverUrl?: string | null
  mediaType?: MediaType
  alt?: string
  className?: string
  aspectRatio?: 'square' | 'video' | 'auto'
  lazy?: boolean
  onClick?: () => void
  preview?: boolean // If true, shows only cover image with icon overlay (no interactive controls)
  price?: number | null
  currency?: 'SOL' | 'USDC' | null
  /** Whether the user has purchased/collected this item (for paid PDF/ZIP access control) */
  hasAccess?: boolean
  /** Post type - used to determine if access control applies */
  postType?: 'post' | 'collectible' | 'edition'
  /** Asset ID from postAssets table (for protected downloads) */
  assetId?: string | null
  /** If true, removes rounded corners and border (useful for preview modals) */
  noBorder?: boolean
  /**
   * Max aspect ratio (height/width) for feed display.
   * E.g., 1.25 = 4:5 portrait max. Images taller than this are contained with blurred background.
   * When undefined, no max height constraint is applied (useful for detail views).
   */
  maxAspectRatio?: number
  /** Creator royalty in basis points (0-1000 = 0-10%) for price tooltip */
  sellerFeeBasisPoints?: number | null
  /**
   * If true, media displays at natural size with object-contain, constrained by parent.
   * Used for desktop detail view where media should be centered within container.
   */
  contained?: boolean
  /** Status pill text (e.g., "Sold", "Sold Out") for document/3D types */
  statusPillText?: string | null
  /** Background color for the status pill */
  statusPillColor?: string
  /** Multi-asset support: array of carousel assets. When provided with >1 item, renders carousel */
  assets?: CarouselAsset[]
}

/**
 * Detect media type from URL (fallback if not provided)
 */
function detectMediaType(url: string): MediaType {
  const extension = url.split('.').pop()?.toLowerCase()?.split('?')[0]
  
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(extension || '')) {
    return 'image'
  }
  if (['mp4', 'webm', 'mov'].includes(extension || '')) {
    return 'video'
  }
  if (['mp3', 'wav', 'ogg', 'aac'].includes(extension || '')) {
    return 'audio'
  }
  if (['pdf', 'zip'].includes(extension || '')) {
    return 'document'
  }
  if (['glb', 'gltf'].includes(extension || '')) {
    return '3d'
  }
  
  return 'image' // Default fallback
}

export function PostMedia({
  mediaUrl,
  coverUrl,
  mediaType: providedMediaType,
  alt = 'Post media',
  className,
  aspectRatio = 'auto',
  lazy = true,
  onClick,
  preview = false,
  price,
  currency,
  hasAccess = true, // Default to true for backward compatibility
  postType,
  assetId,
  noBorder = false,
  maxAspectRatio,
  sellerFeeBasisPoints,
  contained = false,
  statusPillText,
  statusPillColor,
  assets,
}: PostMediaProps) {

  // Multi-asset carousel: if assets array has >1 item, render carousel
  // This takes precedence over single-asset rendering
  if (assets && assets.length > 1) {
    return (
      <MediaCarousel
        assets={assets}
        alt={alt}
        className={className}
        maxAspectRatio={maxAspectRatio}
        lazy={lazy}
        onClick={onClick}
        preview={preview}
        contained={contained}
      />
    )
  }

  // For editions, we use the gated download flow which returns the direct URL after auth
  // The mediaUrl is used for display, but clicking triggers the auth flow via useGatedDownload
  const effectiveMediaUrl = mediaUrl
  const [isLoaded, setIsLoaded] = useState(false)
  // Track if media is taller than maxAspectRatio (e.g., taller than 4:5)
  const [isExtraTall, setIsExtraTall] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  const [_isInView, setIsInView] = useState(false)
  const [wasManuallyPlayed, setWasManuallyPlayed] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Hook for gated downloads
  const { downloadProtectedAsset, isAuthenticating } = useGatedDownload()
  
  // Use original mediaUrl for type detection (file extension)
  const mediaType = providedMediaType || detectMediaType(mediaUrl)
  
  const aspectClass = {
    square: 'aspect-square',
    video: 'aspect-video',
    auto: '',
  }[aspectRatio]

  const containerClass = cn(
    'relative overflow-hidden',
    contained ? 'absolute inset-0' : 'w-full bg-muted/30',
    !noBorder && 'rounded-none lg:rounded-lg border-0 lg:border border-border',
    aspectClass,
    onClick && 'cursor-pointer',
    className
  )

  const handleVideoPlayPause = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
        setWasManuallyPlayed(true) // Mark as manually played
      }
      setIsPlaying(!isPlaying)
    }
    onClick?.()
  }

  const handleVideoMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  // Intersection Observer for auto-play on scroll (Instagram-like)
  useEffect(() => {
    if (mediaType !== 'video' || !containerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = videoRef.current
          if (!video) return

          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            // Video is in view and at least 50% visible
            setIsInView(true)
            // Auto-play muted videos when they come into view (only if not manually paused)
            if (isMuted && !wasManuallyPlayed) {
              video.play().catch(() => {
                // Auto-play failed (likely due to browser policy)
                // This is expected on some browsers/devices
              })
            }
          } else {
            // Video is out of view or less than 50% visible
            setIsInView(false)
            // Only auto-pause if it was auto-played (not manually played)
            if (!wasManuallyPlayed && !video.paused) {
              video.pause()
            }
          }
        })
      },
      {
        threshold: [0, 0.5, 1],
        rootMargin: '0px',
      }
    )

    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
    }
  }, [mediaType, isMuted, wasManuallyPlayed])

  const handleAudioPlayPause = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
    onClick?.()
  }

  // Generate optimized image props for responsive loading
  // Uses srcSet to serve appropriately sized images for different viewports
  // For images, always use the original mediaUrl (not the protected API endpoint)
  // since images are displayed publicly and Vercel's image optimization needs direct access
  const optimizedImageProps = useMemo(() => {
    return getResponsiveImageProps(mediaUrl, {
      // Feed images: full width on mobile, ~50% on tablet, fixed on desktop
      sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 640px',
      quality: 75,
      includeRetina: true,
    })
  }, [mediaUrl])

  // Optimized cover image props (for video posters, audio covers, document covers)
  const optimizedCoverProps = useMemo(() => {
    if (!coverUrl) return null
    return getResponsiveImageProps(coverUrl, {
      sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 640px',
      quality: 75,
      includeRetina: true,
    })
  }, [coverUrl])

  // Handler to check if image is extra tall on load
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    if (maxAspectRatio) {
      const heightToWidth = img.naturalHeight / img.naturalWidth
      setIsExtraTall(heightToWidth > maxAspectRatio)
    }
    setIsLoaded(true)
  }

  // Image media
  if (mediaType === 'image') {
    // Wrap in container query context when maxAspectRatio is set
    const content = (
      <div
        className={cn(
          containerClass,
          (isExtraTall || contained) && 'flex items-center justify-center'
        )}
        style={isExtraTall && maxAspectRatio ? { height: `${maxAspectRatio * 100}cqi` } : undefined}
        onClick={onClick}
      >
        {/* Blurred background for extra-tall images or contained mode */}
        {(isExtraTall || contained) && isLoaded && (
          <img
            src={optimizedImageProps.src}
            srcSet={optimizedImageProps.srcSet || undefined}
            sizes={optimizedImageProps.sizes || undefined}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover blur-3xl scale-110 opacity-60"
          />
        )}

        {!isLoaded && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
          </div>
        )}
        {hasError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <i className="fa-regular fa-image-slash text-2xl mb-2" />
            <span className="text-sm">Failed to load</span>
          </div>
        ) : (
          <img
            src={optimizedImageProps.src}
            srcSet={optimizedImageProps.srcSet || undefined}
            sizes={optimizedImageProps.sizes || undefined}
            alt={alt}
            loading={lazy ? 'lazy' : 'eager'}
            decoding="async"
            className={cn(
              'transition-opacity duration-300',
              contained
                ? 'w-full h-full object-contain relative z-10'
                : isExtraTall
                  ? 'max-w-full max-h-full w-auto h-auto object-contain relative z-10'
                  : 'w-full h-full object-cover',
              isLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={handleImageLoad}
            onError={() => setHasError(true)}
          />
        )}
      </div>
    )

    // Wrap with container query context when maxAspectRatio is provided
    if (maxAspectRatio) {
      return (
        <div className="@container">
          {content}
        </div>
      )
    }

    return content
  }

  // Handler to check if video is extra tall on metadata load
  const handleVideoMetadata = () => {
    const video = videoRef.current
    if (video && maxAspectRatio) {
      const heightToWidth = video.videoHeight / video.videoWidth
      setIsExtraTall(heightToWidth > maxAspectRatio)
    }
    setIsLoaded(true)
  }

  // Video media
  if (mediaType === 'video') {
    // Preview mode: show playing video without interactive controls
    if (preview) {
      // Set webkit-playsinline via ref for iOS compatibility
      useEffect(() => {
        if (videoRef.current) {
          videoRef.current.setAttribute('webkit-playsinline', 'true')
          videoRef.current.setAttribute('x5-playsinline', 'true')
        }
      }, [])

      // Intersection Observer for auto-play on scroll (Instagram-like)
      useEffect(() => {
        if (!containerRef.current) return

        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              const video = videoRef.current
              if (!video) return

              if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                // Video is in view and at least 50% visible - auto-play muted
                video.play().catch(() => {
                  // Auto-play failed (likely due to browser policy)
                })
              } else {
                // Video is out of view or less than 50% visible - pause
                if (!video.paused) {
                  video.pause()
                }
              }
            })
          },
          {
            threshold: [0, 0.5, 1],
            rootMargin: '0px',
          }
        )

        observer.observe(containerRef.current)

        return () => {
          observer.disconnect()
        }
      }, [])

      const previewContent = (
        <div
          ref={containerRef}
          className={cn(
            containerClass,
            (isExtraTall || contained) && 'flex items-center justify-center',
            // Add aspect-video fallback for videos without cover to ensure container has height
            !coverUrl && !isLoaded && 'aspect-video'
          )}
          style={isExtraTall && maxAspectRatio ? { height: `${maxAspectRatio * 100}cqi` } : undefined}
          onClick={onClick}
        >
          {/* Blurred background for extra-tall videos or contained mode */}
          {(isExtraTall || contained) && coverUrl && optimizedCoverProps && (
            <img
              src={optimizedCoverProps.src}
              srcSet={optimizedCoverProps.srcSet || undefined}
              sizes={optimizedCoverProps.sizes || undefined}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover blur-3xl scale-110 opacity-60"
            />
          )}

          {/* Error state for video */}
          {hasError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-muted/30 z-10">
              <i className="fa-regular fa-video-slash text-2xl mb-2" />
              <span className="text-sm">Failed to load video</span>
            </div>
          ) : (
            <video
              ref={videoRef}
              src={effectiveMediaUrl}
              poster={coverUrl || undefined}
              className={cn(
                contained
                  ? 'w-full h-full object-contain relative z-10'
                  : isExtraTall
                    ? 'max-w-full max-h-full w-auto h-auto object-contain relative z-10'
                    : 'w-full h-full object-cover'
              )}
              preload="auto"
              playsInline
              loop
              muted
              onLoadedData={() => setIsLoaded(true)}
              onLoadedMetadata={handleVideoMetadata}
              onError={() => setHasError(true)}
            >
              <track kind="captions" />
            </video>
          )}

          {/* Video indicator icon */}
          {!hasError && (
            <div className="absolute top-2 right-2 pointer-events-none z-20">
              <div className="w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                <i className="fa-solid fa-play text-[10px] text-white" />
              </div>
            </div>
          )}
        </div>
      )

      if (maxAspectRatio) {
        return (
          <div className="@container">
            {previewContent}
          </div>
        )
      }

      return previewContent
    }

    // Set webkit-playsinline via ref for iOS compatibility
    useEffect(() => {
      if (videoRef.current) {
        // iOS Safari requires this attribute to be set directly on the element
        videoRef.current.setAttribute('webkit-playsinline', 'true')
        videoRef.current.setAttribute('x5-playsinline', 'true') // For some Android browsers
      }
    }, [])

    const videoContent = (
      <div
        ref={containerRef}
        className={cn(
          containerClass,
          (isExtraTall || contained) && 'flex items-center justify-center',
          // Add aspect-video fallback for videos without cover to ensure container has height
          !coverUrl && !isLoaded && 'aspect-video'
        )}
        style={isExtraTall && maxAspectRatio ? { height: `${maxAspectRatio * 100}cqi` } : undefined}
      >
        {/* Blurred background for extra-tall videos or contained mode */}
        {(isExtraTall || contained) && coverUrl && optimizedCoverProps && (
          <img
            src={optimizedCoverProps.src}
            srcSet={optimizedCoverProps.srcSet || undefined}
            sizes={optimizedCoverProps.sizes || undefined}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover blur-3xl scale-110 opacity-60"
          />
        )}

        {/* Error state for video */}
        {hasError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-muted/30 z-10">
            <i className="fa-regular fa-video-slash text-2xl mb-2" />
            <span className="text-sm">Failed to load video</span>
          </div>
        ) : (
          <>
            {/* Poster image overlay - shows when video isn't playing (fixes iOS display issue) */}
            {coverUrl && !isPlaying && optimizedCoverProps && (
              <img
                src={optimizedCoverProps.src}
                srcSet={optimizedCoverProps.srcSet || undefined}
                sizes={optimizedCoverProps.sizes || undefined}
                alt={alt}
                decoding="async"
                className={cn(
                  'absolute inset-0 w-full h-full transition-opacity duration-300',
                  (isExtraTall || contained) ? 'object-contain z-10' : 'object-cover z-10'
                )}
                aria-hidden="true"
              />
            )}
          </>
        )}

        <video
          ref={videoRef}
          src={effectiveMediaUrl}
          poster={coverUrl || undefined}
          className={cn(
            contained
              ? 'w-full h-full object-contain relative z-10'
              : isExtraTall
                ? 'max-w-full max-h-full w-auto h-auto object-contain relative z-10'
                : 'w-full h-full object-cover',
            !isPlaying && coverUrl && 'opacity-0', // Hide video when poster overlay is showing
            hasError && 'hidden' // Hide video element when there's an error
          )}
          preload="auto"
          playsInline
          loop
          muted={isMuted}
          onPlay={() => {
            setIsPlaying(true)
            setIsLoaded(true)
          }}
          onPause={() => {
            setIsPlaying(false)
            // Reset manual play flag when video ends or is paused
            if (videoRef.current?.ended) {
              setWasManuallyPlayed(false)
            }
          }}
          onLoadedData={() => setIsLoaded(true)}
          onLoadedMetadata={handleVideoMetadata}
          onError={() => setHasError(true)}
        >
          <track kind="captions" />
        </video>

        {/* Media controls overlay */}
        {!hasError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            {!isPlaying && (
              <Button
                variant="ghost"
                size="icon-lg"
                className="rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/60 text-white pointer-events-auto"
                onClick={handleVideoPlayPause}
                aria-label="Play video"
              >
                <i className="fa-solid fa-play text-2xl ml-1" />
              </Button>
            )}
          </div>
        )}

        {/* Bottom controls */}
        {!hasError && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-linear-to-t from-black/60 to-transparent pointer-events-none z-20">
            <div className="flex items-center justify-end gap-2 pointer-events-auto">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/60 text-white"
                onClick={handleVideoMute}
                aria-label={isMuted ? 'Unmute video' : 'Mute video'}
              >
                <i className={isMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high'} />
              </Button>
              {isPlaying && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/60 text-white"
                  onClick={handleVideoPlayPause}
                  aria-label="Pause video"
                >
                  <i className="fa-solid fa-pause" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    )

    if (maxAspectRatio) {
      return (
        <div className="@container">
          {videoContent}
        </div>
      )
    }

    return videoContent
  }

  // Audio media
  if (mediaType === 'audio') {
    const displayImage = coverUrl || null

    // Optimize audio cover image
    const optimizedAudioCoverProps = displayImage ? getResponsiveImageProps(displayImage, {
      sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 640px',
      quality: 75,
      includeRetina: true,
    }) : null

    // Handler for audio cover image load to check aspect ratio
    const handleAudioCoverLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget
      if (maxAspectRatio) {
        const heightToWidth = img.naturalHeight / img.naturalWidth
        setIsExtraTall(heightToWidth > maxAspectRatio)
      }
      setIsLoaded(true)
    }

    // Preview mode: show only cover image with music icon overlay
    if (preview) {
      const previewContent = (
        <div
          className={cn(containerClass, !displayImage && 'aspect-square', (isExtraTall || contained) && 'flex items-center justify-center')}
          style={isExtraTall && maxAspectRatio ? { height: `${maxAspectRatio * 100}cqi` } : undefined}
          onClick={onClick}
        >
          {/* Blurred background for extra-tall audio covers or contained mode */}
          {(isExtraTall || contained) && displayImage && optimizedAudioCoverProps && (
            <img
              src={optimizedAudioCoverProps.src}
              srcSet={optimizedAudioCoverProps.srcSet || undefined}
              sizes={optimizedAudioCoverProps.sizes || undefined}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover blur-3xl scale-110 opacity-60"
            />
          )}

          {displayImage && optimizedAudioCoverProps ? (
            <img
              src={optimizedAudioCoverProps.src}
              srcSet={optimizedAudioCoverProps.srcSet || undefined}
              sizes={optimizedAudioCoverProps.sizes || undefined}
              alt={alt}
              loading={lazy ? 'lazy' : 'eager'}
              decoding="async"
              className={cn(
                'transition-opacity duration-300',
                contained
                  ? 'w-full h-full object-contain relative z-10'
                  : isExtraTall
                    ? 'max-w-full max-h-full w-auto h-auto object-contain relative z-10'
                    : 'w-full h-full object-cover',
                isLoaded ? 'opacity-100' : 'opacity-0'
              )}
              onLoad={handleAudioCoverLoad}
              onError={() => setHasError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-muted to-muted/50">
              <i className="fa-regular fa-music text-6xl text-muted-foreground/50" />
            </div>
          )}

          {/* Audio indicator icon */}
          <div className="absolute top-2 right-2 z-20">
            <div className="w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <i className="fa-solid fa-music text-[10px] text-white" />
            </div>
          </div>
        </div>
      )

      if (maxAspectRatio && displayImage) {
        return (
          <div className="@container">
            {previewContent}
          </div>
        )
      }

      return previewContent
    }

    useEffect(() => {
      if (audioRef.current) {
        const audio = audioRef.current
        const handlePlay = () => setIsPlaying(true)
        const handlePause = () => setIsPlaying(false)
        const handleTimeUpdate = () => {
          if (audio) {
            setAudioCurrentTime(audio.currentTime)
            setAudioProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0)
          }
        }
        const handleLoadedMetadata = () => {
          if (audio) {
            setAudioDuration(audio.duration)
          }
        }

        audio.addEventListener('play', handlePlay)
        audio.addEventListener('pause', handlePause)
        audio.addEventListener('timeupdate', handleTimeUpdate)
        audio.addEventListener('loadedmetadata', handleLoadedMetadata)

        return () => {
          audio.removeEventListener('play', handlePlay)
          audio.removeEventListener('pause', handlePause)
          audio.removeEventListener('timeupdate', handleTimeUpdate)
          audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
        }
      }
    }, [])

    const audioContent = (
      <div
        className={cn(containerClass, !displayImage && 'aspect-square', (isExtraTall || contained) && 'flex items-center justify-center')}
        style={isExtraTall && maxAspectRatio ? { height: `${maxAspectRatio * 100}cqi` } : undefined}
      >
        {/* Blurred background for extra-tall audio covers or contained mode */}
        {(isExtraTall || contained) && displayImage && optimizedAudioCoverProps && (
          <img
            src={optimizedAudioCoverProps.src}
            srcSet={optimizedAudioCoverProps.srcSet || undefined}
            sizes={optimizedAudioCoverProps.sizes || undefined}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover blur-3xl scale-110 opacity-60"
          />
        )}

        {/* Cover image or placeholder */}
        {displayImage && optimizedAudioCoverProps ? (
          <img
            src={optimizedAudioCoverProps.src}
            srcSet={optimizedAudioCoverProps.srcSet || undefined}
            sizes={optimizedAudioCoverProps.sizes || undefined}
            alt={alt}
            loading={lazy ? 'lazy' : 'eager'}
            decoding="async"
            className={cn(
              contained
                ? 'w-full h-full object-contain relative z-10'
                : isExtraTall
                  ? 'max-w-full max-h-full w-auto h-auto object-contain relative z-10'
                  : 'w-full h-full object-cover'
            )}
            onLoad={handleAudioCoverLoad}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-muted to-muted/50">
            <i className="fa-regular fa-music text-6xl text-muted-foreground/50" />
          </div>
        )}

        {/* Audio controls overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-linear-to-t from-black/60 to-transparent z-20">
          <div className="flex items-center gap-3 px-4 md:px-0">
            {/* Play/Pause button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/60 text-white shrink-0"
              onClick={handleAudioPlayPause}
              aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
            >
              <i className={isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play ml-0.5'} />
            </Button>

            {/* Native audio element (hidden, used for actual playback) */}
            <audio
              ref={audioRef}
              src={effectiveMediaUrl}
              preload="metadata"
              className="hidden"
            >
              Your browser does not support audio playback.
            </audio>

            {/* Custom progress bar and time display */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-white/80 font-mono tabular-nums">
                  {`${Math.floor(audioCurrentTime / 60)}:${String(Math.floor(audioCurrentTime % 60)).padStart(2, '0')}`}
                </span>
                <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (audioRef.current && audioDuration) {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const x = e.clientX - rect.left
                      const percent = x / rect.width
                      audioRef.current.currentTime = percent * audioDuration
                    }
                  }}
                >
                  <div
                    className="h-full bg-white rounded-full transition-all duration-100"
                    style={{ width: `${audioProgress}%` }}
                  />
                </div>
                <span className="text-xs text-white/80 font-mono tabular-nums">
                  {audioDuration ? `${Math.floor(audioDuration / 60)}:${String(Math.floor(audioDuration % 60)).padStart(2, '0')}` : '0:00'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )

    if (maxAspectRatio && displayImage) {
      return (
        <div className="@container">
          {audioContent}
        </div>
      )
    }

    return audioContent
  }

  // Document (PDF/ZIP) media
  if (mediaType === 'document') {
    const displayImage = coverUrl || null
    const isZip = mediaUrl.toLowerCase().endsWith('.zip')
    const fileTypeLabel = isZip ? 'ZIP' : 'PDF'
    const fileIcon = isZip ? 'fa-file-zipper' : 'fa-file-pdf'

    // Optimize document cover image
    const optimizedDocCoverProps = displayImage ? getResponsiveImageProps(displayImage, {
      sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 640px',
      quality: 75,
      includeRetina: true,
    }) : null

    // Handler for document cover image load to check aspect ratio
    const handleDocCoverLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget
      if (maxAspectRatio) {
        const heightToWidth = img.naturalHeight / img.naturalWidth
        setIsExtraTall(heightToWidth > maxAspectRatio)
      }
      setIsLoaded(true)
    }

    // Check if access should be restricted (paid editions/collectibles require purchase)
    const requiresAccess = (postType === 'edition' || postType === 'collectible') && (price !== null && price !== undefined)
    const isLocked = requiresAccess && !hasAccess

    const handleDocumentClick = async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      // Only allow download if unlocked
      if (isLocked) {
        return
      }

      // For protected downloads (editions with assetId), authenticate first
      if (postType === 'edition' && assetId && !isAuthenticating) {
        try {
          const downloadUrl = await downloadProtectedAsset(assetId)
          if (downloadUrl) {
            window.open(downloadUrl, '_blank', 'noopener,noreferrer')
            onClick?.()
          }
        } catch (error) {
          console.error('Error downloading protected asset:', error)
        }
      } else if (!isLocked) {
        // For non-protected assets, open directly
        window.open(effectiveMediaUrl, '_blank', 'noopener,noreferrer')
        onClick?.()
      }
    }

    const documentContent = (
      <div
        className={cn(
          containerClass,
          !displayImage && 'aspect-square',
          (isExtraTall || contained) && 'flex items-center justify-center',
          !isLocked && 'cursor-pointer'
        )}
        style={isExtraTall && maxAspectRatio ? { height: `${maxAspectRatio * 100}cqi` } : undefined}
        onClick={!isLocked ? handleDocumentClick : undefined}
      >
        {/* Blurred background for extra-tall document covers or contained mode */}
        {(isExtraTall || contained) && displayImage && optimizedDocCoverProps && (
          <img
            src={optimizedDocCoverProps.src}
            srcSet={optimizedDocCoverProps.srcSet || undefined}
            sizes={optimizedDocCoverProps.sizes || undefined}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover blur-3xl scale-110 opacity-60"
          />
        )}

        {displayImage && optimizedDocCoverProps ? (
          <img
            src={optimizedDocCoverProps.src}
            srcSet={optimizedDocCoverProps.srcSet || undefined}
            sizes={optimizedDocCoverProps.sizes || undefined}
            alt={alt}
            loading={lazy ? 'lazy' : 'eager'}
            decoding="async"
            className={cn(
              contained
                ? 'w-full h-full object-contain relative z-10'
                : isExtraTall
                  ? 'max-w-full max-h-full w-auto h-auto object-contain relative z-10'
                  : 'w-full h-full object-cover'
            )}
            onLoad={handleDocCoverLoad}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-linear-to-br from-muted to-muted/50">
            <i className={cn("fa-regular", fileIcon, "text-6xl text-muted-foreground/50 mb-2")} />
            <span className="text-sm text-muted-foreground">{fileTypeLabel} Document</span>
          </div>
        )}

        {/* Status and price badges */}
        {(statusPillText || (price && currency)) && (
          <div className={cn(
            "absolute pointer-events-auto z-20 flex items-center gap-1.5",
            preview ? "top-2 right-2" : "right-7 top-3 md:right-3 md:top-3"
          )}>
            {/* Status pill (Sold, Sold Out) */}
            {statusPillText && (
              <div
                className="inline-flex items-center h-6 px-3 rounded-full font-semibold backdrop-blur-sm text-white text-[10px] tracking-[0.2px]"
                style={{ backgroundColor: statusPillColor }}
              >
                {statusPillText}
              </div>
            )}
            {/* Price pill */}
            {price && currency && (
              <PriceTooltip
                price={price}
                currency={currency}
                sellerFeeBasisPoints={sellerFeeBasisPoints}
              >
                <div className="inline-flex items-center h-6 px-3 rounded-full font-semibold backdrop-blur-sm text-white text-[10px] tracking-[0.2px] bg-zinc-950/85 cursor-default">
                  {formatPrice(price, currency)}
                </div>
              </PriceTooltip>
            )}
          </div>
        )}
      </div>
    )

    if (maxAspectRatio && displayImage) {
      return (
        <div className="@container">
          {documentContent}
        </div>
      )
    }

    return documentContent
  }

  // 3D model media
  if (mediaType === '3d') {
    return (
      <div className={cn(containerClass, 'aspect-square')} onClick={onClick}>
        <ModelViewer
          src={effectiveMediaUrl}
          alt={alt}
          controls={true}
          autoRotate={true}
          cameraOrbit="auto 45deg auto"
          minCameraOrbit="auto auto 2m"
          maxCameraOrbit="auto auto 10m"
          exposure={1.2}
          shadowIntensity={0.5}
          poster={coverUrl || undefined}
          loading={lazy ? 'lazy' : 'eager'}
          interactionPrompt="auto"
          className="w-full h-full"
        />
        
        {/* Status and price badges */}
        {(statusPillText || (price && currency)) && (
          <div className={cn(
            "absolute pointer-events-auto z-10 flex items-center gap-1.5",
            preview ? "top-2 right-2" : "right-7 top-3 md:right-3 md:top-3"
          )}>
            {/* Status pill (Sold, Sold Out) */}
            {statusPillText && (
              <div
                className="inline-flex items-center h-6 px-3 rounded-full font-semibold backdrop-blur-sm text-white text-[10px] tracking-[0.2px]"
                style={{ backgroundColor: statusPillColor }}
              >
                {statusPillText}
              </div>
            )}
            {/* Price pill */}
            {price && currency && (
              <PriceTooltip
                price={price}
                currency={currency}
                sellerFeeBasisPoints={sellerFeeBasisPoints}
              >
                <div className="inline-flex items-center h-6 px-3 rounded-full font-semibold backdrop-blur-sm text-white text-[10px] tracking-[0.2px] bg-zinc-950/85 cursor-default">
                  {formatPrice(price, currency)}
                </div>
              </PriceTooltip>
            )}
          </div>
        )}
      </div>
    )
  }

  // Fallback
  return (
    <div className={cn(containerClass, 'aspect-square flex items-center justify-center')}>
      <i className="fa-regular fa-file text-4xl text-muted-foreground/50" />
    </div>
  )
}

export default PostMedia

