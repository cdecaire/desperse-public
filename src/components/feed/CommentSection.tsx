/**
 * CommentSection Component
 * Displays comments for a post with add/delete functionality
 * 
 * Features:
 * - Flat comment list (no threading)
 * - Creator's name shown as first "comment" (caption)
 * - Fixed comment form at bottom (comments scroll behind)
 * - Delete own comments only
 * - 280 character limit
 */

import { useState, useRef, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import { usePostComments, useDeleteCommentMutation, MAX_COMMENT_LENGTH, createCommentWithMutation } from '@/hooks/useComments'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { CommentMenu } from '@/components/feed/CommentMenu'
import { useCreateReport } from '@/hooks/useReports'
import { MentionAutocomplete } from '@/components/shared/MentionAutocomplete'
import { TokenText } from '@/components/shared/TokenText'

interface CommentSectionProps {
  postId: string
  userId?: string | null
  isAuthenticated?: boolean
  className?: string
  /**
   * Variant for different layouts:
   * - undefined: default with viewport-fixed comment input (mobile)
   * - "inline": comments list only, no input form (desktop scrollable area)
   * - "input-only": just the input form, no comments list (desktop footer)
   */
  variant?: 'inline' | 'input-only'
}

interface Comment {
  id: string
  userId: string
  content: string
  createdAt: Date | string
  user: {
    id: string
    usernameSlug: string
    displayName: string | null
    avatarUrl: string | null
  }
}

// Format relative time (matches PostCard format)
function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const then = new Date(date)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (seconds < 60) return 'now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w`

  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface CommentItemProps {
  comment: {
    id: string
    userId: string
    content: string
    createdAt: Date | string
    user: {
      id: string
      usernameSlug: string
      displayName: string | null
      avatarUrl: string | null
    }
  }
  currentUserId?: string | null
  onDelete: (commentId: string) => void
  isDeleting?: boolean
  onReportSubmit?: (commentId: string, reasons: string[], details?: string) => void
}

function CommentItem({ comment, currentUserId, onDelete, isDeleting, onReportSubmit }: CommentItemProps) {
  const isOwnComment = currentUserId === comment.userId
  const displayName = comment.user.displayName || comment.user.usernameSlug
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div 
      className="flex items-start gap-3 py-2 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link to="/profile/$slug" params={{ slug: comment.user.usernameSlug }}>
        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted shrink-0">
          {comment.user.avatarUrl ? (
            <img
              src={comment.user.avatarUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon name="user" variant="regular" className="text-xs text-muted-foreground" />
            </div>
          )}
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <Link
              to="/profile/$slug"
              params={{ slug: comment.user.usernameSlug }}
              className="font-semibold text-sm hover:underline truncate"
            >
              {displayName}
            </Link>
            <span className="text-xs text-muted-foreground shrink-0">
              · {formatRelativeTime(comment.createdAt)}
            </span>
          </div>
          <div className={cn('transition-opacity duration-200', isHovered ? 'opacity-100' : 'opacity-0')}>
            <CommentMenu
              commentId={comment.id}
              commentUserId={comment.userId}
              commentUser={comment.user}
              commentContent={comment.content}
              isOwner={isOwnComment}
              currentUserId={currentUserId || undefined}
              onReportSubmit={onReportSubmit}
              onDelete={onDelete}
              isDeleting={isDeleting}
            />
          </div>
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap wrap-break-word">
          <TokenText text={comment.content} />
        </p>
      </div>
    </div>
  )
}

export function CommentSection({
  postId,
  userId,
  isAuthenticated = false,
  className,
  variant,
}: CommentSectionProps) {
  const { isReady, getAuthHeaders, login } = useAuth()
  const queryClient = useQueryClient()
  const { data: comments, isLoading } = usePostComments(postId)
  const deleteMutation = useDeleteCommentMutation(postId)
  const createReportMutation = useCreateReport()
  const [commentText, setCommentText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  const characterCount = commentText.length
  const isOverLimit = characterCount > MAX_COMMENT_LENGTH
  const canSubmit = commentText.trim().length > 0 && !isOverLimit && isAuthenticated && userId

  // Scroll to bottom when new comments are added
  useEffect(() => {
    if (comments && comments.length > 0) {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [comments?.length])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!canSubmit || !userId) return

    const trimmedContent = commentText.trim()
    if (trimmedContent.length === 0 || trimmedContent.length > MAX_COMMENT_LENGTH) {
      return
    }

    setIsSubmitting(true)
    try {
      const authHeaders = await getAuthHeaders()
      await createCommentWithMutation(postId, trimmedContent, authHeaders.Authorization)
      setCommentText('')
      toast.success('Comment added')
      
      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ['postComments', postId] })
      queryClient.invalidateQueries({ queryKey: ['commentCount', postId] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!userId) return
    
    try {
      await deleteMutation.mutateAsync({ commentId })
      toast.success('Comment deleted')
    } catch (error) {
      // Error is handled by mutation
    }
  }

  const handleReportSubmit = async (commentId: string, reasons: string[], details?: string) => {
    if (!userId) {
      toast.error('You must be logged in to report content.')
      return
    }
    
    createReportMutation.mutate(
      {
        contentType: 'comment',
        contentId: commentId,
        reasons,
        details: details || null,
      },
      {
        onSuccess: () => {
          // Success toast is shown by the mutation hook
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to submit report.')
        },
      }
    )
  }

  // Shared form JSX - rendered inline to avoid focus loss on re-render
  const renderCommentForm = (isCompact: boolean) => (
    <form onSubmit={handleSubmit} className="space-y-2">
      <MentionAutocomplete
        value={commentText}
        onChange={setCommentText}
        placeholder="Add a comment..."
        className={cn(
          'resize-none',
          isCompact ? 'min-h-[44px]' : 'min-h-[60px]',
          isOverLimit && 'border-destructive focus-visible:ring-destructive'
        )}
        maxLength={MAX_COMMENT_LENGTH}
        disabled={isSubmitting}
      />
      <div className="flex items-center justify-end gap-2">
        {characterCount >= 250 && (
          <span
            className={cn(
              'text-xs',
              isOverLimit ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {characterCount}/{MAX_COMMENT_LENGTH}
          </span>
        )}
        <Button
          type="submit"
          variant="outline"
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Posting...
            </>
          ) : (
            'Post'
          )}
        </Button>
      </div>
      {isOverLimit && (
        <p className="text-xs text-destructive">
          Comment must be {MAX_COMMENT_LENGTH} characters or less.
        </p>
      )}
    </form>
  )

  // Shared comments list JSX
  const commentsListContent = (
    <>
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </div>
      )}

      {!isLoading && comments && (
        <>
          {comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            <div className="space-y-1">
              {(comments as Comment[]).map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={userId}
                  onDelete={handleDelete}
                  isDeleting={deleteMutation.isPending}
                  onReportSubmit={handleReportSubmit}
                />
              ))}
              <div ref={commentsEndRef} />
            </div>
          )}
        </>
      )}
    </>
  )

  // Input-only variant: just the form for desktop footer
  if (variant === 'input-only') {
    return (
      <div className={className}>
        {renderCommentForm(true)}
      </div>
    )
  }

  // Inline variant: just comments list for desktop scrollable area
  if (variant === 'inline') {
    return (
      <div className={cn('py-3', className)}>
        {commentsListContent}
      </div>
    )
  }

  // Default variant: original layout with viewport-fixed input (mobile)
  return (
    <div className={cn('flex flex-col relative', className)}>
      {/* Comments List - Scrollable with padding for fixed form */}
      <div className="overflow-y-auto px-2 py-3 pb-32 min-h-[300px] max-h-[calc(100vh-400px)]">
        {commentsListContent}
      </div>

      {/* Fixed Comment Form at Bottom of Viewport - Matches article max-width */}
      <div
        className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-sm z-50 shadow-lg lg:left-64"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="p-3 max-w-2xl mx-auto">
          {isReady && !isAuthenticated ? (
            <Button variant="outline" className="w-full" onClick={() => login()}>
              Sign in to comment
            </Button>
          ) : (
            renderCommentForm(false)
          )}
        </div>
      </div>
    </div>
  )
}

