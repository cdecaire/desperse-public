/**
 * OptimizedImage Component
 * 
 * Renders images with automatic Vercel image optimization.
 * Uses srcSet for responsive sizing and supports retina displays.
 */

import { useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  getResponsiveImageProps,
  getOptimizedImageUrl,
  type ImageWidth,
  DEFAULT_QUALITY,
} from '@/lib/imageUrl'

export interface OptimizedImageProps {
  /** Original image URL (Vercel Blob URL) */
  src: string
  /** Alt text for accessibility */
  alt: string
  /** Additional CSS classes */
  className?: string
  /** 
   * Sizes hint for browser to pick the right image from srcSet
   * Default: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 800px'
   */
  sizes?: string
  /** 
   * Fixed width mode - renders at specific width instead of responsive
   * Use this for thumbnails or when you know the exact display size
   */
  width?: ImageWidth
  /** Quality 1-100 (default: 75) */
  quality?: number
  /** Whether to include 2x retina variants (default: true) */
  includeRetina?: boolean
  /** Loading strategy (default: 'lazy') */
  loading?: 'lazy' | 'eager'
  /** Callback when image loads successfully */
  onLoad?: () => void
  /** Callback when image fails to load */
  onError?: () => void
  /** Object-fit CSS property */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  /** Object-position CSS property */
  objectPosition?: string
  /** Whether to show a fade-in animation on load */
  fadeIn?: boolean
  /** Placeholder background color while loading */
  placeholderColor?: string
}

export function OptimizedImage({
  src,
  alt,
  className,
  sizes,
  width,
  quality = DEFAULT_QUALITY,
  includeRetina = true,
  loading = 'lazy',
  onLoad,
  onError,
  objectFit = 'cover',
  objectPosition = 'center',
  fadeIn = true,
  placeholderColor = 'transparent',
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  const handleLoad = useCallback(() => {
    setIsLoaded(true)
    onLoad?.()
  }, [onLoad])

  const handleError = useCallback(() => {
    setHasError(true)
    onError?.()
  }, [onError])

  // Generate image props - either fixed width or responsive
  const imageProps = useMemo(() => {
    if (width) {
      // Fixed width mode - single optimized URL
      return {
        src: getOptimizedImageUrl(src, {
          width,
          quality,
          dpr: includeRetina ? 2 : 1,
        }),
        srcSet: undefined,
        sizes: undefined,
      }
    }

    // Responsive mode
    return getResponsiveImageProps(src, {
      sizes,
      quality,
      includeRetina,
    })
  }, [src, width, sizes, quality, includeRetina])

  // If image failed to load, show placeholder
  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted',
          className
        )}
        style={{ backgroundColor: placeholderColor }}
        aria-label={alt}
      >
        <i className="fa-regular fa-image text-muted-foreground/50 text-2xl" />
      </div>
    )
  }

  return (
    <img
      src={imageProps.src}
      srcSet={imageProps.srcSet || undefined}
      sizes={imageProps.sizes || undefined}
      alt={alt}
      loading={loading}
      decoding="async"
      onLoad={handleLoad}
      onError={handleError}
      className={cn(
        fadeIn && 'transition-opacity duration-300',
        fadeIn && !isLoaded && 'opacity-0',
        fadeIn && isLoaded && 'opacity-100',
        className
      )}
      style={{
        objectFit,
        objectPosition,
        backgroundColor: !isLoaded ? placeholderColor : undefined,
      }}
    />
  )
}

export default OptimizedImage

