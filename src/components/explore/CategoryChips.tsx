/**
 * CategoryChips Component
 * Preset category filters for the mobile Explore layout. Categories are filters
 * on the one Explore view (?category=), not links to a separate page: tapping a
 * chip toggles it, the active chip is highlighted. Shows the top categories
 * inline; "View more" wraps to reveal the rest — no horizontal scroll.
 */

import { useState } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { CategoryPill } from '@/components/ui/category-pill'
import { Icon } from '@/components/ui/icon'
import { PRESET_CATEGORIES, categoryToSlug } from '@/constants/categories'
import { buildExploreSearch } from './exploreFilters'

const COLLAPSED_COUNT = 6
const exploreRouteApi = getRouteApi('/explore')

export function CategoryChips() {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()
  const search = exploreRouteApi.useSearch()
  const activePostType = search.type ?? 'all'
  // Search wins if both are set (matches the rail / ExploreSections).
  const activeCategory = search.q?.trim() ? null : (search.category ?? null)
  const activeTab = search.tab ?? 'trending'
  const isSearching = Boolean(search.q?.trim())
  const visible = expanded ? PRESET_CATEGORIES : PRESET_CATEGORIES.slice(0, COLLAPSED_COUNT)

  // On the Creators view post filters don't apply — hide the chips (mirrors the
  // rail and the Type tabs). Still shown during a search.
  if (!isSearching && activeTab === 'creators') {
    return null
  }

  const toggle = (slug: string) => {
    const next = activeCategory === slug ? undefined : slug
    navigate({
      to: '/explore',
      search: buildExploreSearch(search.tab ?? 'trending', activePostType, undefined, next),
      replace: true,
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.map((category) => {
        const slug = categoryToSlug(category)
        return (
          <CategoryPill
            key={category}
            variant="interactive"
            size="lg"
            selected={activeCategory === slug}
            onClick={() => toggle(slug)}
            className="whitespace-nowrap"
          >
            {category}
          </CategoryPill>
        )
      })}
      {PRESET_CATEGORIES.length > COLLAPSED_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? 'Show less' : 'View more'}
          <Icon
            name={expanded ? 'chevron-up' : 'chevron-down'}
            variant="regular"
            className="text-xs"
          />
        </button>
      )}
    </div>
  )
}

export default CategoryChips
