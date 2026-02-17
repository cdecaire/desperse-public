/**
 * LikeButton Component
 * Handles like/unlike actions for posts
 * 
 * Simple toggle button that shows:
 * - Heart icon (outline when not liked, filled when liked)
 * - Like count
 * - Works for both authenticated and unauthenticated users
 *   (count visible to all, action requires auth)
 */

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { usePostLikes, useLikeMutation } from '@/hooks/useLikes'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface LikeButtonProps {
  /** The post ID */
  postId: string
  /** The current user's ID (optional - for authenticated users) */
  userId?: string | null
  /** Whether the user is authenticated */
  isAuthenticated?: boolean
  /** Additional class names */
  className?: string
  /** Variant for styling */
  variant?: 'default' | 'ghost' | 'outline'
  /** Show count inline or separate */
  showCount?: boolean
}

export function LikeButton({
  postId,
  userId,
  isAuthenticated = false,
  className,
  variant = 'ghost',
  showCount = true,
}: LikeButtonProps) {
  const { isReady } = useAuth()
  const { data: likesData, isLoading } = usePostLikes(postId, userId || undefined)
  const likeMutation = useLikeMutation(postId, userId || undefined)

  const likeCount = likesData?.likeCount ?? 0
  const isLiked = likesData?.isLiked ?? false
  const isPending = likeMutation.isPending

  // Handle like/unlike action
  const handleLikeToggle = async () => {
    if (!isAuthenticated || !userId) {
      return
    }

    try {
      await likeMutation.mutateAsync(isLiked ? 'unlike' : 'like')
    } catch (error) {
      // Error is handled by mutation (toast shown in hook)
      console.error('Like toggle failed:', error)
    }
  }

  // If not authenticated, show disabled button
  if (isReady && !isAuthenticated) {
    return (
      <Button
        variant={variant}
        className={cn('gap-1 px-2', className)}
        disabled
      >
        <i className={cn('fa-regular fa-heart text-base')} />
        {showCount && likeCount > 0 && (
          <span className="text-sm font-medium">{likeCount}</span>
        )}
      </Button>
    )
  }

  // Loading state
  if (isLoading && !likesData) {
    return (
      <Button
        variant={variant}
        className={cn('gap-1 px-2', className)}
        disabled
      >
        <LoadingSpinner size="sm" />
      </Button>
    )
  }

  // Authenticated user - show interactive button
  return (
    <Button
      variant={variant}
      className={cn('gap-1 px-2', className)}
      onClick={handleLikeToggle}
      disabled={isPending || !isAuthenticated}
    >
      {isPending ? (
        <LoadingSpinner size="sm" />
      ) : (
        <i
          className={cn(
            isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart',
            'text-base',
            isLiked && 'text-red-500'
          )}
        />
      )}
      {showCount && likeCount > 0 && (
        <span className="text-sm font-medium">{likeCount}</span>
      )}
    </Button>
  )
}

