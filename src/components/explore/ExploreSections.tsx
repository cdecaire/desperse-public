/**
 * ExploreSections Component
 * Tabbed gallery grids (Trending / New / Minting Now) with URL-synced tab
 * state (?tab=) so Home's "View all" links deep-link correctly.
 */

import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GalleryGrid } from '@/components/gallery/GalleryGrid'
import { toGalleryPost } from '@/components/gallery/mapPost'
import { EmptyState } from '@/components/shared/EmptyState'
import { PullToRefresh } from '@/components/shared/PullToRefresh'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { CreatorGrid } from './CreatorGrid'
import { ExploreSearchResults } from './ExploreSearchResults'
import {
  useTrendingPosts,
  useNewPosts,
  useEndingSoonPosts,
  getInfinitePostsList,
} from '@/hooks/useExploreQuery'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAuth } from '@/hooks/useAuth'
import {
  buildExploreSearch,
  toExploreFeedPostType,
  type ExplorePostTypeFilter,
} from './exploreFilters'

export type ExploreTab = 'trending' | 'new' | 'minting' | 'creators'

const TABS: { id: ExploreTab; label: string }[] = [
  { id: 'trending', label: 'Trending' },
  { id: 'new', label: 'New' },
  { id: 'minting', label: 'Minting Now' },
  { id: 'creators', label: 'Creators' },
]

const routeApi = getRouteApi('/explore')

// Keep Explore cards on integer spans of the same column system the dev grid
// overlay draws. With filters open the content owns 9 columns at lg (3 cards)
// and 10 columns at xl (5 cards); collapsed content owns all 12 and adds a
// wider-screen column while keeping card width consistent.
const EXPLORE_ALIGNED_GRID_WITH_RAIL = {
  count: { base: 12, lg: 9, xl: 10 },
  span: { base: 6, md: 4, lg: 3, xl: 2 },
} as const

const EXPLORE_ALIGNED_GRID_FULL = {
  count: 12,
  span: { base: 6, md: 4, lg: 3, xl: 2 },
} as const

interface ExploreSectionsProps {
  railCollapsed?: boolean
}

export function ExploreSections({ railCollapsed = false }: ExploreSectionsProps) {
  const { isAuthenticated, isReady } = useAuth()
  const { user: currentUser, isLoading: isUserLoading } = useCurrentUser()
  const navigate = useNavigate()
  const { tab, type, q, category } = routeApi.useSearch()
  const activeTab: ExploreTab = tab ?? 'trending'
  const activePostType: ExplorePostTypeFilter = type ?? 'all'
  const feedPostType = toExploreFeedPostType(activePostType)
  const searchQuery = (q ?? '').trim()
  const isSearching = searchQuery.length > 0
  // Category composes with the Browse view (it narrows the feed); search is the
  // only takeover. Search wins if both somehow land in the URL.
  const feedCategory = !isSearching && category ? category : undefined
  const alignedGrid = railCollapsed
    ? EXPLORE_ALIGNED_GRID_FULL
    : EXPLORE_ALIGNED_GRID_WITH_RAIL

  // Wait for auth to be fully ready before fetching to prevent double-fetch
  const isAuthReady = isReady && !isUserLoading

  const feedEnabled = isAuthReady && !isSearching
  const trendingQuery = useTrendingPosts(
    currentUser?.id,
    feedEnabled && activeTab === 'trending',
    feedPostType,
    feedCategory
  )
  const newQuery = useNewPosts(
    currentUser?.id,
    feedEnabled && activeTab === 'new',
    feedPostType,
    feedCategory
  )
  const mintingQuery = useEndingSoonPosts(
    currentUser?.id,
    feedEnabled && activeTab === 'minting',
    feedPostType,
    feedCategory
  )

  const query =
    activeTab === 'trending' ? trendingQuery :
    activeTab === 'new' ? newQuery :
    mintingQuery

  const posts = getInfinitePostsList(query.data).map(toGalleryPost)

  const handleTabChange = (next: ExploreTab) => {
    navigate({
      to: '/explore',
      search: buildExploreSearch(next, activePostType),
      replace: true,
    })
  }

  const emptyState = query.isError ? (
    <EmptyState
      icon={<Icon name="triangle-exclamation" variant="regular" className="text-4xl" />}
      title="Couldn't load posts"
      description={query.error?.message || 'Check your connection and try again.'}
      action={
        <Button onClick={() => query.refetch()} variant="outline">
          <Icon name="arrow-rotate-right" variant="regular" className="mr-2" />
          Retry
        </Button>
      }
    />
  ) : activeTab === 'minting' ? (
    <EmptyState
      icon={<Icon name="clock" variant="regular" className="text-4xl" />}
      title="No live mints right now"
      description="Timed editions will show up here while their mint window is open."
    />
  ) : (
    <EmptyState
      icon={<Icon name="images" variant="regular" className="text-4xl" />}
      title="Nothing here yet"
      description="Be the first to create something amazing!"
      action={
        isAuthenticated
          ? { label: 'Create Post', to: '/create' }
          : undefined
      }
    />
  )

  // Search takes over the grid: when a query is active the Browse views step
  // aside and we show relevance-ranked matches, still narrowed by the Type
  // filter. Clearing the query (via the search box) restores the active view.
  if (isSearching) {
    return (
      <section>
        <ExploreSearchResults
          query={searchQuery}
          postType={activePostType}
          alignedGrid={alignedGrid}
        />
      </section>
    )
  }

  return (
    <section>
      {/* Tabs are the mobile view-switcher; on lg+ the ExploreFilterRail drives
          the view instead, so hide them there. */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => handleTabChange(value as ExploreTab)}
        className="mb-6 lg:hidden"
      >
        <TabsList className="flex w-full sm:w-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="flex-1 sm:flex-none justify-center">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {activeTab === 'creators' ? (
        <CreatorGrid railCollapsed={railCollapsed} />
      ) : (
        <PullToRefresh onRefresh={async () => { await query.refetch() }}>
          <GalleryGrid
            posts={query.isError ? [] : posts}
            isLoading={query.isLoading}
            hasNextPage={query.hasNextPage}
            isFetchingNextPage={query.isFetchingNextPage}
            onLoadMore={() => query.fetchNextPage()}
            emptyState={emptyState}
            eagerCount={4}
            alignedGrid={alignedGrid}
          />
        </PullToRefresh>
      )}
    </section>
  )
}

export default ExploreSections
