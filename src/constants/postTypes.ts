/**
 * Post type design metadata for consistent colors/icons across the app.
 */
export type PostType = 'post' | 'collectible' | 'edition'

type PostTypeMeta = {
  id: PostType
  label: string
  description: string
  icon: string
  iconStyle: 'regular' | 'solid'
  badgeClass: string
  accentBgClass: string
  tone: string
}

// CSS variable references for theme-aware colors
// These adapt automatically to light/dark themes via src/styles.css
const toneStandard = 'var(--tone-standard)'
const toneCollectible = 'var(--tone-collectible)'
const toneEdition = 'var(--tone-edition)'

export const POST_TYPE_META: Record<PostType, PostTypeMeta> = {
  post: {
    id: 'post',
    label: 'Standard',
    description: 'Share without minting',
    icon: 'fa-circle-plus',
    iconStyle: 'solid',
    badgeClass: 'text-[var(--tone-standard)]',
    accentBgClass: 'bg-muted',
    tone: toneStandard,
  },
  collectible: {
    id: 'collectible',
    label: 'Collectible',
    description: 'Free to collect as NFT',
    icon: 'fa-gem',
    iconStyle: 'solid',
    badgeClass: 'text-[var(--tone-collectible)]',
    accentBgClass: 'bg-[var(--tone-collectible)]/10',
    tone: toneCollectible,
  },
  edition: {
    id: 'edition',
    label: 'Edition',
    description: 'Sell as NFT editions',
    icon: 'fa-image-stack',
    iconStyle: 'solid',
    badgeClass: 'text-[var(--tone-edition)]',
    accentBgClass: 'bg-[var(--tone-edition)]/10',
    tone: toneEdition,
  },
} as const

export const POST_TYPE_LIST: PostTypeMeta[] = [
  POST_TYPE_META.post,
  POST_TYPE_META.collectible,
  POST_TYPE_META.edition,
]

export const POST_TYPE_FLAG_COLORS: Record<PostType, string> = {
  post: POST_TYPE_META.post.tone,
  collectible: POST_TYPE_META.collectible.tone,
  edition: POST_TYPE_META.edition.tone,
}


