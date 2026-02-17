/**
 * Image Optimization Utilities
 *
 * Uses Vercel's built-in image optimization via /_vercel/image endpoint.
 * Keeps original URLs as NFT source of truth while serving optimized
 * versions in the UI.
 *
 * In development, returns original URLs (no optimization available locally).
 * In production on Vercel, uses /_vercel/image endpoint for on-the-fly optimization.
 */

/**
 * Convert IPFS/Arweave URIs to gateway URLs
 * Handles various URI formats commonly used by NFTs
 */
export function resolveDecentralizedUri(uri: string): string {
  if (!uri) return uri

  // IPFS protocol URIs: ipfs://Qm... or ipfs://baf...
  if (uri.startsWith('ipfs://')) {
    const cid = uri.replace('ipfs://', '')
    return `https://ipfs.io/ipfs/${cid}`
  }

  // Arweave protocol URIs: ar://... or arweave://...
  if (uri.startsWith('ar://')) {
    const txId = uri.replace('ar://', '')
    return `https://arweave.net/${txId}`
  }
  if (uri.startsWith('arweave://')) {
    const txId = uri.replace('arweave://', '')
    return `https://arweave.net/${txId}`
  }

  // Already an HTTP(S) URL - return as-is
  return uri
}

/**
 * Check if we're running in a production Vercel environment
 * where image optimization is available
 */
function isVercelProduction(): boolean {
  // In development mode, skip optimization
  if (import.meta.env.DEV) {
    return false
  }
  
  // In production, assume Vercel (or check for VERCEL env if needed)
  return true
}

// Allowed widths - constrained set to maximize CDN cache hits
export const IMAGE_WIDTHS = [320, 480, 640, 800, 1200, 1600] as const
export type ImageWidth = (typeof IMAGE_WIDTHS)[number]

// Default quality for JPEG/WebP output (70-80 is good for photos)
export const DEFAULT_QUALITY = 75

// DPR values we support (1x and 2x only to limit cache explosion)
export const SUPPORTED_DPR = [1, 2] as const
export type DPR = (typeof SUPPORTED_DPR)[number]

/**
 * Domains allowed for Vercel image optimization (must match remotePatterns in vercel.json)
 * External NFT images from arbitrary domains will NOT be routed through the optimizer.
 */
const OPTIMIZABLE_DOMAINS = [
  '.blob.vercel-storage.com',
  '.public.blob.vercel-storage.com',
]

/**
 * Check if a URL is from a domain we can optimize via Vercel's image API.
 * Only Vercel Blob Storage URLs are in our remotePatterns — external NFT images
 * from arbitrary domains (arweave, IPFS gateways, creator sites, etc.) would
 * get 400 errors if routed through /_vercel/image.
 */
function isAllowedDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname
    return OPTIMIZABLE_DOMAINS.some((domain) => hostname.endsWith(domain))
  } catch {
    return false
  }
}

/**
 * Check if a URL should skip optimization
 * - Already optimized URLs
 * - GIFs (animation would break)
 * - SVGs (vector, already optimized, can break)
 * - External domains not in remotePatterns
 */
function shouldSkipOptimization(url: string): boolean {
  // Already optimized
  if (url.includes('/_vercel/image?')) {
    return true
  }

  // External domains not in our Vercel remotePatterns
  if (!isAllowedDomain(url)) {
    return true
  }

  const lowerUrl = url.toLowerCase()
  
  // Skip GIFs (preserve animation)
  if (lowerUrl.includes('.gif')) {
    return true
  }
  
  // Skip SVGs (vector graphics, optimization can break them)
  if (lowerUrl.includes('.svg')) {
    return true
  }

  return false
}

/**
 * Check if a URL points to an image that can be optimized
 */
function isOptimizableImage(url: string): boolean {
  if (shouldSkipOptimization(url)) {
    return false
  }

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp']
  const lowerUrl = url.toLowerCase()
  
  return imageExtensions.some(ext => lowerUrl.includes(ext))
}

/**
 * Snap a width to the nearest allowed width (rounding up)
 */
export function snapToAllowedWidth(width: number): ImageWidth {
  for (const allowedWidth of IMAGE_WIDTHS) {
    if (width <= allowedWidth) {
      return allowedWidth
    }
  }
  // If larger than all allowed widths, use the largest
  return IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1]
}

