/**
 * SuggestedCreators Component
 * Horizontal scrollable list of suggested creators with gradient avatars
 */

import { useSuggestedCreators } from '@/hooks/useExploreQuery'
import { GradientAvatar } from './GradientAvatar'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAuth } from '@/hooks/useAuth'

// Skeleton for loading state
function CreatorSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2 w-[72px] shrink-0">
      <div className="w-[72px] h-[72px] rounded-full bg-muted animate-pulse" />
      <div className="w-14 h-3 rounded bg-muted animate-pulse" />
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
    <section className="py-4">
      {/* Section header */}
      <h2 className="text-sm font-semibold text-muted-foreground px-4 md:px-2 mb-3">
        Suggested Creators
      </h2>

      {/* Horizontal scroll container */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-4 px-4 md:px-2 pb-2">
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
                className="flex flex-col items-center gap-1.5 w-[72px] shrink-0"
              >
                <GradientAvatar
                  src={creator.avatarUrl}
                  alt={creator.displayName || creator.usernameSlug}
                  href={`/profile/${creator.usernameSlug}`}
                  size="md"
                  showGradient={true}
                />
                <span className="text-xs text-center text-foreground truncate w-full px-0.5">
                  {creator.displayName || creator.usernameSlug}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

export default SuggestedCreators
