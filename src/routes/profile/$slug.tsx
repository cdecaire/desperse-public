/**
 * Profile Page
 * Public user profile with posts, follow button, and stats
 */

import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from '@/hooks/use-toast'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { PullToRefresh } from '@/components/shared/PullToRefresh'
import { type PostCardData } from '@/components/feed/PostCard'
import { PostMedia, type MediaType } from '@/components/feed/PostMedia'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import {
  useProfileUser,
  useFollowStats,
  useUserPosts,
  useUserCollections,
  useUserForSale,
  useFollowMutation,
} from '@/hooks/useProfileQuery'
import { FollowersModal } from '@/components/profile/FollowersModal'
import { ActivityModal } from '@/components/profile/ActivityModal'
import { MessageButton } from '@/components/messaging/MessageButton'
import { TipButton } from '@/components/tipping/TipButton'
import { Logo } from '@/components/shared/Logo'
import { ExternalLinkWarning } from '@/components/shared/ExternalLinkWarning'
import { usePostLikes } from '@/hooks/useLikes'
import { useCommentCount } from '@/hooks/useComments'
import { Icon } from '@/components/ui/icon'
import { getResponsiveImageProps } from '@/lib/imageUrl'

type ProfileTab = 'posts' | 'collected' | 'for-sale'

export const Route = createFileRoute('/profile/$slug')({
  component: ProfilePage,
  validateSearch: (search: Record<string, unknown>): { tab?: ProfileTab } => {
    const tab = search.tab as string | undefined
    if (tab === 'posts' || tab === 'collected' || tab === 'for-sale') {
      return { tab }
    }
    return {}
  },
})

// Detect media type from URL
function detectMediaType(url: string): MediaType {
  const extension = url.split('.').pop()?.toLowerCase()?.split('?')[0]
  
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(extension || '')) {
    return 'image'
  }
  if (['mp4', 'webm', 'mov'].includes(extension || '')) {
    return 'video'
  }
  if (['mp3', 'wav', 'ogg', 'aac'].includes(extension || '')) {
    return 'audio'
  }
  if (['pdf', 'zip'].includes(extension || '')) {
    return 'document'
  }
  if (['glb', 'gltf'].includes(extension || '')) {
    return '3d'
  }
  
  return 'image' // Default fallback
}

