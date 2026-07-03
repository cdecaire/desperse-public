/**
 * CuratedRowPreview Component
 * Home gallery row: section title + capped GalleryGrid + "View all" link
 * into the corresponding Explore tab.
 */

import { Link } from '@tanstack/react-router'
import { GalleryGrid } from '@/components/gallery/GalleryGrid'
import type { PostCardData } from '@/components/feed/PostCard'
import type { ExploreTab } from '@/components/explore/ExploreSections'

interface CuratedRowPreviewProps {
  title: string
  posts: PostCardData[]
  isLoading: boolean
  /** Explore tab this row previews */
  viewAllTab: ExploreTab
  /** Cap on cards shown (default 8) */
  limit?: number
  /** Eagerly load the first row of images (above the fold) */
  eager?: boolean
}

export function CuratedRowPreview({
  title,
  posts,
  isLoading,
  viewAllTab,
  limit = 8,
  eager = false,
}: CuratedRowPreviewProps) {
  const capped = posts.slice(0, limit)

  // Hide the whole section when there's nothing to show
  if (!isLoading && capped.length === 0) return null

  return (
    <section className="px-6 md:px-10 space-y-6">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-heading-2">{title}</h2>
        <Link
          to="/explore"
          search={{ tab: viewAllTab }}
          className="text-label-lg text-muted-foreground hover:text-foreground motion-interactive shrink-0"
        >
          View all <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
      <GalleryGrid
        posts={capped}
        isLoading={isLoading}
        skeletonCount={limit}
        eagerCount={eager ? 4 : 0}
      />
    </section>
  )
}
