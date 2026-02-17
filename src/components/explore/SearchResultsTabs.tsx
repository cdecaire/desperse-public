/**
 * SearchResultsTabs Component
 * Tab navigation for search results (Top, Posts, People, Collectibles)
 * Follows the same pattern as FeedTabs
 */

import { cn } from '@/lib/utils'

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
    <div className={cn('', className)}>
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-colors relative',
              activeTab === tab.id
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground/80'
            )}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.label}

            {/* Active indicator */}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-foreground rounded-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default SearchResultsTabs
