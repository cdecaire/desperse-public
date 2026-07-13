/**
 * CategorySpotlight Component
 * A curated-feeling row that spotlights one category's recent work.
 * NOTE: category-derived, not human-curated — a real editorial/admin
 * curation mechanism would need backend support (see project notes).
 * Self-hides when the category has no work.
 */

import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Reveal } from '@cdecaire/sable'
import { Region } from '@cdecaire/sable/layout'
import { getPostsByCategory } from '@/server/functions/categories'
import { toGalleryPost } from '@/components/gallery/mapPost'
import { GalleryGrid } from '@/components/gallery/GalleryGrid'
import { categoryToSlug } from '@/constants/categories'

interface CategorySpotlightProps {
  /** Preset category display name, e.g. "Digital Art" */
  category: string
  limit?: number
}

export function CategorySpotlight({ category, limit = 4 }: CategorySpotlightProps) {
  const slug = categoryToSlug(category)

  const { data, isLoading } = useQuery({
    queryKey: ['home-category-spotlight', slug],
    queryFn: async () => {
      const result = await getPostsByCategory({
        data: { categorySlug: slug, limit },
      } as never)
      if (!result.success) throw new Error(result.error || 'Failed to fetch category')
      return result
    },
    staleTime: 1000 * 60 * 5,
  })

  const posts = (data?.posts ?? []).map(toGalleryPost)

  // Hide entirely if the spotlight category has nothing to show
  if (!isLoading && posts.length === 0) return null

  return (
    <Region as="section" inset={false} className="px-6 md:px-10">
      <Reveal className="flex items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-label-lg text-muted-foreground mb-1">Curated</p>
          <h2 className="text-heading-2">{category}</h2>
        </div>
        <Link
          to="/explore"
          search={{ category: slug }}
          className="text-label-lg text-muted-foreground hover:text-foreground motion-interactive shrink-0"
        >
          View all <span aria-hidden="true">&rarr;</span>
        </Link>
      </Reveal>
      <Reveal delay={80}>
        <GalleryGrid posts={posts} isLoading={isLoading} skeletonCount={limit} />
      </Reveal>
    </Region>
  )
}
