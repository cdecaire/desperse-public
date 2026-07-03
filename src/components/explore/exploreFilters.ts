import type { ExploreTab } from './ExploreSections'

export type ExplorePostTypeFilter = 'all' | 'post' | 'collectible' | 'edition'
export type ExploreFeedPostType = Exclude<ExplorePostTypeFilter, 'all'>

export const EXPLORE_POST_TYPE_FILTERS: Array<{
  id: ExplorePostTypeFilter
  label: string
  icon: string
}> = [
  { id: 'all', label: 'All', icon: 'images' },
  { id: 'post', label: 'Standard', icon: 'image' },
  { id: 'collectible', label: 'Collectibles', icon: 'gem' },
  { id: 'edition', label: 'Editions', icon: 'layer-group' },
]

export function isExploreTab(value: unknown): value is ExploreTab {
  return value === 'new' || value === 'minting' || value === 'trending' || value === 'creators'
}

export function isExplorePostTypeFilter(value: unknown): value is ExplorePostTypeFilter {
  return value === 'all' || value === 'post' || value === 'collectible' || value === 'edition'
}

export function toExploreFeedPostType(type: ExplorePostTypeFilter): ExploreFeedPostType | undefined {
  return type === 'all' ? undefined : type
}

export function buildExploreSearch(
  tab: ExploreTab,
  type: ExplorePostTypeFilter,
  q?: string,
  category?: string,
) {
  const trimmed = q?.trim()
  return {
    ...(tab === 'trending' ? {} : { tab }),
    ...(type === 'all' ? {} : { type }),
    ...(trimmed ? { q: trimmed } : {}),
    ...(category ? { category } : {}),
  }
}
