/**
 * CommentMenu Component
 * 3-dot menu for comment actions (Report, Follow/Unfollow, Go to profile, Delete)
 */

import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { ReportModal } from '@/components/forms/ReportModal'
import { useFollowMutation, useFollowStats } from '@/hooks/useProfileQuery'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface CommentMenuProps {
  commentId: string
  commentUserId: string
  commentUser: {
    id: string
    usernameSlug: string
    displayName: string | null
    avatarUrl: string | null
  }
  commentContent: string
  className?: string
  /** Show Delete option (only for comment owner) */
  isOwner?: boolean
  /** Current user ID (required for follow/unfollow and delete) */
  currentUserId?: string
  /** Callback when report is submitted */
  onReportSubmit?: (commentId: string, reasons: string[], details?: string) => void
  /** Callback when comment is deleted */
  onDelete?: (commentId: string) => void
  /** Whether delete is in progress */
  isDeleting?: boolean
}

export function CommentMenu({
  commentId,
  commentUserId,
  commentUser,
  commentContent,
  className,
  isOwner = false,
  currentUserId,
  onReportSubmit,
  onDelete,
  isDeleting = false,
}: CommentMenuProps) {
  const [showReportModal, setShowReportModal] = useState(false)

  // Get follow status (only if we have a current user)
  const { data: followStats } = useFollowStats(
    commentUserId,
    currentUserId || undefined
  )
  const isFollowing = followStats?.isFollowing ?? false

  // Follow/unfollow mutation (only create if we have currentUserId)
  const followMutation = useFollowMutation(
    commentUserId,
    currentUserId || ''
  )

  const handleReportSubmit = (reasons: string[], details?: string) => {
    if (onReportSubmit) {
      onReportSubmit(commentId, reasons, details)
    }
    setShowReportModal(false)
  }

  const handleFollow = async () => {
    if (!currentUserId) {
      toast.error('You must be logged in to follow users')
      return
    }
    try {
      await followMutation.mutateAsync({ action: 'follow' })
      toast.success(`Following @${commentUser.usernameSlug}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to follow user')
    }
  }

  const handleUnfollow = async () => {
    if (!currentUserId) {
      return
    }
    try {
      await followMutation.mutateAsync({ action: 'unfollow' })
      toast.success(`Unfollowed @${commentUser.usernameSlug}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to unfollow user')
    }
  }

  const handleDelete = () => {
    if (onDelete && !isDeleting) {
      onDelete(commentId)
    }
  }

  // Don't show menu if user can't interact (no current user and not owner)
  const canInteract = currentUserId || isOwner
  if (!canInteract && !onReportSubmit) {
    return null
  }

  // Custom item styles matching original design
  const itemClassName = "flex items-center gap-3 px-4 py-3 text-sm text-foreground rounded-lg cursor-pointer"

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* Menu Button - 3 dots */}
          <button
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-md transition-colors text-muted-foreground hover:text-foreground",
              className
            )}
            aria-label="Comment options"
          >
            <i className="fa-solid fa-ellipsis-vertical text-sm" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Go to profile */}
          <DropdownMenuItem asChild className={itemClassName}>
            <Link
              to="/profile/$slug"
              params={{ slug: commentUser.usernameSlug }}
            >
              <i className="fa-regular fa-user w-5 text-center" aria-hidden="true" />
              <span>Go to profile</span>
            </Link>
          </DropdownMenuItem>

          {/* Follow/Unfollow */}
          {currentUserId && currentUserId !== commentUserId && (
            isFollowing ? (
              <DropdownMenuItem
                onClick={handleUnfollow}
                disabled={followMutation.isPending}
                className={itemClassName}
              >
                {followMutation.isPending ? (
                  <LoadingSpinner size="sm" className="w-5" />
                ) : (
                  <i className="fa-regular fa-user-minus w-5 text-center" aria-hidden="true" />
                )}
                <span>Unfollow</span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={handleFollow}
                disabled={followMutation.isPending}
                className={itemClassName}
              >
                {followMutation.isPending ? (
                  <LoadingSpinner size="sm" className="w-5" />
                ) : (
                  <i className="fa-regular fa-user-plus w-5 text-center" aria-hidden="true" />
                )}
                <span>Follow</span>
              </DropdownMenuItem>
            )
          )}

          {/* Report option - available to all users except owner */}
          {!isOwner && onReportSubmit && (
            <DropdownMenuItem
              onClick={() => setShowReportModal(true)}
              className={cn(itemClassName, "text-destructive hover:bg-destructive/10")}
            >
              <i className="fa-regular fa-flag w-5 text-center" aria-hidden="true" />
              <span>Report comment</span>
            </DropdownMenuItem>
          )}

          {/* Delete option - only for comment owner */}
          {isOwner && onDelete && (
            <DropdownMenuItem
              onClick={handleDelete}
              disabled={isDeleting}
              className={cn(itemClassName, "text-destructive hover:bg-destructive/10")}
            >
              {isDeleting ? (
                <>
                  <LoadingSpinner size="sm" className="w-5" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <i className="fa-regular fa-xmark w-5 text-center" aria-hidden="true" />
                  <span>Delete</span>
                </>
              )}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Report Modal */}
      {onReportSubmit && (
        <ReportModal
          open={showReportModal}
          onOpenChange={setShowReportModal}
          contentType="comment"
          contentId={commentId}
          contentUser={commentUser}
          contentText={commentContent}
          onSubmit={handleReportSubmit}
        />
      )}
    </>
  )
}
