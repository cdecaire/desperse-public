/**
 * SuggestedCreators Component
 * Horizontal scrollable list of suggested creators with gradient avatars
 */

import { useSuggestedCreators } from '@/hooks/useExploreQuery'
import { GradientAvatar } from './GradientAvatar'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAuth } from '@/hooks/useAuth'

// Skeleton for loading state. Reflows like a real item: a 72px column item in the
// mobile strip, a full-width row in the desktop rail.
function CreatorSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2 w-[72px] shrink-0 lg:w-full lg:flex-row lg:gap-3">
      <div className="w-[72px] h-[72px] rounded-full bg-muted animate-pulse lg:w-10 lg:h-10 shrink-0" />
      <div className="w-14 h-3 rounded bg-muted animate-pulse lg:w-24" />
    </div>
  )
}

export function SuggestedCreators() {
  const { isReady } = useAuth()
  const { user: currentUser, isLoading: isUserLoading } = useCurrentUser()

  // Wait for auth to be fully ready before fetching to prevent flash
  // isReady: Privy auth state is determined
  // !isUserLoading: User data query has completed (if authenticated)
  const isAuthReady = isReady && !isUserLoading

  const { data: creators, isLoading, error } = useSuggestedCreators(
    currentUser?.id,
    isAuthReady
  )

  // Don't show section if error or no creators
  if (error || (!isLoading && (!creators || creators.length === 0))) {
    return null
  }

  return (
    <section className="py-4 lg:py-0">
      {/* Section header */}
      <h2 className="text-sm font-semibold text-muted-foreground px-4 md:px-2 lg:px-0 mb-3">
        Suggested Creators
      </h2>

      {/*
        Reflows with the layout: a horizontal, scrollable strip on mobile (where
        explore is a single column), a vertical rail on desktop (where it sits
        beside the feed in the Columns grid). One instance, no duplicate fetch.
      */}
      <div className="flex gap-4 overflow-x-auto px-4 md:px-2 lg:px-0 pb-2 lg:flex-col lg:gap-2 lg:overflow-x-visible lg:pb-0">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 6 }).map((_, i) => (
            <CreatorSkeleton key={i} />
          ))
        ) : (
          // Creator items
          creators?.map((creator) => (
            <div
              key={creator.id}
              className="flex flex-col items-center gap-1.5 w-[72px] shrink-0 lg:w-full lg:flex-row lg:items-center lg:gap-3 lg:shrink"
            >
              <GradientAvatar
                src={creator.avatarUrl}
                alt={creator.displayName || creator.usernameSlug}
                href={`/profile/${creator.usernameSlug}`}
                size="md"
                showGradient={true}
              />
              <span className="text-xs text-center text-foreground truncate w-full px-0.5 lg:text-left lg:text-sm lg:px-0">
                {creator.displayName || creator.usernameSlug}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

export default SuggestedCreators
