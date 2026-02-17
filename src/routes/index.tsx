/**
 * Feed Page (Home)
 * Displays posts with dual-tab model: For You / Following
 */

import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useCallback, useRef, useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useFeedQuery, getFeedPosts } from '@/hooks/useFeedQuery'
import { usePostCountsPolling } from '@/hooks/usePostCountsPolling'
import { useNotificationCounters } from '@/hooks/useNotificationCounters'
import { useFollowingList } from '@/hooks/useProfileQuery'
import { useFeedRefreshListener } from '@/hooks/useFeedRefresh'
import { FeedTabs, type FeedTab } from '@/components/feed/FeedTabs'
import { PostCard } from '@/components/feed/PostCard'
import { FeedSkeleton } from '@/components/feed/PostCardSkeleton'
import { NewPostsToast } from '@/components/feed/NewPostsToast'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { PullToRefresh } from '@/components/shared/PullToRefresh'
import { Button } from '@/components/ui/button'
import { setLastSeen, getLastSeen } from '@/lib/utils'
import { LandingPage } from '@/components/landing/LandingPage'

export const Route = createFileRoute('/')({
  component: FeedPage,
})

function FeedPage() {
  const { isAuthenticated, isReady } = useAuth()

  // Show loading state while auth is initializing
  if (!isReady) {
    return <FeedSkeleton count={3} />
  }

  // Show landing page for unauthenticated users
  if (!isAuthenticated) {
    return <LandingPage />
  }

  // Show feed for authenticated users
  return <FeedContent />
}

