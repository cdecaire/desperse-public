/**
 * GalleryGrid Component
 * Responsive gallery grid with skeleton loading, empty state, and optional
 * IntersectionObserver infinite scroll — the one canonical grid for Home,
 * Explore, and any future gallery surface.
 */

import { useEffect, useRef, type ReactNode } from 'react'
import { Col, Columns, type ColProps, type ColumnsProps } from '@cdecaire/sable/layout'
import { cn } from '@/lib/utils'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { GalleryCard } from './GalleryCard'
import type { PostCardData } from '@/components/feed/PostCard'

interface AlignedGalleryGridConfig {
  count: ColumnsProps['count']
  span: ColProps['span']
  rowGap?: string
}

interface GalleryGridProps {
  posts: PostCardData[]
  isLoading?: boolean
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  /** When provided, an IntersectionObserver sentinel triggers pagination */
  onLoadMore?: () => void
  aspect?: 'portrait' | 'square'
  /** Rendered when posts is empty and not loading */
  emptyState?: ReactNode
  skeletonCount?: number
  /** Number of leading cards to load eagerly (above-the-fold rows) */
  eagerCount?: number
  className?: string
  /** Opt into Sable column spans so cards align with the page grid overlay. */
  alignedGrid?: AlignedGalleryGridConfig
}

function GalleryCardSkeleton({ aspect }: { aspect: 'portrait' | 'square' }) {
  return (
    <div className="min-w-0">
      <div
        className={cn(
          'rounded-lg bg-muted motion-pulse',
          aspect === 'square' ? 'aspect-square' : 'aspect-4/5'
        )}
      />
      <div className="pt-2 space-y-1.5">
        <div className="h-4 w-3/4 rounded bg-muted motion-pulse" />
        <div className="h-3 w-1/2 rounded bg-muted motion-pulse" />
      </div>
    </div>
  )
}

const GRID_CLASS = 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10'
const ALIGNED_GRID_ROW_GAP = 'clamp(2rem, 1.5rem + 1vw, 2.5rem)'

function GalleryGridContainer({
  alignedGrid,
  className,
  children,
}: {
  alignedGrid?: AlignedGalleryGridConfig
  className?: string
  children: ReactNode
}) {
  if (alignedGrid) {
    return (
      <Columns
        count={alignedGrid.count}
        className={className}
        style={{ rowGap: alignedGrid.rowGap ?? ALIGNED_GRID_ROW_GAP }}
      >
        {children}
      </Columns>
    )
  }

  return <div className={cn(GRID_CLASS, className)}>{children}</div>
}

export function GalleryGrid({
  posts,
  isLoading = false,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  aspect = 'portrait',
  emptyState,
  skeletonCount = 8,
  eagerCount = 0,
  className,
  alignedGrid,
}: GalleryGridProps) {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Infinite scroll observer (only when pagination is wired)
  useEffect(() => {
    if (!onLoadMore) return
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          onLoadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      observerRef.current?.disconnect()
    }
  }, [onLoadMore, hasNextPage, isFetchingNextPage])

  if (isLoading) {
    return (
      <GalleryGridContainer alignedGrid={alignedGrid} className={className}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          alignedGrid ? (
            <Col key={i} span={alignedGrid.span} className="min-w-0">
              <GalleryCardSkeleton aspect={aspect} />
            </Col>
          ) : (
            <GalleryCardSkeleton key={i} aspect={aspect} />
          )
        ))}
      </GalleryGridContainer>
    )
  }

  if (posts.length === 0) {
    return <>{emptyState ?? null}</>
  }

  return (
    <>
      <GalleryGridContainer alignedGrid={alignedGrid} className={className}>
        {posts.map((post, i) => (
          alignedGrid ? (
            <Col key={post.id} span={alignedGrid.span} className="min-w-0">
              <GalleryCard
                post={post}
                aspect={aspect}
                eager={i < eagerCount}
              />
            </Col>
          ) : (
            <GalleryCard
              key={post.id}
              post={post}
              aspect={aspect}
              eager={i < eagerCount}
            />
          )
        ))}
      </GalleryGridContainer>

      {/* Load more sentinel — keep raw div: ref must attach to the observed DOM node */}
      {onLoadMore && (
        <div ref={loadMoreRef} className="py-8 flex justify-center">
          {isFetchingNextPage && <LoadingSpinner size="sm" />}
        </div>
      )}
    </>
  )
}