export interface OptimizedImageOptions {
  /** Target width in pixels */
  width: ImageWidth
  /** Quality 1-100 (default: 75) */
  quality?: number
  /** Device pixel ratio (1 or 2, for retina support) */
  dpr?: DPR
}

/**
 * Get an optimized image URL via Vercel's image optimization
 * 
 * @param originalUrl - The original Vercel Blob URL
 * @param options - Optimization options
 * @returns Optimized URL or original if optimization should be skipped
 */
export function getOptimizedImageUrl(
  originalUrl: string,
  options: OptimizedImageOptions
): string {
  // Skip optimization in development (/_vercel/image doesn't exist locally)
  if (!isVercelProduction()) {
    return originalUrl
  }

  // Skip optimization for non-optimizable images
  if (!isOptimizableImage(originalUrl)) {
    return originalUrl
  }

  const { width, quality = DEFAULT_QUALITY, dpr = 1 } = options
  
  // Calculate effective width for DPR
  const effectiveWidth = Math.min(width * dpr, IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1])
  const snappedWidth = snapToAllowedWidth(effectiveWidth)

  const params = new URLSearchParams({
    url: originalUrl,
    w: snappedWidth.toString(),
    q: quality.toString(),
  })

  return `/_vercel/image?${params.toString()}`
}

export interface ResponsiveImageProps {
  /** The src attribute (default/fallback) */
  src: string
  /** The srcSet attribute for responsive images */
  srcSet: string
  /** The sizes attribute for browser to pick correct image */
  sizes: string
}

/**
 * Generate responsive image props (src, srcSet, sizes)
 * 
 * @param originalUrl - The original Vercel Blob URL
 * @param options - Configuration options
 * @returns Props to spread on an <img> element
 */
export function getResponsiveImageProps(
  originalUrl: string,
  options: {
    /** Sizes hint for browser (default: responsive based on viewport) */
    sizes?: string
    /** Quality 1-100 (default: 75) */
    quality?: number
    /** Include 2x variants for retina displays */
    includeRetina?: boolean
  } = {}
): ResponsiveImageProps {
  const {
    sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 800px',
    quality = DEFAULT_QUALITY,
    includeRetina = true,
  } = options

  // In development or if not optimizable, return original URL with no srcSet
  if (!isVercelProduction() || !isOptimizableImage(originalUrl)) {
    return {
      src: originalUrl,
      srcSet: '',
      sizes: '',
    }
  }

  // Generate srcSet entries
  const srcSetEntries: string[] = []

  for (const width of IMAGE_WIDTHS) {
    // 1x version
    const url1x = getOptimizedImageUrl(originalUrl, { width, quality, dpr: 1 })
    srcSetEntries.push(`${url1x} ${width}w`)

    // 2x version for retina (only add if it results in a different/larger image)
    if (includeRetina && width * 2 <= IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1]) {
      const url2x = getOptimizedImageUrl(originalUrl, { width, quality, dpr: 2 })
      // Use the effective width (width * 2) as the descriptor
      srcSetEntries.push(`${url2x} ${width * 2}w`)
    }
  }

  // Dedupe (in case 2x of a smaller width equals a 1x larger width)
  const uniqueEntries = [...new Set(srcSetEntries)]

  return {
    src: getOptimizedImageUrl(originalUrl, { width: 800, quality }),
    srcSet: uniqueEntries.join(', '),
    sizes,
  }
}

/**
 * Get a thumbnail URL for feed cards and previews
 * 
 * @param originalUrl - The original Vercel Blob URL
 * @param retina - Whether to generate 2x version for retina
 */
export function getThumbnailUrl(originalUrl: string, retina = false): string {
  return getOptimizedImageUrl(originalUrl, {
    width: 480,
    quality: DEFAULT_QUALITY,
    dpr: retina ? 2 : 1,
  })
}

/**
 * Get a display URL for full post view
 * 
 * @param originalUrl - The original Vercel Blob URL
 * @param retina - Whether to generate 2x version for retina
 */
export function getDisplayUrl(originalUrl: string, retina = false): string {
  return getOptimizedImageUrl(originalUrl, {
    width: 800,
    quality: DEFAULT_QUALITY,
    dpr: retina ? 2 : 1,
  })
}

/**
 * Get a large URL for lightbox/modal view
 * 
 * @param originalUrl - The original Vercel Blob URL
 */
export function getLargeUrl(originalUrl: string): string {
  return getOptimizedImageUrl(originalUrl, {
    width: 1600,
    quality: DEFAULT_QUALITY,
  })
}

