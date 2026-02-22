/**
 * Search Results Page
 * Full search results with tabs for different content types
 */

import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useCallback, useEffect, useRef } from 'react'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAuth } from '@/hooks/useAuth'
import { search } from '@/server/functions/explore'
import { SearchResultsTabs, type SearchTab } from '@/components/explore/SearchResultsTabs'
import { PostCard } from '@/components/feed/PostCard'
import { FeedSkeleton } from '@/components/feed/PostCardSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { Input } from '@/components/ui/input'
import { Icon } from '@/components/ui/icon'
import { addRecentSearch } from '@/lib/recentSearches'

// Search params schema
const searchParamsSchema = z.object({
  q: z.string().optional().default(''),
  tab: z.enum(['top', 'posts', 'people', 'collectibles']).optional().default('top'),
})

export const Route = createFileRoute('/search')({
  validateSearch: searchParamsSchema,
  component: SearchPage,
})

function SearchPage() {
  const navigate = useNavigate()
  const { q: initialQuery, tab: initialTab } = Route.useSearch()
  const { user: currentUser } = useCurrentUser()
  const { isAuthenticated } = useAuth()

  const [query, setQuery] = useState(initialQuery)
  const [activeTab, setActiveTab] = useState<SearchTab>(initialTab)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync URL params with state
  useEffect(() => {
    setQuery(initialQuery)
    setActiveTab(initialTab)
  }, [initialQuery, initialTab])

  // Add to recent searches when query changes via URL
  useEffect(() => {
    if (initialQuery) {
      addRecentSearch(initialQuery)
    }
  }, [initialQuery])

  // Determine search type based on active tab
  const getSearchType = (tab: SearchTab): 'all' | 'users' | 'posts' => {
    switch (tab) {
      case 'people':
        return 'users'
      case 'posts':
      case 'collectibles':
        return 'posts'
      default:
        return 'all'
    }
  }

  // Fetch search results
  const { data: searchResults, isLoading, isError } = useQuery({
    queryKey: ['search-results', initialQuery, activeTab, currentUser?.id],
    queryFn: async () => {
      if (!initialQuery) return { users: [], posts: [] }

      const result = await search({
        data: {
          query: initialQuery,
          type: getSearchType(activeTab),
          currentUserId: currentUser?.id || undefined,
          limit: 50,
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Search failed')
      }

      return {
        users: result.users || [],
        posts: result.posts || [],
      }
    },
    enabled: initialQuery.length > 0,
    staleTime: 30 * 1000,
  })

  // Filter posts for collectibles tab
  const filteredPosts = activeTab === 'collectibles'
    ? (searchResults?.posts || []).filter(p => p.type === 'collectible' || p.type === 'edition')
    : searchResults?.posts || []

  // Handle tab change
  const handleTabChange = useCallback((tab: SearchTab) => {
    setActiveTab(tab)
    navigate({
      to: '/search',
      search: { q: initialQuery, tab },
      replace: true,
    })
  }, [navigate, initialQuery])

  // Handle search submit
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed) {
      addRecentSearch(trimmed)
      navigate({
        to: '/search',
        search: { q: trimmed, tab: activeTab },
      })
    }
  }, [query, activeTab, navigate])

  // Handle back navigation
  const handleBack = useCallback(() => {
    navigate({ to: '/explore' })
  }, [navigate])

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
  }, [])

  // Handle clear
  const handleClear = useCallback(() => {
    setQuery('')
    inputRef.current?.focus()
  }, [])

  return (
    <div className="min-h-screen">
      {/* Header with search input - PWA safe-area support */}
      <div
        className="sticky top-0 bg-background/95 backdrop-blur-sm z-40 md:pt-0"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center gap-2 px-2 py-2">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="p-2 -ml-1 text-foreground hover:bg-accent rounded-full transition-colors"
            aria-label="Go back"
          >
            <Icon name="arrow-left" variant="regular" className="text-lg" />
          </button>

          {/* Search input */}
          <form onSubmit={handleSubmit} className="flex-1 relative">
            <Icon
              name="magnifying-glass"
              variant="regular"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleChange}
              placeholder="Search"
              className="pl-10 pr-10 h-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-ring rounded-full"
              aria-label="Search"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <Icon name="circle-xmark" />
              </button>
            )}
          </form>
        </div>

        {/* Tabs */}
        <SearchResultsTabs activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* Results content */}
      <div className="pb-20">
        {/* No query state */}
        {!initialQuery && (
          <EmptyState
            icon={<Icon name="magnifying-glass" variant="regular" className="text-4xl" />}
            title="Search Desperse"
            description="Find creators, posts, and collectibles"
          />
        )}

        {/* Loading state */}
        {initialQuery && isLoading && (
          <div className="pt-4">
            <FeedSkeleton count={3} />
          </div>
        )}

        {/* Error state */}
        {initialQuery && isError && (
          <EmptyState
            icon={<Icon name="triangle-exclamation" variant="regular" className="text-4xl" />}
            title="Search failed"
            description="Please try again"
          />
        )}

        {/* Results */}
        {initialQuery && !isLoading && !isError && searchResults && (
          <>
            {/* Top tab - mixed results */}
            {activeTab === 'top' && (
              <div>
                {/* People section */}
                {searchResults.users.length > 0 && (
                  <div className="border-b border-border/50">
                    <h3 className="text-sm font-semibold text-muted-foreground px-4 md:px-2 py-3">
                      People
                    </h3>
                    <div className="pb-2">
                      {searchResults.users.slice(0, 3).map((user) => (
                        <UserResultCard key={user.id} user={user} currentUserId={currentUser?.id} />
                      ))}
                      {searchResults.users.length > 3 && (
                        <button
                          onClick={() => handleTabChange('people')}
                          className="w-full px-4 py-3 text-sm text-primary hover:bg-accent transition-colors text-left"
                        >
                          View all people
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Posts section */}
                {searchResults.posts.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground px-4 md:px-2 py-3">
                      Posts
                    </h3>
                    <div className="space-y-6 -mx-4 md:mx-0">
                      {searchResults.posts.slice(0, 5).map((post) => (
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
                            collectCount: (post as any).collectCount ?? 0,
                            createdAt: post.createdAt,
                            user: post.user,
                            assets: (post as any).assets,
                            mintWindowStart: post.mintWindowStart,
                            mintWindowEnd: post.mintWindowEnd,
                          }}
                          currentUserId={currentUser?.id}
                          isAuthenticated={isAuthenticated}
                        />
                      ))}
                    </div>
                    {searchResults.posts.length > 5 && (
                      <button
                        onClick={() => handleTabChange('posts')}
                        className="w-full px-4 py-3 text-sm text-primary hover:bg-accent transition-colors text-left border-t border-border/50 mt-4"
                      >
                        View all posts
                      </button>
                    )}
                  </div>
                )}

                {/* No results */}
                {searchResults.users.length === 0 && searchResults.posts.length === 0 && (
                  <EmptyState
                    icon={<Icon name="magnifying-glass" variant="regular" className="text-4xl" />}
                    title="No results"
                    description={`No results found for "${initialQuery}"`}
                  />
                )}
              </div>
            )}

            {/* People tab */}
            {activeTab === 'people' && (
              <div>
                {searchResults.users.length > 0 ? (
                  <div className="py-2">
                    {searchResults.users.map((user) => (
                      <UserResultCard key={user.id} user={user} currentUserId={currentUser?.id} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Icon name="users" variant="regular" className="text-4xl" />}
                    title="No people found"
                    description={`No users matching "${initialQuery}"`}
                  />
                )}
              </div>
            )}

            {/* Posts tab */}
            {activeTab === 'posts' && (
              <div>
                {searchResults.posts.length > 0 ? (
                  <div className="space-y-6 pt-4 -mx-4 md:mx-0">
                    {searchResults.posts.map((post) => (
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
                          collectCount: (post as any).collectCount ?? 0,
                          createdAt: post.createdAt,
                          user: post.user,
                          assets: (post as any).assets,
                          mintWindowStart: post.mintWindowStart,
                          mintWindowEnd: post.mintWindowEnd,
                        }}
                        currentUserId={currentUser?.id}
                        isAuthenticated={isAuthenticated}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Icon name="images" variant="regular" className="text-4xl" />}
                    title="No posts found"
                    description={`No posts matching "${initialQuery}"`}
                  />
                )}
              </div>
            )}

            {/* Collectibles tab */}
            {activeTab === 'collectibles' && (
              <div>
                {filteredPosts.length > 0 ? (
                  <div className="space-y-6 pt-4 -mx-4 md:mx-0">
                    {filteredPosts.map((post) => (
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
                          collectCount: (post as any).collectCount ?? 0,
                          createdAt: post.createdAt,
                          user: post.user,
                          assets: (post as any).assets,
                          mintWindowStart: post.mintWindowStart,
                          mintWindowEnd: post.mintWindowEnd,
                        }}
                        currentUserId={currentUser?.id}
                        isAuthenticated={isAuthenticated}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Icon name="gem" variant="regular" className="text-4xl" />}
                    title="No collectibles found"
                    description={`No collectibles matching "${initialQuery}"`}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// User result card component
interface UserResultCardProps {
  user: {
    id: string
    usernameSlug: string
    displayName: string | null
    avatarUrl: string | null
  }
  currentUserId?: string
}

function UserResultCard({ user, currentUserId }: UserResultCardProps) {
  const isOwnProfile = currentUserId === user.id

  return (
    <Link
      to="/profile/$slug"
      params={{ slug: user.usernameSlug }}
      className="flex items-center gap-3 px-4 md:px-2 py-3 mx-1 rounded-lg hover:bg-accent transition-colors"
    >
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full overflow-hidden bg-muted shrink-0">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName || user.usernameSlug}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon name="user" variant="regular" className="text-muted-foreground text-lg" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-foreground truncate">
          {user.displayName || user.usernameSlug}
        </div>
        <div className="text-sm text-muted-foreground truncate">
          @{user.usernameSlug}
        </div>
      </div>

      {/* Follow button placeholder - could add actual follow button here */}
      {!isOwnProfile && (
        <div className="shrink-0">
          {/* Future: Add FollowButton component here */}
        </div>
      )}
    </Link>
  )
}
