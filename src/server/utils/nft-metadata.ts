/**
 * NFT Metadata generation utility
 * Generates Metaplex-compatible metadata JSON for NFT posts
 * Moved from src/server/functions/posts.ts to comply with server function boundary rules
 */

import type { Category } from '@/constants/categories'

/**
 * Generate Metaplex-compatible metadata JSON for NFT posts
 * Supports both single-asset and multi-asset posts
 */
export function generateNftMetadata(post: {
  id: string
  caption: string | null
  mediaUrl: string
  coverUrl: string | null
  type: 'collectible' | 'edition'
  maxSupply: number | null
  price: number | null
  currency: 'SOL' | 'USDC' | null
  nftName?: string | null
  nftSymbol?: string | null
  nftDescription?: string | null
  sellerFeeBasisPoints?: number | null
  isMutable?: boolean | null
  categories?: Category[] | null
  protectDownload?: boolean
  assetId?: string
  // Multi-asset support (Phase 2 & 3)
  // For editions, include assetId and isPreviewable so gated downloads use API endpoints
  assets?: Array<{ id: string; url: string; mimeType: string; isPreviewable: boolean }>
}, creator: {
  displayName: string | null
  usernameSlug: string
  walletAddress: string
}) {
  // Infer MIME type from file extension
  const inferMimeType = (url: string): string => {
    const extension = url.split('.').pop()?.toLowerCase()
    const typeMap: Record<string, string> = {
      // Images
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      // Videos
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      // Audio
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      // 3D Models
      'glb': 'model/gltf-binary',
      'gltf': 'model/gltf+json',
      // Documents
      'pdf': 'application/pdf',
    }
    return typeMap[extension || ''] || 'application/octet-stream'
  }

  // Helper to check if MIME type is image
  const isImageMime = (mime: string) => mime.startsWith('image/')
  // Helper to check if MIME type is video/audio (animation)
  const isAnimationMime = (mime: string) => mime.startsWith('video/') || mime.startsWith('audio/')

  // Derive category from media type
  const deriveCategory = (url: string): string => {
    const mime = inferMimeType(url)
    if (mime.startsWith('image/')) return 'image'
    if (mime.startsWith('video/')) return 'video'
    if (mime.startsWith('audio/')) return 'audio'
    if (mime.startsWith('model/') || url.endsWith('.glb') || url.endsWith('.gltf')) return 'vr'
    return 'image' // fallback
  }

  // Name: nftName or safe fallback (caption is content-only, not used for metadata)
  const name = post.nftName?.trim() || (post.type === 'collectible' ? `Collectible #${post.id.slice(0, 8)}` : `Edition #${post.id.slice(0, 8)}`)

  // Symbol precedence: nftSymbol -> default
  const symbol = post.nftSymbol?.trim() || 'DSPRS'

  // Description: nftDescription or caption (caption is what's used on-chain)
  const description = post.nftDescription?.trim() || post.caption?.trim() || ''

  // Handle multi-asset vs single-asset
  const hasMultipleAssets = post.assets && post.assets.length > 1

  let imageUrl: string
  let animationUrl: string | undefined
  let files: Array<{ uri: string; type: string }>
  let category: string

  if (hasMultipleAssets && post.assets) {
    // Multi-asset mode: build files from all assets
    // Find first image and first video/audio for image and animation_url
    const firstImage = post.assets.find(a => isImageMime(a.mimeType))
    const firstAnimation = post.assets.find(a => isAnimationMime(a.mimeType))

    // image: first image asset, or coverUrl if provided, or first asset
    imageUrl = post.coverUrl || firstImage?.url || post.assets[0].url

    // animation_url: first video/audio if present
    animationUrl = firstAnimation?.url

    // Build files array from all assets
    // For editions with protectDownload, non-previewable assets use API endpoint URLs
    files = post.assets.map(asset => {
      // For non-previewable assets (downloads) on editions with protectDownload, use API endpoint
      if (post.protectDownload && !asset.isPreviewable && asset.id) {
        return {
          uri: `https://www.desperse.com/api/assets/${asset.id}`,
          type: asset.mimeType,
        }
      }
      // Previewable assets (images, videos) use direct URLs
      return {
        uri: asset.url,
        type: asset.mimeType,
      }
    })

    // Add cover to files if present and not already in assets
    if (post.coverUrl && !post.assets.some(a => a.url === post.coverUrl)) {
      files.push({
        uri: post.coverUrl,
        type: inferMimeType(post.coverUrl),
      })
    }

    // Category from first asset
    category = deriveCategory(post.assets[0].url)
  } else {
    // Single-asset mode (existing behavior)
    // Determine if this is a document type (ZIP, PDF, EPUB)
    const isDocumentType = post.mediaUrl.match(/\.(pdf|zip|epub)$/i)

    // Determine the image URL for NFT metadata
    // For protected documents, cover is REQUIRED (enforced in createPost validation)
    imageUrl = post.coverUrl
      ? post.coverUrl
      : (post.protectDownload && isDocumentType)
        ? post.coverUrl! // Cover is required for protected documents - validation ensures this
        : post.mediaUrl

    const mediaMime = inferMimeType(post.mediaUrl)
    const coverMime = post.coverUrl ? inferMimeType(post.coverUrl) : null
    category = deriveCategory(post.mediaUrl)

    // Build files array: always include media, conditionally include cover
    // For protected downloads (editions only), use protected API endpoint instead of direct blob URL
    const mediaUri = post.protectDownload && post.assetId
      ? `https://www.desperse.com/api/assets/${post.assetId}`
      : post.mediaUrl

    files = [
      {
        uri: mediaUri,
        type: mediaMime,
      },
      ...(post.coverUrl ? [{
        uri: post.coverUrl,
        type: coverMime || 'image/png',
      }] : []),
    ]

    // animation_url: only set if there's a cover (audio/video)
    animationUrl = post.coverUrl
      ? (post.protectDownload && post.assetId
          ? `https://www.desperse.com/api/assets/${post.assetId}`
          : post.mediaUrl)
      : undefined
  }

  const metadata = {
    name,
    symbol,
    description,
    image: imageUrl,
    animation_url: animationUrl,
    external_url: `https://www.desperse.com/post/${post.id}`,
    attributes: [
      {
        trait_type: 'Type',
        value: post.type === 'collectible' ? 'Collectible' : 'Edition',
      },
      {
        trait_type: 'Creator',
        value: creator.displayName || creator.usernameSlug,
      },
      // Only include Max Supply if not null (open edition is implied if omitted)
      ...(post.maxSupply !== null ? [{
        trait_type: 'Max Supply',
        value: post.maxSupply,
      }] : []),
      // Include categories as separate attributes (one per category)
      ...(post.categories && post.categories.length > 0
        ? post.categories.map((cat) => ({
            trait_type: 'Category',
            value: cat.display, // Use display value for on-chain metadata
          }))
        : []),
    ],
    properties: {
      files,
      category,
    },
  }

  return metadata
}
