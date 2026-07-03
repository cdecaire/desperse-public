/**
 * CreatorGrid Component
 * "Creators" view content — featured creators as profile cards, with infinite
 * scroll (offset pagination) so it loads more like the post feeds instead of
 * capping at a fixed set.
 */

import { useCallback, useRef } from 'react'
import { Col, Columns } from '@cdecaire/sable/layout'
import { CreatorCard } from '@/components/gallery/CreatorCard'
import {
  useFeaturedCreatorsInfinite,
  getInfiniteCreatorsList,
} from '@/hooks/useExploreQuery'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Icon } from '@/components/ui/icon'

function CreatorCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="h-20 bg-muted motion-pulse" />
      <div className="px-4 pb-4">
        <div className="-mt-6 mb-2 w-12 h-12 rounded-full bg-muted border-2 border-card motion-pulse" />
        <div className="h-4 w-28 rounded bg-muted motion-pulse" />
        <div className="mt-1.5 h-3 w-20 rounded bg-muted motion-pulse" />
        <div className="mt-3 pt-3 border-t border-border flex gap-6">
          <div className="h-8 w-12 rounded bg-muted motion-pulse" />
          <div className="h-8 w-12 rounded bg-muted motion-pulse" />
          <div className="h-8 w-12 rounded bg-muted motion-pulse" />
        </div>
      </div>
    </div>
  )
}

const CREATOR_GRID_WITH_RAIL = {
  count: { base: 12, lg: 9, xl: 10 },
  span: { base: 12, sm: 6, md: 4, lg: 3, xl: 2 },
} as const

const CREATOR_GRID_FULL = {
  count: 12,
  span: { base: 12, sm: 6, md: 4, lg: 3, xl: 2 },
} as const

export function CreatorGrid({
  pageSize = 24,
  railCollapsed = false,
}: {
  pageSize?: number
  railCollapsed?: boolean
}) {
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFeaturedCreatorsInfinite(pageSize)
  const creators = getInfiniteCreatorsList(data)
  const alignedGrid = railCollapsed ? CREATOR_GRID_FULL : CREATOR_GRID_WITH_RAIL

  // Infinite-scroll sentinel (CreatorCards can't ride GalleryGrid's built-in
  // observer, so this grid keeps its own).
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect()
      if (node) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
              fetchNextPage()
            }
          },
          { rootMargin: '200px', threshold: 0.1 }
        )
        observerRef.current.observe(node)
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  )

  if (error || (!isLoading && creators.length === 0)) {
    return (
      <EmptyState
        icon={<Icon name="users" variant="regular" className="text-4xl" />}
        title="No creators yet"
        description="Featured creators will show up here as work gets published."
      />
    )
  }

  return (
    <>
      <Columns count={alignedGrid.count} style={{ rowGap: '1rem' }}>
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Col key={i} span={alignedGrid.span} className="min-w-0">
                <CreatorCardSkeleton />
              </Col>
            ))
          : creators.map((creator) => (
              <Col key={creator.id} span={alignedGrid.span} className="min-w-0">
                <CreatorCard creator={creator} />
              </Col>
            ))}
      </Columns>

      {!isLoading && (
        <>
          <div ref={loadMoreRef} className="h-4" />
          {isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <LoadingSpinner size="sm" />
            </div>
          )}
          {!hasNextPage && creators.length > 0 && (
            <div className="py-4 text-center text-body-sm text-muted-foreground">
              You've reached the end
            </div>
          )}
        </>
      )}
    </>
  )
}

export default CreatorGrid
