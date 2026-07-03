/**
 * ExploreFilterRail Component
 * Marketplace filter rail for /explore: a "Browse" view switcher
 * (Trending / New / Minting Now / Creators, synced to ?tab=), post type
 * filters, and a Categories list. Hidden below lg, where inline controls take
 * over.
 */

import { useNavigate, useRouterState } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PRESET_CATEGORIES, categoryToSlug } from '@/constants/categories'
import type { ExploreTab } from './ExploreSections'
import {
  EXPLORE_POST_TYPE_FILTERS,
  buildExploreSearch,
  isExplorePostTypeFilter,
  isExploreTab,
  type ExplorePostTypeFilter,
} from './exploreFilters'

const VIEWS: { id: ExploreTab; label: string; icon: string }[] = [
  { id: 'trending', label: 'Trending', icon: 'fire' },
  { id: 'new', label: 'New', icon: 'sparkles' },
  { id: 'minting', label: 'Minting Now', icon: 'clock' },
  { id: 'creators', label: 'Creators', icon: 'users' },
]

interface ExploreNavigationState {
  activeTab: ExploreTab | null
  activePostType: ExplorePostTypeFilter
  activeQuery: string
  activeCategory: string | null
  selectView: (next: ExploreTab) => void
  selectPostType: (next: ExplorePostTypeFilter) => void
  selectCategory: (slug: string) => void
}

function useExploreNavigation(): ExploreNavigationState {
  const navigate = useNavigate()
  const routerState = useRouterState()
  const pathname = routerState.location.pathname
  const search = routerState.location.search as {
    tab?: unknown
    type?: unknown
    q?: unknown
    category?: unknown
  }
  const isExploreRoute = pathname === '/explore' || pathname === '/explore/'
  const activeTab: ExploreTab | null = isExploreRoute
    ? isExploreTab(search.tab)
      ? search.tab
      : 'trending'
    : null
  const activePostType: ExplorePostTypeFilter =
    isExploreRoute && isExplorePostTypeFilter(search.type) ? search.type : 'all'
  const activeQuery =
    isExploreRoute && typeof search.q === 'string' ? search.q : ''
  const rawCategory =
    isExploreRoute && typeof search.category === 'string' ? search.category : ''
  // Search wins if both are somehow present (matches ExploreSections).
  const activeCategory = activeQuery.trim() ? null : rawCategory || null

  // Changing a view or type filter keeps any active search query / category so
  // they behave as composable filters on the one Explore view.
  const selectView = (next: ExploreTab) => {
    navigate({
      to: '/explore',
      search: buildExploreSearch(next, activePostType, activeQuery, rawCategory),
      replace: true,
    })
  }

  const selectPostType = (next: ExplorePostTypeFilter) => {
    navigate({
      to: '/explore',
      search: buildExploreSearch(activeTab ?? 'trending', next, activeQuery, rawCategory),
      replace: true,
    })
  }

  // Category is a takeover filter: selecting one clears the search query;
  // selecting the active category again toggles it off (back to the view).
  const selectCategory = (slug: string) => {
    const nextCategory = activeCategory === slug ? undefined : slug
    navigate({
      to: '/explore',
      search: buildExploreSearch(activeTab ?? 'trending', activePostType, undefined, nextCategory),
      replace: true,
    })
  }

  return {
    activeTab,
    activePostType,
    activeQuery,
    activeCategory,
    selectView,
    selectPostType,
    selectCategory,
  }
}

interface ExploreFilterRailProps {
  onCollapse?: () => void
  showPostTypes?: boolean
  isSearching?: boolean
}

