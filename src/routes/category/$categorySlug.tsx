/**
 * Category Page
 * Displays posts in a specific category
 * Only preset categories are supported - legacy custom categories return "not found"
 */

import { createFileRoute, Link } from '@tanstack/react-router'
import { useRef, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useCategoryFeed, getCategoryFeedPosts, getCategoryName } from '@/hooks/useCategoryFeed'
import { usePostCountsPolling } from '@/hooks/usePostCountsPolling'
import { PostCard } from '@/components/feed/PostCard'
import { FeedSkeleton } from '@/components/feed/PostCardSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { PullToRefresh } from '@/components/shared/PullToRefresh'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { isPresetCategory, getPresetDisplay } from '@/constants/categories'

export const Route = createFileRoute('/category/$categorySlug')({
  component: CategoryPage,
})

function CategoryPage() {
  const { categorySlug } = Route.useParams()
  const { isReady } = useAuth()
  const { user } = useCurrentUser()
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Check if this is a valid preset category
  const isValidPreset = isPresetCategory(categorySlug)
  const presetDisplay = getPresetDisplay(categorySlug)

  // Fetch posts for this category (only if valid preset)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useCategoryFeed({
    categorySlug,
    enabled: isReady && isValidPreset,
  })

  const posts = getCategoryFeedPosts(data)

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await refetch()
  }, [refetch])
  // Use the canonical preset display name, fallback to API response, then slug
  const categoryName = presetDisplay || getCategoryName(data) || categorySlug

  // Get post IDs for polling (only collectibles and editions need polling)
  const postIdsToPoll = useMemo(() => {
    return posts
      .filter((p) => p.type === 'collectible' || p.type === 'edition')
      .map((p) => p.id)
  }, [posts])

  // Poll for counts every 8 seconds
  const polledCounts = usePostCountsPolling({
    postIds: postIdsToPoll,
    enabled: postIdsToPoll.length > 0,
    intervalMs: 8000,
  })

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  )

  // Setup intersection observer
  const loadMoreCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }

      if (node) {
        observerRef.current = new IntersectionObserver(handleObserver, {
          rootMargin: '200px',
          threshold: 0.1,
        })
        observerRef.current.observe(node)
      }
    },
    [handleObserver]
  )

  // Loading state (only show if valid preset)
  if (!isReady || (isValidPreset && isLoading)) {
    return (
      <div>
        <CategoryPageHeader isLoading />
        <FeedSkeleton count={3} />
      </div>
    )
  }

  // Invalid category (not a preset) - show not found
  if (!isValidPreset) {
    return (
      <div>
        <CategoryPageHeader categoryName={categorySlug} />
        <EmptyState
          icon={<i className="fa-regular fa-folder-xmark text-4xl" />}
          title="Category not found"
          description="This category doesn't exist. Browse our preset categories or use hashtags to discover content."
          action={
            <Button asChild>
              <Link to="/explore">Explore</Link>
            </Button>
          }
        />
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div>
        <CategoryPageHeader categoryName={categoryName} />
        <EmptyState
          icon={<i className="fa-regular fa-triangle-exclamation text-4xl" />}
          title="Error loading posts"
          description={error?.message || 'Something went wrong'}
        />
      </div>
    )
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div>
        <CategoryPageHeader
          categoryName={categoryName}
          postCount={posts.length}
        />

        {/* Posts list */}
        {posts.length === 0 ? (
          <EmptyState
            icon={<i className="fa-regular fa-folder text-4xl" />}
            title="No posts yet"
            description={`No posts have been added to ${categoryName}`}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={{
                  ...post,
                  user: post.user,
                  collectCount: polledCounts[post.id]?.collectCount ?? 0,
                  currentSupply:
                    polledCounts[post.id]?.currentSupply ?? post.currentSupply ?? 0,
                }}
                currentUserId={user?.id}
              />
            ))}

            {/* Load more trigger */}
            <div ref={loadMoreCallbackRef} className="h-4" />

            {/* Loading more indicator */}
            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            )}

            {/* End of feed */}
            {!hasNextPage && posts.length > 0 && (
              <div className="text-center text-muted-foreground text-sm py-4">
                You've reached the end
              </div>
            )}
          </div>
        )}
      </div>
    </PullToRefresh>
  )
}

interface CategoryPageHeaderProps {
  categoryName?: string
  postCount?: number
  isLoading?: boolean
}

function CategoryPageHeader({
  categoryName,
  postCount,
  isLoading,
}: CategoryPageHeaderProps) {
  if (isLoading) {
    return (
      <div className="py-6 mb-4 border-b border-border">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-24" />
      </div>
    )
  }

  return (
    <div className="py-6 mb-4 border-b border-border">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
          <i className="fa-solid fa-folder text-xl text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{categoryName}</h1>
          {postCount !== undefined && postCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {postCount === 1 ? '1 post' : `${postCount.toLocaleString()} posts`}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
