/**
 * TrendingCreatorsRow Component
 * Homepage creator carousel — mallow-style header controls (prev/next + View
 * all), no scrollbar. Full grid lives on /explore?tab=creators.
 */

import { Link } from '@tanstack/react-router'
import { CarouselRow } from '@/components/gallery/CarouselRow'
import { CreatorCard } from '@/components/gallery/CreatorCard'
import { useFeaturedCreators } from '@/hooks/useExploreQuery'

function CreatorCardSkeleton() {
  return (
    <div className="w-72 shrink-0 rounded-lg border border-border bg-card overflow-hidden">
      <div className="h-20 bg-muted motion-pulse" />
      <div className="px-4 pb-4">
        <div className="-mt-6 mb-2 w-12 h-12 rounded-full bg-muted border-2 border-card motion-pulse" />
        <div className="h-4 w-28 rounded bg-muted motion-pulse" />
        <div className="mt-1.5 h-3 w-20 rounded bg-muted motion-pulse" />
      </div>
    </div>
  )
}

export function TrendingCreatorsRow() {
  const { data: creators, isLoading, error } = useFeaturedCreators(12)

  if (error || (!isLoading && (!creators || creators.length === 0))) {
    return null
  }

  return (
    <CarouselRow
      title="Trending Creators"
      actions={
        <Link
          to="/explore"
          search={{ tab: 'creators' }}
          className="text-label-lg text-muted-foreground hover:text-foreground motion-interactive"
        >
          View all <span aria-hidden="true">&rarr;</span>
        </Link>
      }
    >
      {isLoading
        ? Array.from({ length: 6 }).map((_, i) => <CreatorCardSkeleton key={i} />)
        : creators?.map((creator) => (
            <CreatorCard key={creator.id} creator={creator} className="w-72 shrink-0" />
          ))}
    </CarouselRow>
  )
}