export function ExploreFilterRail({
  onCollapse,
  showPostTypes = true,
  isSearching = false,
}: ExploreFilterRailProps) {
  const {
    activeTab,
    activePostType,
    activeCategory,
    selectView,
    selectPostType,
    selectCategory,
  } = useExploreNavigation()
  // Search is the only takeover (relevance-ranked, can't compose) — it hides the
  // Browse views. Category composes with the active view, so Browse stays.
  // On the Creators view you're browsing people, not posts — neither Type nor
  // Category applies, so hide both (unless a search is showing post results).
  const filtersApplyToPosts = isSearching || activeTab !== 'creators'
  const canFilterPostType = showPostTypes && filtersApplyToPosts

  // aside is h-full so its sticky child can travel the full grid height (the
  // column is stretched via self-stretch); without it sticky has no room and
  // scrolls away with the page.
  return (
    <aside className="hidden lg:block h-full min-w-0">
      {/* Sticky so filters travel with the user down a long results grid; caps
          its height and scrolls internally so a tall category list stays fully
          reachable on short viewports. */}
      <div className="sticky top-4 max-h-[calc(100vh-2rem)] space-y-7 overflow-y-auto overscroll-contain pb-2">
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-label-lg text-muted-foreground hover:bg-accent hover:text-foreground motion-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="grid size-5 shrink-0 place-items-center">
              <Icon name="filter" className="text-base" />
            </span>
            Hide filters
          </button>
        )}

        {/* View switcher — steps aside only while searching (search takes over
            the grid). Category composes with the active view, so Browse stays. */}
        {!isSearching && (
        <nav aria-label="Browse">
          <h3 className="text-label-xs text-muted-foreground px-3 mb-2">Browse</h3>
          <ul className="space-y-1">
            {VIEWS.map((v) => {
              const active = activeTab === v.id
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => selectView(v.id)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-label-lg motion-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active
                        ? 'bg-accent text-foreground font-semibold'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <span className="grid size-5 shrink-0 place-items-center">
                      <Icon name={v.icon} variant={active ? 'solid' : 'regular'} className="text-base" />
                    </span>
                    {v.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
        )}

        {canFilterPostType && (
          <nav aria-label="Post type">
            <h3 className="text-label-xs text-muted-foreground px-3 mb-2">Type</h3>
            <ul className="space-y-1">
              {EXPLORE_POST_TYPE_FILTERS.map((filter) => {
                const active = activePostType === filter.id
                return (
                  <li key={filter.id}>
                    <button
                      type="button"
                      onClick={() => selectPostType(filter.id)}
                      aria-pressed={active}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-label-lg motion-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active
                          ? 'bg-accent text-foreground font-semibold'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      <span className="grid size-5 shrink-0 place-items-center">
                        <Icon name={filter.icon} variant={active ? 'solid' : 'regular'} className="text-base" />
                      </span>
                      {filter.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        )}

        {/* Categories — filters on the one Explore view (not a separate page).
            The active category is highlighted; click it again to clear. Hidden
            on the Creators view (post filters don't apply to people). */}
        {filtersApplyToPosts && (
        <nav aria-label="Categories">
          <h3 className="text-label-xs text-muted-foreground px-3 mb-2">Categories</h3>
          <ul className="space-y-0.5">
            {PRESET_CATEGORIES.map((category) => {
              const slug = categoryToSlug(category)
              const active = activeCategory === slug
              return (
                <li key={category}>
                  <button
                    type="button"
                    onClick={() => selectCategory(slug)}
                    aria-pressed={active}
                    className={cn(
                      'block w-full rounded-lg px-3 py-1.5 text-left text-body-md motion-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active
                        ? 'bg-accent text-foreground font-semibold'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    {category}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
        )}
      </div>
    </aside>
  )
}

export function ExplorePostTypeTabs({ className }: { className?: string }) {
  const { activeTab, activePostType, activeQuery, selectPostType } =
    useExploreNavigation()
  const isSearching = activeQuery.trim().length > 0

  // Hidden on the Creators view (post filters don't apply to people); still
  // shown during a search, where results are posts.
  if (!isSearching && activeTab === 'creators') {
    return null
  }

  return (
    <Tabs
      value={activePostType}
      onValueChange={(value) => selectPostType(value as ExplorePostTypeFilter)}
      className={className}
    >
      <TabsList className="flex w-full overflow-x-auto sm:w-auto">
        {EXPLORE_POST_TYPE_FILTERS.map((filter) => (
          <TabsTrigger
            key={filter.id}
            value={filter.id}
            className="flex-1 justify-center whitespace-nowrap sm:flex-none"
          >
            {filter.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

export default ExploreFilterRail