function ProfileGridItem({
  post,
  showAvatar = false,
  showHoverStats = true,
}: {
  post: PostCardData
  showAvatar?: boolean
  showHoverStats?: boolean
}) {
  const mediaType = detectMediaType(post.mediaUrl)
  const { user: currentUser } = useCurrentUser()
  
  // Get likes and comments data
  const { data: likesData } = usePostLikes(post.id, currentUser?.id)
  const { data: commentCount } = useCommentCount(post.id)
  
  const likeCount = likesData?.likeCount ?? 0
  const commentCountValue = commentCount ?? 0
  
  // Check if there are any stats to display
  const hasAnyStats = likeCount > 0 || 
                      commentCountValue > 0 || 
                      post.type === 'collectible' ||
                      post.type === 'edition'
  
  return (
    <Link
      to="/post/$postId"
      params={{ postId: post.id }}
      className="aspect-square relative overflow-hidden rounded-sm group"
    >
      <div className="w-full h-full rounded-sm overflow-hidden">
        <div className="w-full h-full transition-transform group-hover:scale-105">
          <PostMedia
            mediaUrl={post.mediaUrl}
            coverUrl={post.coverUrl}
            mediaType={mediaType}
            alt={post.caption || 'Post'}
            aspectRatio="square"
            lazy={true}
            className="rounded-sm! border-0! bg-transparent!"
            preview={true}
            hasAccess={post.isCollected || post.type === 'post'}
            postType={post.type}
          />
        </div>
      </div>

      {showAvatar && post.user && (
        <div className="absolute top-2 left-2">
          <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm bg-muted">
            {post.user.avatarUrl ? (
              (() => {
                const avatarProps = getResponsiveImageProps(post.user.avatarUrl, {
                  sizes: '32px',
                  quality: 75,
                  includeRetina: true,
                })
                return (
                  <img
                    src={avatarProps.src}
                    srcSet={avatarProps.srcSet || undefined}
                    sizes={avatarProps.sizes || undefined}
                    alt={post.user.displayName || post.user.usernameSlug}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                )
              })()
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Icon name="user" variant="regular" className="text-[10px] text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      )}

      {showHoverStats && (
        <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {hasAnyStats && (
            <div className="flex items-center gap-4 text-white text-sm font-semibold">
              {likeCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <Icon name="heart" />
                  {likeCount}
                </span>
              )}
              {commentCountValue > 0 && (
                <span className="flex items-center gap-1.5">
                  <Icon name="comment" />
                  {commentCountValue}
                </span>
              )}
              {post.type === 'collectible' && (
                <span className="flex items-center gap-1.5">
                  <Icon name="gem" />
                  {post.collectCount ?? 0}
                </span>
              )}
              {post.type === 'edition' && (
                <span className="flex items-center gap-1.5">
                  <Icon name={post.maxSupply === 1 ? 'hexagon-image' : 'image-stack'} />
                  {post.currentSupply || 0}
                  {post.maxSupply && ` / ${post.maxSupply}`}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </Link>
  )
}

function ProfilePage() {
  const { slug } = Route.useParams()
  const { tab: initialTab } = Route.useSearch()
  const { user: currentUser, isLoading: isCurrentUserLoading, isAuthInitializing } = useCurrentUser()
  const { isAuthenticated, isReady, login } = useAuth()
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab || 'posts')
  const [followersModalOpen, setFollowersModalOpen] = useState(false)
  const [followersModalTab, setFollowersModalTab] = useState<'followers' | 'following' | 'collectors'>('followers')
  const [activityModalOpen, setActivityModalOpen] = useState(false)
  const [externalLinkUrl, setExternalLinkUrl] = useState<string | null>(null)
  
  // Fetch profile user
  const {
    data: profileData,
    isLoading: isUserLoading,
    error: userError,
  } = useProfileUser(slug)
  
  const profileUser = profileData?.user
  const profileStats = profileData?.stats

  // Fetch follow stats
  const { data: followStats } = useFollowStats(
    profileUser?.id,
    currentUser?.id
  )
  
  // Fetch user posts with infinite scroll
  const {
    data: postsData,
    isLoading: isPostsLoading,
    hasNextPage: hasMorePosts,
    isFetchingNextPage: isFetchingMorePosts,
    fetchNextPage: fetchMorePosts,
    refetch: refetchPosts,
  } = useUserPosts(profileUser?.id)
  const userPosts = postsData?.pages.flatMap((page) => page.posts) ?? []

  const {
    data: collectionsData,
    isLoading: isCollectionsLoading,
    hasNextPage: hasMoreCollections,
    isFetchingNextPage: isFetchingMoreCollections,
    fetchNextPage: fetchMoreCollections,
    refetch: refetchCollections,
  } = useUserCollections(profileUser?.id)
  const userCollections = collectionsData?.pages.flatMap((page) => page.posts) ?? []

  const {
    data: forSaleData,
    isLoading: isForSaleLoading,
    hasNextPage: hasMoreForSale,
    isFetchingNextPage: isFetchingMoreForSale,
    fetchNextPage: fetchMoreForSale,
    refetch: refetchForSale,
  } = useUserForSale(profileUser?.id)
  const userForSale = forSaleData?.pages.flatMap((page) => page.posts) ?? []

  // Handle pull-to-refresh based on active tab
  const handleRefresh = useCallback(async () => {
    if (activeTab === 'posts') {
      await refetchPosts()
    } else if (activeTab === 'collected') {
      await refetchCollections()
    } else {
      await refetchForSale()
    }
  }, [activeTab, refetchPosts, refetchCollections, refetchForSale])
  
  // Follow mutation
  const followMutation = useFollowMutation(
    profileUser?.id || '',
    currentUser?.id || ''
  )
  const isOwnProfile = currentUser?.usernameSlug === slug
  const isFollowing = followStats?.isFollowing || false

  // Handle follow/unfollow
  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      // Redirect to login
      return
    }
    
    try {
      await followMutation.mutateAsync({
        action: isFollowing ? 'unfollow' : 'follow',
      })
      toast.success(isFollowing ? 'Unfollowed' : 'Following')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed')
    }
  }

  // Loading state
  if (isUserLoading) {
    return <ProfileSkeleton />
  }

  // Error / Not found state
  if (userError || !profileUser) {
    return (
      <EmptyState
        icon={<Icon name="user-slash" variant="regular" className="text-4xl text-muted-foreground" />}
        title="User not found"
        description="This user doesn't exist."
        action={{ label: 'Go to feed', to: '/' }}
      />
    )
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="pb-24 md:pb-8">
        {/* Profile Header Banner */}
        <div
          className="relative h-48 md:h-64 md:w-full! md:ml-0! md:mr-4! bg-linear-to-br from-muted via-muted/80 to-muted/60 md:mt-6 md:rounded-lg overflow-hidden"
          style={{
            width: '100vw',
            marginLeft: 'calc(-50vw + 50%)',
            marginRight: 'calc(-50vw + 50%)',
          }}
        >
        {profileUser.headerBgUrl ? (
          (() => {
            const headerProps = getResponsiveImageProps(profileUser.headerBgUrl, {
              sizes: '100vw',
              quality: 75,
              includeRetina: true,
            })
            return (
              <img
                src={headerProps.src}
                srcSet={headerProps.srcSet || undefined}
                sizes={headerProps.sizes || undefined}
                alt="Profile header"
                className="w-full h-full object-cover"
                decoding="async"
              />
            )
          })()
        ) : null}
      </div>

      {/* Profile Content */}
      <div className="px-4 -mt-12 md:-mt-16 md:px-4 relative">
        <div className="flex flex-col gap-4">
          {/* Avatar and Profile Controls */}
          <div className="shrink-0 relative pt-2">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-background border-4 border-background flex items-center justify-center overflow-hidden shadow-sm">
              {profileUser.avatarUrl ? (
                (() => {
                  const avatarProps = getResponsiveImageProps(profileUser.avatarUrl, {
                    sizes: '96px', // max size at md breakpoint
                    quality: 75,
                    includeRetina: true,
                  })
                  return (
                    <img
                      src={avatarProps.src}
                      srcSet={avatarProps.srcSet || undefined}
                      sizes={avatarProps.sizes || undefined}
                      alt={profileUser.displayName || profileUser.slug}
                      className="w-full h-full object-cover"
                      decoding="async"
                    />
                  )
                })()
              ) : (
                <Icon name="user" variant="regular" className="text-2xl md:text-3xl text-muted-foreground" />
              )}
            </div>
            
            {/* Profile Controls - Own profile */}
            {isOwnProfile && (
              <div className="absolute bottom-0 right-0 flex items-center gap-1">
                {/* Activity Button */}
                <Button
                  type="button"
                  onClick={() => setActivityModalOpen(true)}
                  variant="ghost"
                  className="gap-1 px-2"
                  aria-label="View activity"
                >
                  <Icon name="clock" variant="regular" className="text-base" />
                </Button>

                {/* Edit Profile Button */}
                <Link to="/settings/profile">
                  <Button
                    variant="ghost"
                    className="gap-1 px-2"
                    aria-label="Edit profile"
                  >
                    <Icon name="user-pen" variant="regular" className="text-base" />
                  </Button>
                </Link>
              </div>
            )}

            {/* Profile Actions - Other user's profile */}
            {!isAuthInitializing && !isCurrentUserLoading && !isOwnProfile && isAuthenticated && (
              <div className="absolute bottom-0 right-0 flex items-center gap-1">
                <TipButton
                  creatorId={profileUser.id}
                  creatorName={profileUser.displayName || profileUser.slug}
                  creatorAvatarUrl={profileUser.avatarUrl}
                  context="profile"
                  variant="ghost"
                  size="icon"
                  iconOnly
                />
                <MessageButton
                  creatorId={profileUser.id}
                  creatorName={profileUser.displayName || profileUser.slug}
                  creatorSlug={profileUser.slug}
                  creatorAvatarUrl={profileUser.avatarUrl}
                  variant="ghost"
                  size="icon"
                  iconOnly
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleFollowToggle}
                  disabled={followMutation.isPending}
                  aria-label={isFollowing ? 'Unfollow' : 'Follow'}
                >
                  {followMutation.isPending ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Icon
                      name={isFollowing ? 'user-check' : 'user-plus'}
                      variant={isFollowing ? 'solid' : 'regular'}
                      className="text-base"
                    />
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="space-y-1.5">
            {/* Display Name + Stats on same line */}
            <div className="flex items-baseline gap-5 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold truncate">
                {profileUser.displayName || profileUser.slug}
              </h1>
              <div className="flex gap-4 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setFollowersModalTab('followers')
                    setFollowersModalOpen(true)
                  }}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <span className="text-sm font-bold">
                    {profileData?.followersCount ?? 0}
                  </span>{' '}
                  <span className="text-sm text-muted-foreground">
                    {profileData?.followersCount === 1 ? 'follower' : 'followers'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFollowersModalTab('following')
                    setFollowersModalOpen(true)
                  }}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <span className="text-sm font-bold">
                    {profileData?.followingCount ?? 0}
                  </span>{' '}
                  <span className="text-sm text-muted-foreground">following</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFollowersModalTab('collectors')
                    setFollowersModalOpen(true)
                  }}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <span className="text-sm font-bold">
                    {profileData?.collectorsCount ?? 0}
                  </span>{' '}
                  <span className="text-sm text-muted-foreground">
                    {profileData?.collectorsCount === 1 ? 'collector' : 'collectors'}
                  </span>
                </button>
              </div>
            </div>

            {/* Username + Join date */}
            <p className="text-muted-foreground">
              @{profileUser.slug}
              {profileUser.createdAt && (
                <>
                  {' • '}
                  <span className="text-sm">
                    Joined {new Date(profileUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                </>
              )}
            </p>

            {/* Bio */}
            {profileUser.bio && (
              <p className="text-foreground wrap-break-word">{profileUser.bio}</p>
            )}

            {/* Social Links */}
            {(profileUser.twitterUsername || profileUser.instagramUsername || profileUser.link) && (
              <div className={`flex items-center gap-4 flex-wrap text-sm ${profileUser.bio ? 'pt-1' : 'pt-0'}`}>
                {profileUser.twitterUsername && (
                  <a
                    href={`https://x.com/${profileUser.twitterUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Icon name="x-twitter" variant="brands" className="text-sm" />
                    <span>@{profileUser.twitterUsername}</span>
                  </a>
                )}
                {profileUser.instagramUsername && (
                  <a
                    href={`https://instagram.com/${profileUser.instagramUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Icon name="instagram" variant="brands" className="text-sm" />
                    <span>@{profileUser.instagramUsername}</span>
                  </a>
                )}
                {profileUser.link && (
                  <button
                    type="button"
                    onClick={() => setExternalLinkUrl(profileUser.link!)}
                    className="inline-flex items-center gap-1.5 text-primary hover:underline break-all cursor-pointer"
                  >
                    <Icon name="arrow-up-right-from-square" variant="regular" className="text-xs" />
                    <span>{profileUser.link.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 mt-4 border-t border-border" />

      {/* Tabs */}
      <div className="bg-background pt-2">
        <div className="flex">
          {(['posts', 'collected', 'for-sale'] as ProfileTab[]).map((tab) => {
            const count = 
              tab === 'posts' ? profileStats?.posts ?? 0 :
              tab === 'collected' ? profileStats?.collected ?? 0 :
              profileStats?.forSale ?? 0
            
            const label = 
              tab === 'posts' ? 'Posts' :
              tab === 'collected' ? 'Collected' :
              'For Sale'
            
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative flex items-center justify-center gap-2 ${
                  activeTab === tab
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground/80'
                }`}
              >
                <span className="relative inline-flex items-center gap-2 pb-2">
                  <span className="font-semibold">
                    {count}
                  </span>
                  <span>{label}</span>
                  {activeTab === tab && (
                    <div className="absolute bottom-0 -left-0.5 -right-0.5 h-0.5 bg-foreground rounded-full" />
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'posts' && (
          <PostsTab
            posts={userPosts}
            isLoading={isPostsLoading}
            isOwnProfile={isOwnProfile}
            isAuthenticated={isAuthenticated}
            hasNextPage={hasMorePosts}
            isFetchingNextPage={isFetchingMorePosts}
            fetchNextPage={fetchMorePosts}
          />
        )}

        {activeTab === 'collected' && (
          <CollectedTab
            posts={userCollections}
            isLoading={isCollectionsLoading}
            isOwnProfile={isOwnProfile}
            isAuthenticated={isAuthenticated}
            hasNextPage={hasMoreCollections}
            isFetchingNextPage={isFetchingMoreCollections}
            fetchNextPage={fetchMoreCollections}
          />
        )}

        {activeTab === 'for-sale' && (
          <ForSaleTab
            posts={userForSale}
            isLoading={isForSaleLoading}
            isOwnProfile={isOwnProfile}
            isAuthenticated={isAuthenticated}
            hasNextPage={hasMoreForSale}
            isFetchingNextPage={isFetchingMoreForSale}
            fetchNextPage={fetchMoreForSale}
          />
        )}
      </div>

      {/* Login CTA for unauthenticated users */}
      {isReady && !isAuthenticated && (
        <div className="mx-4 mt-8 p-6 bg-card/50 backdrop-blur-sm border border-border rounded-2xl">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="shrink-0">
              <Logo size={40} className="text-foreground" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-semibold">Join Desperse</h3>
              <p className="text-sm text-muted-foreground">
                Sign in to collect from @{profileUser.slug} and support their work.
              </p>
            </div>
            <Button onClick={() => login()}>
              Log in or Sign up
            </Button>
          </div>
        </div>
      )}

        {/* Followers/Following Modal */}
        {profileUser && (
          <FollowersModal
            open={followersModalOpen}
            onOpenChange={setFollowersModalOpen}
            userId={profileUser.id}
            currentUserId={currentUser?.id}
            initialTab={followersModalTab}
          />
        )}

        {/* Activity Modal - Only for own profile */}
        {profileUser && isOwnProfile && (
          <ActivityModal
            open={activityModalOpen}
            onOpenChange={setActivityModalOpen}
            userId={profileUser.id}
          />
        )}

        <ExternalLinkWarning
          url={externalLinkUrl}
          onClose={() => setExternalLinkUrl(null)}
        />
      </div>
    </PullToRefresh>
  )
}

/**
 * Infinite scroll hook for profile tabs
 */
function useInfiniteScroll(
  hasNextPage: boolean | undefined,
  isFetchingNextPage: boolean,
  fetchNextPage: () => void
) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return sentinelRef
}

/**
 * Posts Tab Content
 */
interface PostsTabProps {
  posts: PostCardData[]
  isLoading: boolean
  isOwnProfile: boolean
  isAuthenticated: boolean
  hasNextPage?: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
}

function PostsTab({
  posts,
  isLoading,
  isOwnProfile,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: PostsTabProps) {
  const sentinelRef = useInfiniteScroll(hasNextPage, isFetchingNextPage, fetchNextPage)

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-0.5 pt-0.5 px-1 lg:px-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square" />
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={<Icon name="images" variant="regular" className="text-4xl text-muted-foreground" />}
        title="No posts yet"
        description={
          isOwnProfile
            ? "You haven't created any posts yet. Share your first creation!"
            : "This user hasn't created any posts yet."
        }
        action={
          isOwnProfile && (
            <Link to="/create">
              <Button>
                <Icon name="plus" variant="regular" className="mr-2" />
                Create Post
              </Button>
            </Link>
          )
        }
      />
    )
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-0.5 pt-0.5 px-1 lg:px-0">
        {posts.map((post) => (
          <ProfileGridItem key={post.id} post={post} showHoverStats />
        ))}
      </div>
      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-4" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <LoadingSpinner size="sm" />
        </div>
      )}
    </>
  )
}

interface SimpleTabProps {
  posts: PostCardData[]
  isLoading: boolean
  isOwnProfile: boolean
  isAuthenticated: boolean
  hasNextPage?: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
}

function CollectedTab({
  posts,
  isLoading,
  isOwnProfile,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: SimpleTabProps) {
  const sentinelRef = useInfiniteScroll(hasNextPage, isFetchingNextPage, fetchNextPage)

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-0.5 pt-0.5 px-1 lg:px-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square" />
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={<Icon name="gem" variant="regular" className="text-4xl text-muted-foreground" />}
        title="No collections yet"
        description={
          isOwnProfile
            ? "You haven't collected any NFTs yet."
            : "This user hasn't collected any NFTs yet."
        }
      />
    )
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-0.5 pt-0.5 px-1 lg:px-0">
        {posts.map((post) => (
          <ProfileGridItem key={post.id} post={post} showAvatar showHoverStats />
        ))}
      </div>
      <div ref={sentinelRef} className="h-4" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <LoadingSpinner size="sm" />
        </div>
      )}
    </>
  )
}

function ForSaleTab({
  posts,
  isLoading,
  isOwnProfile,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: SimpleTabProps) {
  const sentinelRef = useInfiniteScroll(hasNextPage, isFetchingNextPage, fetchNextPage)

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-0.5 pt-0.5 px-1 lg:px-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square" />
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={<Icon name="tag" variant="regular" className="text-4xl text-muted-foreground" />}
        title="Nothing for sale"
        description={
          isOwnProfile
            ? "You don't have any editions for sale."
            : "This user doesn't have any editions for sale."
        }
        action={
          isOwnProfile && (
            <Link to="/create">
              <Button>
                <Icon name="plus" variant="regular" className="mr-2" />
                Create Edition
              </Button>
            </Link>
          )
        }
      />
    )
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-0.5 pt-0.5 px-1 lg:px-0">
        {posts.map((post) => (
          <ProfileGridItem key={post.id} post={post} showHoverStats />
        ))}
      </div>
      <div ref={sentinelRef} className="h-4" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <LoadingSpinner size="sm" />
        </div>
      )}
    </>
  )
}


/**
 * Profile loading skeleton
 */
function ProfileSkeleton() {
  return (
    <div className="py-6">
      {/* Header banner skeleton */}
      <div
        className="relative h-48 md:h-64 md:w-full! md:ml-0! md:mr-4! bg-linear-to-br from-muted via-muted/80 to-muted/60 md:mt-6 md:rounded-lg overflow-hidden"
        style={{
          width: '100vw',
          marginLeft: 'calc(-50vw + 50%)',
          marginRight: 'calc(-50vw + 50%)',
        }}
      />


      {/* Profile content skeleton */}
      <div className="px-4 -mt-12 md:-mt-16 md:px-4 relative">
        <div className="flex flex-col gap-4">
          <Skeleton className="w-20 h-20 md:w-24 md:h-24 rounded-full shrink-0 border-4 border-background" />
          <div className="space-y-2">
            <div>
              <Skeleton className="h-7 w-40 mb-2" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
      
      {/* Stats skeleton */}
      <div className="flex gap-6 py-4 px-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-6 w-8 mb-1" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
      
      {/* Tabs skeleton */}
      <Skeleton className="h-12 w-full" />
      
      {/* Grid skeleton */}
      <div className="grid grid-cols-3 gap-0.5 pt-0.5 mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square" />
        ))}
      </div>
    </div>
  )
}
