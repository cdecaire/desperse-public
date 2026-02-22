/**
 * TrendingPosts Component
 * Displays trending or recent posts with infinite scroll
 */

import { useEffect, useRef, useCallback } from 'react'
import { Icon } from '@/components/ui/icon'
import { useTrendingPosts, getTrendingPostsList, getTrendingSectionTitle } from '@/hooks/useExploreQuery'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PostCard } from '@/components/feed/PostCard'
import { FeedSkeleton } from '@/components/feed/PostCardSkeleton'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { PullToRefresh } from '@/components/shared/PullToRefresh'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

export function TrendingPosts() {
  const { isAuthenticated, isReady } = useAuth()
  const { user: currentUser, isLoading: isUserLoading } = useCurrentUser()
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Wait for auth to be fully ready before fetching to prevent double-fetch
  // isReady: Privy auth state is determined
  // !isUserLoading: User data query has completed (if authenticated)
  const isAuthReady = isReady && !isUserLoading

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useTrendingPosts(currentUser?.id, isAuthReady)

  const posts = getTrendingPostsList(data)
  const sectionTitle = getTrendingSectionTitle(data)

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
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
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Loading state
  if (isLoading) {
    return (
      <section className="pt-2">
        <h2 className="text-sm font-semibold text-muted-foreground px-4 md:px-2 mb-3">
          Trending
        </h2>
        <FeedSkeleton count={3} />
      </section>
    )
  }

  // Error state
  if (isError) {
    return (
      <section className="pt-2">
        <h2 className="text-sm font-semibold text-muted-foreground px-4 md:px-2 mb-3">
          Trending
        </h2>
        <EmptyState
          icon={<Icon name="triangle-exclamation" variant="regular" className="text-4xl" />}
          title="Couldn't load posts"
          description={error?.message || 'Check your connection and try again.'}
          action={
            <Button onClick={() => refetch()} variant="outline">
              <Icon name="arrow-rotate-right" variant="regular" className="mr-2" />
              Retry
            </Button>
          }
        />
      </section>
    )
  }

  // Empty state
  if (posts.length === 0) {
    return (
      <section className="pt-2">
        <h2 className="text-sm font-semibold text-muted-foreground px-4 md:px-2 mb-3">
          Trending
        </h2>
        <EmptyState
          icon={<Icon name="fire" variant="regular" className="text-4xl" />}
          title="Nothing trending yet"
          description="Be the first to create something amazing!"
          action={
            isAuthenticated
              ? { label: 'Create Post', to: '/create' }
              : { label: 'Sign in to publish', to: '/login' }
          }
        />
      </section>
    )
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <section className="pt-2">
        {/* Section header */}
        <h2 className="text-sm font-semibold text-muted-foreground px-4 md:px-2 mb-3">
          {sectionTitle}
        </h2>

        {/* Posts list */}
        <div className="space-y-6 -mx-4 md:mx-0">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={{
                id: post.id,
                type: post.type,
                mediaUrl: post.mediaUrl,
                coverUrl: post.coverUrl,
                caption: post.caption,
                price: post.price,
                currency: post.currency,
                maxSupply: post.maxSupply,
                currentSupply: post.currentSupply ?? 0,
                collectCount: post.collectCount ?? 0,
                createdAt: post.createdAt,
                user: post.user,
                metadataUrl: post.metadataUrl,
                masterMint: post.masterMint,
                collectibleAssetId: (post as any).collectibleAssetId,
                assetId: (post as any).assetId,
                isHidden: (post as any).isHidden,
                assets: (post as any).assets,
                mintWindowStart: post.mintWindowStart,
                mintWindowEnd: post.mintWindowEnd,
              }}
              currentUserId={currentUser?.id}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>

        {/* Load more trigger */}
        <div ref={loadMoreRef} className="py-8 flex justify-center">
          {isFetchingNextPage && <LoadingSpinner size="md" />}
          {!hasNextPage && posts.length > 0 && (
            <p className="text-sm text-muted-foreground">You've reached the end</p>
          )}
        </div>
      </section>
    </PullToRefresh>
  )
}

export default TrendingPosts
