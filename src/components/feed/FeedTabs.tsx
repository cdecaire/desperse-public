/**
 * FeedTabs Component
 * Tab navigation for switching between "For You" and "Following" feeds.
 *
 * Migration shim (Phase 2 — Sable adoption): renders @cdecaire/sable's Tabs (via
 * the ui/tabs shim) for the design-system underline + a11y wiring, kept
 * full-width (flex-1 triggers) and controlled via activeTab.
 *
 * New-posts click-intercept: clicking a tab that has new posts should refresh
 * (onTabClickWithNewPosts) rather than just switch. Base UI's onValueChange only
 * fires on a CHANGE, so it can't catch a click on the ALREADY-active tab — we
 * route normal switches through onValueChange and the active-tab refresh through
 * an onClick guard, avoiding a double-fire.
 */

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

const tabs: { id: FeedTab; label: string }[] = [
  { id: 'for-you', label: 'For You' },
  { id: 'following', label: 'Following' },
]

export function FeedTabs({
  activeTab,
  onTabChange,
  className,
  forYouNewPostsCount = 0,
  followingNewPostsCount = 0,
  onTabClickWithNewPosts,
}: FeedTabsProps) {
  const tabHasNewPosts = (tab: FeedTab) =>
    (tab === 'for-you' && forYouNewPostsCount > 0) ||
    (tab === 'following' && followingNewPostsCount > 0)

  // Refresh when a tab with new posts is clicked; otherwise just switch.
  const handleTab = (tab: FeedTab) => {
    if (onTabClickWithNewPosts && tabHasNewPosts(tab)) {
      onTabClickWithNewPosts(tab)
      return
    }
    onTabChange(tab)
  }

  return (
    <Tabs
      value={activeTab}
      // Fires only on a real change (inactive → active) — handles normal switches.
      onValueChange={(value) => {
        const tab = value as FeedTab
        if (tab !== activeTab) handleTab(tab)
      }}
      className={className}
    >
      <TabsList className="flex w-full pt-2">
        {tabs.map((tab) => {
          // For You badge: only when Following has none (priority). Following
          // badge: only when not already viewing Following.
          const showForYouBadge =
            tab.id === 'for-you' && forYouNewPostsCount > 0 && followingNewPostsCount === 0
          const showFollowingBadge =
            tab.id === 'following' && followingNewPostsCount > 0 && activeTab !== 'following'
          const showBadge = showForYouBadge || showFollowingBadge
          const badgeCount = tab.id === 'for-you' ? forYouNewPostsCount : followingNewPostsCount

          return (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              // Catches a click on the ALREADY-active tab (onValueChange won't fire),
              // so "tap the active tab to load new posts" still refreshes.
              onClick={() => {
                if (tab.id === activeTab) handleTab(tab.id)
              }}
              className="flex-1 justify-center"
            >
              <span className="inline-flex items-center">
                {tab.label}
                {showBadge && <NotificationBadge count={badgeCount} className="ml-2" />}
              </span>
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}

export default FeedTabs
