/**
 * SearchResultsTabs Component
 * Tab navigation for search results (Top, Posts, People, Collectibles).
 *
 * Migration shim (Phase 2 — Sable adoption): renders @cdecaire/sable's Tabs
 * (via the ui/tabs shim) for the design-system underline + a11y wiring, kept
 * full-width (flex-1 triggers) and controlled via activeTab/onTabChange.
 */

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export type SearchTab = 'top' | 'posts' | 'people' | 'collectibles'

interface SearchResultsTabsProps {
  activeTab: SearchTab
  onTabChange: (tab: SearchTab) => void
  className?: string
}

const tabs: { id: SearchTab; label: string }[] = [
  { id: 'top', label: 'Top' },
  { id: 'posts', label: 'Posts' },
  { id: 'people', label: 'People' },
  { id: 'collectibles', label: 'Collectibles' },
]

export function SearchResultsTabs({ activeTab, onTabChange, className }: SearchResultsTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onTabChange(value as SearchTab)}
      className={className}
    >
      <TabsList className="flex w-full">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="flex-1 justify-center">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

export default SearchResultsTabs
