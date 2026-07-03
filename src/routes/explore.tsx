/**
 * Explore Page
 * Gallery/marketplace destination: a desktop filter rail (views + categories)
 * beside a roomy gallery grid; on mobile the rail collapses to inline tabs +
 * category chips. Public page — auth required for actions only.
 */

import { createFileRoute } from '@tanstack/react-router'
import { Col, Columns } from '@cdecaire/sable/layout'
import { useState } from 'react'
import {
  SearchBar,
  CategoryChips,
  ExploreSections,
  ExploreFilterRail,
  ExplorePostTypeTabs,
  isExplorePostTypeFilter,
  isExploreTab,
} from '@/components/explore'
import type { ExploreTab } from '@/components/explore/ExploreSections'
import type { ExplorePostTypeFilter } from '@/components/explore'
import { MobileHeader, MobileHeaderSpacer } from '@/components/layout/MobileHeader'
import { Icon } from '@/components/ui/icon'
import { isPresetCategory } from '@/constants/categories'

export const Route = createFileRoute('/explore')({
  validateSearch: (search: Record<string, unknown>): { tab?: ExploreTab; type?: ExplorePostTypeFilter; q?: string; category?: string } => {
    const tab = search.tab
    const type = search.type
    const q = typeof search.q === 'string' && search.q.trim() ? search.q : undefined
    const category =
      typeof search.category === 'string' && isPresetCategory(search.category)
        ? search.category
        : undefined
    return {
      tab: isExploreTab(tab) ? tab : undefined,
      type: isExplorePostTypeFilter(type) && type !== 'all' ? type : undefined,
      q,
      category,
    }
  },
  component: ExplorePage,
})

function ExplorePage() {
  const [filtersCollapsed, setFiltersCollapsed] = useState(false)
  const { q } = Route.useSearch()
  const isSearching = Boolean(q && q.trim())

  return (
    <>
      <MobileHeader title="Explore" showBackButton={false} />
      <MobileHeaderSpacer />
      <div className="px-4 md:px-6 lg:px-8 pt-4 pb-10">
        <Columns count={12} className="mt-5 items-start">
          {/* Desktop filter rail (views + categories) */}
          {!filtersCollapsed && (
            <Col span={{ base: 12, lg: 3, xl: 2 }} className="hidden lg:block self-stretch">
              <ExploreFilterRail
                onCollapse={() => setFiltersCollapsed(true)}
                isSearching={isSearching}
              />
            </Col>
          )}

          {/* Content column */}
          <Col span={{ base: 12, lg: filtersCollapsed ? 12 : 9, xl: filtersCollapsed ? 12 : 10 }} className="min-w-0">
            <main className="min-w-0">
              <div className="mb-5 max-w-2xl">
                <SearchBar initialQuery={q ?? ''} placeholder="Search creators, posts, and collectibles" />
              </div>

              {filtersCollapsed && (
                <button
                  type="button"
                  onClick={() => setFiltersCollapsed(false)}
                  className="mb-5 hidden items-center gap-2 rounded-lg px-3 py-2 text-label-lg text-muted-foreground hover:bg-accent hover:text-foreground motion-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:inline-flex"
                >
                  <Icon name="filter" className="text-base" />
                  Show filters
                </button>
              )}

              {/* Category chips are the mobile equivalent of the rail's Categories
                  list; on lg+ the rail covers them. */}
              <div className="lg:hidden mb-4 space-y-4">
                <ExplorePostTypeTabs />
                <CategoryChips />
              </div>

              <ExploreSections railCollapsed={filtersCollapsed} />
            </main>
          </Col>
        </Columns>
      </div>
    </>
  )
}