function FeedContent() {
  const { isAuthenticated, isReady } = useAuth()
  const queryClient = useQueryClient()
  // Only call useCurrentUser for authenticated users to avoid loading delays
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // For unauthenticated users, always use 'for-you' and don't show tabs
  // For authenticated users, manage tab state locally (no URL params)
  const [currentTab, setCurrentTab] = useState<FeedTab>('for-you')
  const effectiveTab = isAuthenticated ? currentTab : 'for-you'

  // Feed query - enabled as soon as Privy is ready
  // For unauthenticated users, isUserLoading is always false, so we can load immediately
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useFeedQuery({
    tab: effectiveTab,
    userId: user?.id,
    currentUserId: user?.id,
    enabled: isReady,
  })
  
  const posts = getFeedPosts(data)
  
  // Get list of followed user IDs for cross-feed cursor sync and avatar prioritization
  const { data: followingList } = useFollowingList(user?.id, user?.id)
  const followedUserIds = useMemo(() => {
    return new Set(followingList?.map(f => f.id) || [])
  }, [followingList])
  const followingUserIdsArray = useMemo(() => {
    return followingList?.map(f => f.id) || []
  }, [followingList])
  
  // Get notification counters - pause polling when feed is actively fetching
  const { data: notificationCounters } = useNotificationCounters({
    paused: isFetching,
    followingUserIds: followingUserIdsArray,
  })
  
  // Get notification counts and creators (available throughout the component)
  const forYouNewPostsCount = notificationCounters?.forYouNewPostsCount ?? 0
  const followingNewPostsCount = notificationCounters?.followingNewPostsCount ?? 0
  const forYouNewPostCreators = notificationCounters?.forYouNewPostCreators ?? []
  const followingNewPostCreators = notificationCounters?.followingNewPostCreators ?? []
  
  // Determine which toast to show based on current tab
  const currentTabHasNewPosts = effectiveTab === 'for-you' 
    ? forYouNewPostsCount > 0 
    : followingNewPostsCount > 0
  const currentTabCreators = effectiveTab === 'for-you' 
    ? forYouNewPostCreators 
    : followingNewPostCreators
  
  // Get post IDs for polling (only collectibles and editions need polling)
  const postIdsToPoll = useMemo(() => {
    return posts
      .filter(p => p.type === 'collectible' || p.type === 'edition')
      .map(p => p.id)
  }, [posts])
  
  // Poll for counts every 8 seconds
  const polledCounts = usePostCountsPolling({
    postIds: postIdsToPoll,
    enabled: postIdsToPoll.length > 0,
    intervalMs: 8000, // 8 seconds
  })
  
  // Handle feed refresh when clicking Home while already on home page
  // This provides smooth scroll to top and refetches if there are new posts
  const handleFeedRefresh = useCallback(() => {
    // Determine if there are new posts based on current tab
    const hasNewPosts = effectiveTab === 'for-you' 
      ? forYouNewPostsCount > 0 
      : followingNewPostsCount > 0
    
    // Always refetch to ensure fresh content when user explicitly taps Home
    // This provides a good UX even if notification counters haven't caught up yet
    if (hasNewPosts || !isFetching) {
      refetch()
    }
  }, [effectiveTab, forYouNewPostsCount, followingNewPostsCount, isFetching, refetch])
  
  // Listen for feed refresh events from navigation
  useFeedRefreshListener(handleFeedRefresh, { duration: 500 })
  
  // Handle toast click - refresh the feed
  const handleToastRefresh = useCallback(async () => {
    await refetch()
  }, [refetch])
  
  // Track the last feed data hash to prevent re-setting lastSeen on re-renders
  const lastForYouHashRef = useRef<string | null>(null)
  const lastFollowingHashRef = useRef<string | null>(null)
  
  // Update lastSeenForYouAt when For You feed successfully loads
  // Set to the createdAt of the most recent post (what user actually saw)
  // Also sync lastSeenFollowingAt if the most recent post is from a followed user
  useEffect(() => {
    // Only update For You cursor when on For You tab
    if (effectiveTab !== 'for-you') return
    if (isLoading || isFetching || isError) return
    
    // Get the most recent post's createdAt (posts are ordered by createdAt desc)
    const mostRecentPost = posts[0]
    
    // Use most recent post's createdAt, or fallback to "now" if feed is empty
    const lastSeenTimestamp = mostRecentPost?.createdAt 
      ? new Date(mostRecentPost.createdAt).toISOString()
      : new Date().toISOString()
    
    // Create a hash of the feed to detect if it's actually a new load
    const feedHash = posts.length > 0 
      ? `forYou-${posts.length}-${mostRecentPost?.id}-${mostRecentPost?.createdAt}`
      : `forYou-empty-${lastSeenTimestamp}`
    
    // Only update if this is a genuinely new feed load (not just a re-render)
    if (lastForYouHashRef.current !== feedHash) {
      setLastSeen('forYou', lastSeenTimestamp)
      lastForYouHashRef.current = feedHash
      
      // Cross-feed sync: If the most recent post is from a followed user,
      // also update lastSeenFollowingAt to prevent duplicate badge
      if (mostRecentPost?.user?.id && followedUserIds.has(mostRecentPost.user.id)) {
        const currentFollowingLastSeen = getLastSeen('following')
        // Only update if the new timestamp is newer than the existing one
        if (!currentFollowingLastSeen || new Date(lastSeenTimestamp) > new Date(currentFollowingLastSeen)) {
          setLastSeen('following', lastSeenTimestamp)
        }
      }
      
      // Invalidate notification counters to pick up the new lastSeen value
      queryClient.invalidateQueries({ queryKey: ['notification-counters'] })
    }
  }, [effectiveTab, isLoading, isFetching, isError, posts, queryClient, followedUserIds])
  
  // Update lastSeenFollowingAt ONLY when:
  // 1. User is currently on Following tab
  // 2. Following feed refresh succeeds
  // This ensures the Following badge only clears when the user actually views Following
  // Also sync lastSeenForYouAt since Following posts also appear in For You feed
  useEffect(() => {
    // Only update Following cursor when on Following tab
    if (effectiveTab !== 'following') return
    if (isLoading || isFetching || isError) return
    
    // Get the most recent post's createdAt (posts are ordered by createdAt desc)
    const mostRecentPost = posts[0]
    
    // Use most recent post's createdAt, or fallback to "now" if feed is empty
    const lastSeenTimestamp = mostRecentPost?.createdAt 
      ? new Date(mostRecentPost.createdAt).toISOString()
      : new Date().toISOString()
    
    // Create a hash of the feed to detect if it's actually a new load
    const feedHash = posts.length > 0 
      ? `following-${posts.length}-${mostRecentPost?.id}-${mostRecentPost?.createdAt}`
      : `following-empty-${lastSeenTimestamp}`
    
    // Only update if this is a genuinely new feed load (not just a re-render)
    if (lastFollowingHashRef.current !== feedHash) {
      setLastSeen('following', lastSeenTimestamp)
      lastFollowingHashRef.current = feedHash
      
      // Cross-feed sync: Following posts also appear in For You feed,
      // so update lastSeenForYouAt to prevent duplicate badge
      const currentForYouLastSeen = getLastSeen('forYou')
      // Only update if the new timestamp is newer than the existing one
      if (!currentForYouLastSeen || new Date(lastSeenTimestamp) > new Date(currentForYouLastSeen)) {
        setLastSeen('forYou', lastSeenTimestamp)
      }
      
      // Invalidate notification counters to pick up the new lastSeen value
      queryClient.invalidateQueries({ queryKey: ['notification-counters'] })
    }
  }, [effectiveTab, isLoading, isFetching, isError, posts, queryClient])
  
  // Handle tab change (only for authenticated users)
  const handleTabChange = useCallback((tab: FeedTab) => {
    if (isAuthenticated) {
      setCurrentTab(tab)
    }
  }, [isAuthenticated])
  
  // Handle tab click with new posts - triggers refresh
  const handleTabClickWithNewPosts = useCallback(async (tab: FeedTab) => {
    // Switch to the tab first
    if (isAuthenticated) {
      setCurrentTab(tab)
    }
    // Then refresh the feed
    await refetch()
  }, [isAuthenticated, refetch])
  
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
  
  // Loading state - only block on isReady and actual feed loading
  // For unauthenticated users, isUserLoading is always false so we load faster
  if (!isReady || isLoading) {
    return (
      <div>
        {isAuthenticated && (
          <FeedTabs 
            activeTab={effectiveTab} 
            onTabChange={handleTabChange}
            forYouNewPostsCount={forYouNewPostsCount}
            followingNewPostsCount={followingNewPostsCount}
            onTabClickWithNewPosts={handleTabClickWithNewPosts}
          />
        )}
        <FeedSkeleton count={3} />
      </div>
    )
  }
  
  // Error state
  if (isError) {
    return (
      <div>
        {isAuthenticated && (
          <FeedTabs 
            activeTab={effectiveTab} 
            onTabChange={handleTabChange}
            forYouNewPostsCount={forYouNewPostsCount}
            followingNewPostsCount={followingNewPostsCount}
            onTabClickWithNewPosts={handleTabClickWithNewPosts}
          />
        )}
        <EmptyState
          icon={<i className="fa-regular fa-triangle-exclamation text-4xl" />}
          title="Couldn't load posts"
          description={error?.message || "Check your connection and try again."}
          action={
            <Button onClick={() => refetch()} variant="outline">
              <i className="fa-regular fa-arrow-rotate-right mr-2" />
              Retry
            </Button>
          }
        />
      </div>
    )
  }
  
  // Empty states
  if (posts.length === 0) {
    if (effectiveTab === 'following') {
      return (
        <div>
          <FeedTabs 
            activeTab={effectiveTab} 
            onTabChange={handleTabChange}
            followingNewPostsCount={followingNewPostsCount}
          />
          <EmptyState
            icon={<i className="fa-regular fa-users text-4xl" />}
            title="Your Following feed is empty"
            description="Follow creators to customize this view."
            action={
              <Button onClick={() => handleTabChange('for-you')}>
                Browse global feed
              </Button>
            }
          />
        </div>
      )
    }
    
    return (
      <div>
        {isAuthenticated && (
          <FeedTabs 
            activeTab={effectiveTab} 
            onTabChange={handleTabChange}
            forYouNewPostsCount={forYouNewPostsCount}
            followingNewPostsCount={followingNewPostsCount}
            onTabClickWithNewPosts={handleTabClickWithNewPosts}
          />
        )}
        <EmptyState
          icon={<i className="fa-regular fa-images text-4xl" />}
          title="No posts yet"
          description="Be the first to create something amazing!"
          action={isAuthenticated ? { label: 'Create Post', to: '/create' } : undefined}
        />
      </div>
    )
  }
  
  return (
    <PullToRefresh onRefresh={handleToastRefresh}>
      <div>
        {/* Feed tabs - Only show when authenticated */}
        {isAuthenticated && (
          <FeedTabs
            activeTab={effectiveTab}
            onTabChange={handleTabChange}
            forYouNewPostsCount={forYouNewPostsCount}
            followingNewPostsCount={followingNewPostsCount}
            onTabClickWithNewPosts={handleTabClickWithNewPosts}
          />
        )}

        {/* New posts toast - shows when scrolled down and new posts available */}
        <NewPostsToast
          hasNewPosts={currentTabHasNewPosts}
          creators={currentTabCreators}
          onRefresh={handleToastRefresh}
        />

        {/* Posts list */}
        <div className="space-y-6 pt-4 -mx-4 md:mx-0">
          {posts.map((post) => {
            // Use polled counts if available, otherwise fall back to initial data
            const polled = polledCounts[post.id]
            const collectCount = polled?.collectCount ?? post.collectCount ?? 0
            const currentSupply = polled?.currentSupply ?? post.currentSupply ?? 0

            return (
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
                  currentSupply: currentSupply,
                  collectCount: collectCount,
                  createdAt: post.createdAt,
                  user: post.user,
                  metadataUrl: post.metadataUrl,
                  masterMint: post.masterMint,
                  collectibleAssetId: (post as any).collectibleAssetId,
                  assetId: (post as any).assetId, // For gated downloads
                  isHidden: (post as any).isHidden, // Include isHidden for admin/moderator visibility
                  assets: (post as any).assets, // Multi-asset carousel support
                  downloadableAssets: (post as any).downloadableAssets, // For download menu
                }}
                currentUserId={user?.id}
                isAuthenticated={isAuthenticated}
              />
            )
          })}
        </div>

        {/* Load more trigger */}
        <div ref={loadMoreRef} className="py-8 flex justify-center">
          {isFetchingNextPage && (
            <LoadingSpinner size="md" />
          )}
          {!hasNextPage && posts.length > 0 && (
            <p className="text-sm text-muted-foreground">You've reached the end</p>
          )}
        </div>
      </div>
    </PullToRefresh>
  )
}
