/**
 * ExploreSearchResults Component
 * The "search takes over the grid" state for /explore: when a query is active
 * the Browse views step aside and this renders the matching posts, narrowed by
 * the active Type filter. Search is just another filter on the one Explore
 * view — matching accounts are surfaced by the SearchBar dropdown on the way
 * in, so results stay a single post grid with no sub-sections.
 */

import type { ComponentProps } from 'react'
import { GalleryGrid } from '@/components/gallery/GalleryGrid'
import { toGalleryPost } from '@/components/gallery/mapPost'
import { EmptyState } from '@/components/shared/EmptyState'
import { Icon } from '@/components/ui/icon'
import { useSearchResults } from '@/hooks/useExploreQuery'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { ExplorePostTypeFilter } from './exploreFilters'

type AlignedGrid = ComponentProps<typeof GalleryGrid>['alignedGrid']

interface ExploreSearchResultsProps {
  query: string
  postType: ExplorePostTypeFilter
  alignedGrid: AlignedGrid
}

export function ExploreSearchResults({
  query,
  postType,
  alignedGrid,
}: ExploreSearchResultsProps) {
  const { user: currentUser } = useCurrentUser()
  const { data, isLoading, isError } = useSearchResults(query, currentUser?.id)

  const allPosts = (data?.posts || []) as Array<{ type?: string }>
  const posts =
    postType === 'all' ? allPosts : allPosts.filter((p) => p.type === postType)

  if (isError) {
    return (
      <EmptyState
        icon={<Icon name="triangle-exclamation" variant="regular" className="text-4xl" />}
        title="Search failed"
        description="Please try again."
      />
    )
  }

  if (isLoading) {
    return (
      <GalleryGrid
        posts={[]}
        isLoading
        skeletonCount={8}
        eagerCount={4}
        alignedGrid={alignedGrid}
      />
    )
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={<Icon name="magnifying-glass" variant="regular" className="text-4xl" />}
        title="No results"
        description={`No results found for "${query}".`}
      />
    )
  }

  return (
    <GalleryGrid
      posts={posts.map((p) => toGalleryPost(p as never))}
      eagerCount={4}
      alignedGrid={alignedGrid}
    />
  )
}

export default ExploreSearchResults
