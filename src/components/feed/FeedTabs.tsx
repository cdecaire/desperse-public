/**
 * FeedTabs Component
 * Tab navigation for switching between "For You" and "Following" feeds
 */

import { cn } from '@/lib/utils'
import { NotificationBadge } from '@/components/ui/notification-badge'

export type FeedTab = 'for-you' | 'following'

interface FeedTabsProps {
  activeTab: FeedTab
  onTabChange: (tab: FeedTab) => void
  className?: string
  /** Number of new posts in For You feed (for badge display) */
  forYouNewPostsCount?: number
  /** Number of new posts in Following feed (for badge display) */
  followingNewPostsCount?: number
  /** Callback when clicking a tab with new posts (triggers refresh) */
  onTabClickWithNewPosts?: (tab: FeedTab) => void
}

export function FeedTabs({ 
  activeTab, 
  onTabChange, 
  className, 
  forYouNewPostsCount = 0,
  followingNewPostsCount = 0,
  onTabClickWithNewPosts,
}: FeedTabsProps) {
  const tabs: { id: FeedTab; label: string }[] = [
    { id: 'for-you', label: 'For You' },
    { id: 'following', label: 'Following' },
  ]

  const handleTabClick = (tab: FeedTab) => {
    // If clicking a tab with new posts, trigger refresh callback
    if (onTabClickWithNewPosts) {
      if (tab === 'for-you' && forYouNewPostsCount > 0) {
        onTabClickWithNewPosts(tab)
        return
      }
      if (tab === 'following' && followingNewPostsCount > 0) {
        onTabClickWithNewPosts(tab)
        return
      }
    }
    // Otherwise, just change the tab
    onTabChange(tab)
  }

  return (
    <div className={cn('pt-2', className)}>
      <div className="flex">
        {tabs.map((tab) => {
          // Show For You badge when count > 0 and Following doesn't have new posts (priority)
          const showForYouBadge = tab.id === 'for-you' && 
            forYouNewPostsCount > 0 && 
            followingNewPostsCount === 0
          
          // Show Following badge when count > 0 and user is not currently viewing Following
          const showFollowingBadge = tab.id === 'following' && 
            followingNewPostsCount > 0 && 
            activeTab !== 'following'
          
          const showBadge = showForYouBadge || showFollowingBadge
          const badgeCount = tab.id === 'for-you' ? forYouNewPostsCount : followingNewPostsCount

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                'flex-1 py-3 text-sm font-medium transition-colors relative',
                activeTab === tab.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground/80'
              )}
            >
              <span className="relative inline-flex items-center">
                {tab.label}
                {showBadge && (
                  <NotificationBadge count={badgeCount} className="ml-2" />
                )}
              </span>
              
              {/* Active indicator */}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-foreground rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default FeedTabs

