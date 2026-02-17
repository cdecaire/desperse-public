import type { PostCardData } from './PostCard'
import { POST_TYPE_META } from '@/constants/postTypes'

/** Post type colors for icon highlighting when collected/purchased */
export const POST_TYPE_COLORS: Record<PostCardData['type'], string> = {
  edition: POST_TYPE_META.edition.tone,
  collectible: POST_TYPE_META.collectible.tone,
  post: POST_TYPE_META.post.tone,
}

export type PostDisplayState = {
  // bottom-left pill over media
  overlayPillText?: string
  overlayPillVariant?: 'edition' | 'collectible' | 'likes' | 'soldOut'
  // separate status pill (e.g., "Sold", "Sold Out") shown to the left of price
  statusPillText?: string
  // main CTA over media (feed) or in body (detail page)
  showCta: boolean
  ctaKind?: 'buy' | 'collect'
  ctaLabel?: string
  // simple flags
  isEdition: boolean
  isCollectible: boolean
  isStandard: boolean
}

type Options = {
  localCollectCount?: number
  localEditionSupply?: number
}

export function formatPrice(amount: number, currency: 'SOL' | 'USDC'): string {
  if (currency === 'SOL') {
    const sol = amount / 1_000_000_000
    if (sol > 0 && sol < 0.01) {
      return '~0.01 SOL'
    }
    return `${sol.toFixed(2)} SOL`
  }
  const usdc = amount / 1_000_000
  if (usdc > 0 && usdc < 0.01) {
    return '~$0.01'
  }
  return `$${usdc.toFixed(2)}`
}

/**
 * Get the edition label based on maxSupply (static identity, no numbers)
 * - null/undefined: "Open Edition"
 * - 1: "1/1"
 * - > 1: "Limited Edition"
 */
export function getEditionLabel(maxSupply: number | null | undefined): string {
  if (maxSupply === null || maxSupply === undefined) {
    return 'Open Edition'
  }
  if (maxSupply === 1) {
    return '1/1'
  }
  return 'Limited Edition'
}

/**
 * Get collection state label parts for buttons (dynamic state with numbers)
 * Returns label text and count/fraction separately for "Label (ICON) number" format
 */
export function getCollectionStateLabel(
  postType: 'edition' | 'collectible',
  isCollected: boolean,
  isSoldOut: boolean,
  currentSupply: number,
  maxSupply: number | null | undefined,
  collectCount: number
): { label: string; count: string } {
  if (postType === 'edition') {
    // Edition logic
    if (maxSupply === 1) {
      // 1/1 special case
      if (isCollected) {
        return { label: 'You own this', count: '' }
      }
      // If not collected by current user but supply is 1, someone else owns it
      if (currentSupply === 1) {
        return { label: 'Collected', count: '1/1' }
      }
      return { label: 'Collect', count: `${currentSupply}/1` }
    } else if (maxSupply !== null && maxSupply !== undefined) {
      // Limited Edition
      if (isSoldOut) {
        return { label: 'Sold Out', count: `${currentSupply}/${maxSupply}` }
      }
      if (isCollected) {
        return { label: 'Collected', count: `${currentSupply}/${maxSupply}` }
      }
      return { label: 'Collect', count: `${currentSupply}/${maxSupply}` }
    } else {
      // Open Edition
      if (isCollected) {
        return { label: 'Collected', count: `${currentSupply}` }
      }
      return { label: 'Collect', count: `${currentSupply}` }
    }
  } else {
    // Collectible (always unlimited)
    if (isCollected) {
      return { label: 'Collected', count: `${collectCount}` }
    }
    return { label: 'Collect', count: `${collectCount}` }
  }
}

export function getPostDisplayState(
  post: PostCardData,
  { localCollectCount, localEditionSupply }: Options = {}
): PostDisplayState {
  const isEdition = post.type === 'edition'
  const isCollectible = post.type === 'collectible'
  const isStandard = post.type === 'post'

  const collectCount = localCollectCount ?? post.collectCount ?? 0
  const editionSupply = localEditionSupply ?? post.currentSupply ?? 0
  const maxSupply = post.maxSupply ?? undefined

  const isCollected = !!post.isCollected
  const isSoldOut = isEdition && typeof maxSupply === 'number' && editionSupply >= maxSupply

  let overlayPillText: string | undefined
  let overlayPillVariant: PostDisplayState['overlayPillVariant']
  let statusPillText: string | undefined
  let showCta = false
  let ctaKind: PostDisplayState['ctaKind']
  let ctaLabel: string | undefined

  if (isEdition) {
    // Always show price in overlay pill when price and currency exist
    if (post.price && post.currency) {
      const priceText = formatPrice(post.price, post.currency)
      const isOneOfOne = maxSupply === 1
      const isLimitedEdition = typeof maxSupply === 'number' && maxSupply > 1

      // Show price in overlay pill
      overlayPillText = priceText
      overlayPillVariant = 'edition'

      // For 1/1 editions that are sold, show "Sold" in separate pill
      if (isOneOfOne && isSoldOut) {
        statusPillText = 'Sold'
      }
      // For limited editions that are sold out, show "Sold Out" in separate pill
      else if (isLimitedEdition && isSoldOut) {
        statusPillText = 'Sold Out'
      }
    }

    // Only show CTA button when action is possible (not sold out, not collected)
    if (!isSoldOut && !isCollected && post.price && post.currency) {
      showCta = true
      ctaKind = 'buy'
      ctaLabel = `Buy ${formatPrice(post.price, post.currency)}`
    }
  } else if (isCollectible) {
    // No overlay pill for collectibles - count is shown in action row
    if (!isCollected) {
      showCta = true
      ctaKind = 'collect'
      ctaLabel = 'Collect now'
    }
  } else if (isStandard) {
    if (collectCount && collectCount > 0) {
      overlayPillVariant = 'likes'
      overlayPillText = `${collectCount} likes`
    }
  }

  return {
    overlayPillText,
    overlayPillVariant,
    statusPillText,
    showCta,
    ctaKind,
    ctaLabel,
    isEdition,
    isCollectible,
    isStandard,
  }
}

