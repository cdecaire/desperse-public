/**
 * Tag Page
 * Displays posts with a specific hashtag
 */

import { createFileRoute, Link } from '@tanstack/react-router'
import { useRef, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTag, useTagFeed, getTagFeedPosts } from '@/hooks/useTagFeed'
import { usePostCountsPolling } from '@/hooks/usePostCountsPolling'
import { PostCard } from '@/components/feed/PostCard'
import { FeedSkeleton } from '@/components/feed/PostCardSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { PullToRefresh } from '@/components/shared/PullToRefresh'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/tag/$tagSlug')({
  component: TagPage,
})

function TagPage() {
  const { tagSlug } = Route.useParams()
  const { isReady } = useAuth()
  const { user } = useCurrentUser()
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Fetch tag info
  const {
    data: tag,
    isLoading: isTagLoading,
  } = useTag(tagSlug, isReady)

  // Fetch posts for this tag
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useTagFeed({
    tagSlug,
    enabled: isReady,
  })

  const posts = getTagFeedPosts(data)

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await refetch()
  }, [refetch])

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

  // Loading state
  if (!isReady || (isLoading && isTagLoading)) {
    return (
      <div>
        <TagPageHeader isLoading />
        <FeedSkeleton count={3} />
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div>
        <TagPageHeader tagSlug={tagSlug} />
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
        <TagPageHeader
          tagSlug={tagSlug}
          tagDisplay={tag?.display}
          usageCount={tag?.usageCount}
          loadedPostCount={posts.length}
        />

        {/* Posts list */}
        {posts.length === 0 ? (
          <EmptyState
            icon={<i className="fa-regular fa-hashtag text-4xl" />}
            title="No posts yet"
            description={`No posts have been tagged with #${tagSlug}`}
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

interface TagPageHeaderProps {
  tagSlug?: string
  tagDisplay?: string | null
  usageCount?: number
  loadedPostCount?: number
  isLoading?: boolean
}

function TagPageHeader({
  tagSlug,
  tagDisplay,
  usageCount,
  loadedPostCount,
  isLoading,
}: TagPageHeaderProps) {
  if (isLoading) {
    return (
      <div className="py-6 mb-4 border-b border-border">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-24" />
      </div>
    )
  }

  const displayName = tagDisplay || tagSlug
  // Use usageCount from DB if available and > 0, otherwise fall back to loaded post count
  const postCount = (usageCount && usageCount > 0) ? usageCount : (loadedPostCount ?? 0)

  return (
    <div className="py-6 mb-4 border-b border-border">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
          <i className="fa-solid fa-hashtag text-xl text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">#{displayName}</h1>
          <p className="text-sm text-muted-foreground">
            {postCount === 1 ? '1 post' : `${postCount.toLocaleString()} posts`}
          </p>
        </div>
      </div>
    </div>
  )
}
