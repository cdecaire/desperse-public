/**
 * Admin Report Detail Page
 * Shows full details of a reported post with all reports and moderation actions
 */

import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hidePost, unhidePost, softDeletePost, resolveReports, hideComment, unhideComment, softDeleteComment, getReportsByPostId, getReportsByCommentId, getReportsByDmThreadId, getComment, getDmThreadForModeration } from '@/server/functions/admin'
import { getPost } from '@/server/functions/posts'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { POST_TYPE_META } from '@/constants/postTypes'
import { getEditionLabel } from '@/components/feed/postDisplay'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Icon } from '@/components/ui/icon'

// Format relative time (same as PostCard)
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

export const Route = createFileRoute('/admin/moderation/$reportId')({
  component: ReportDetailPage,
})

function ReportDetailPage() {
  const { reportId } = Route.useParams() // This is postId for posts, commentId for comments, or threadId for DM threads
  const search = Route.useSearch() as { type?: 'comment' | 'dm_thread'; commentId?: string }
  const isCommentReport = search?.type === 'comment' && search?.commentId
  const isDmThreadReport = search?.type === 'dm_thread'
  const commentId = isCommentReport ? search.commentId : undefined
  const threadId = isDmThreadReport ? reportId : undefined
  const postId = isDmThreadReport ? undefined : reportId
  const { user: currentUser, isLoading: isLoadingUser } = useCurrentUser()
  const { getAuthHeaders } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Check user role from currentUser
  const isModerator = currentUser?.role === 'moderator' || currentUser?.role === 'admin'
  const isAdm = currentUser?.role === 'admin'

  // Get post details (always fetch parent post for context, but not for DM thread reports)
  const { data: postData, isLoading: isLoadingPost, isPending: isPendingPost } = useQuery({
    queryKey: ['post', postId, currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id || !postId) throw new Error('Not authenticated')
      const result = await getPost({
        data: {
          postId,
          currentUserId: currentUser.id,
        },
      } as any)
      if (!result.success) throw new Error(result.error || 'Post not found')
      return result
    },
    enabled: !!(currentUser?.id) && !!postId && !isLoadingUser && !isDmThreadReport,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })

  // Get comment details (only for comment reports)
  const { data: commentData, isLoading: isLoadingComment, isPending: isPendingComment } = useQuery({
    queryKey: ['admin', 'comment', commentId, currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id || !commentId) throw new Error('Not authenticated')
      const authHeaders = await getAuthHeaders()
      const result = await getComment({
        data: {
          commentId,
          _authorization: authHeaders.Authorization,
        },
      } as any)
      if (!result.success) throw new Error(result.error || 'Comment not found')
      return result
    },
    enabled: !!(currentUser?.id) && !!commentId && !!isCommentReport && !isLoadingUser,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })

  // Get DM thread details (only for DM thread reports)
  const { data: dmThreadData, isLoading: isLoadingDmThread, isPending: isPendingDmThread } = useQuery({
    queryKey: ['admin', 'dm-thread', threadId, currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id || !threadId) throw new Error('Not authenticated')
      const authHeaders = await getAuthHeaders()
      const result = await getDmThreadForModeration({
        data: {
          threadId,
          _authorization: authHeaders.Authorization,
        },
      } as any)
      if (!result.success) throw new Error(result.error || 'Thread not found')
      return result
    },
    enabled: !!(currentUser?.id) && !!threadId && !!isDmThreadReport && !isLoadingUser,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })

  // Get all reports for this content (post, comment, or dm_thread)
  const { data: reportsData, isLoading: isLoadingReports, isPending: isPendingReports } = useQuery({
    queryKey: ['admin', 'reports', isDmThreadReport ? 'dm_thread' : (isCommentReport ? 'comment' : 'post'), isDmThreadReport ? threadId : (isCommentReport ? commentId : postId), currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) throw new Error('Not authenticated')
      const authHeaders = await getAuthHeaders()
      let result
      if (isDmThreadReport && threadId) {
        result = await getReportsByDmThreadId({
          data: {
            threadId,
            _authorization: authHeaders.Authorization,
          },
        } as any)
      } else if (isCommentReport && commentId) {
        result = await getReportsByCommentId({
          data: {
            commentId,
            _authorization: authHeaders.Authorization,
          },
        } as any)
      } else if (postId) {
        result = await getReportsByPostId({
          data: {
            postId,
            _authorization: authHeaders.Authorization,
          },
        } as any)
      } else {
        throw new Error('No content ID provided')
      }
      if (!result.success) throw new Error(result.error || 'Failed to fetch reports')
      return result
    },
    enabled: !!currentUser?.id && ((isDmThreadReport && !!threadId) || (isCommentReport && !!commentId) || (!isCommentReport && !isDmThreadReport && !!postId)) && !isLoadingUser,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })

  // Use isPending to catch the case where queries are enabled but haven't fetched yet
  const isLoading = isLoadingReports || isLoadingUser || isPendingReports ||
    (!isDmThreadReport && (isLoadingPost || isPendingPost)) ||
    (isCommentReport && (isLoadingComment || isPendingComment)) ||
    (isDmThreadReport && (isLoadingDmThread || isPendingDmThread))
  const error = postData && !postData.success ? new Error(postData.error) :
    (commentData && !commentData.success ? new Error(commentData.error) :
    (dmThreadData && !dmThreadData.success ? new Error(dmThreadData.error) : null))
  const postDataResult = postData && postData.success ? { post: (postData as any).post, user: (postData as any).user } : null
  const commentDataResult = commentData && commentData.success ? commentData as any : null
  const dmThreadDataResult = dmThreadData && dmThreadData.success ? { thread: (dmThreadData as any).thread, userA: (dmThreadData as any).userA, userB: (dmThreadData as any).userB } : null

  const hideMutation = useMutation({
    mutationFn: async (reason: string) => {
      if (!currentUser?.id) throw new Error('Not authenticated')
      const authHeaders = await getAuthHeaders()
      if (isCommentReport && commentId) {
        const result = await hideComment({
          data: {
            commentId,
            reason,
            _authorization: authHeaders.Authorization,
          },
        } as any)
        if (!result.success) throw new Error(result.error || 'Failed to hide comment')
        return result
      } else {
        const result = await hidePost({
          data: {
            postId,
            reason,
            _authorization: authHeaders.Authorization,
          },
        } as any)
        if (!result.success) throw new Error(result.error || 'Failed to hide post')
        return result
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      queryClient.invalidateQueries({ queryKey: ['notification-counters'] })
      if (isCommentReport && commentId) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'comment', commentId] })
        toast.success('Comment hidden successfully')
      } else {
        queryClient.invalidateQueries({ queryKey: ['post', postId] })
        toast.success('Post hidden successfully')
      }
    },
    onError: (error) => {
      toast.error(error.message || `Failed to hide ${isCommentReport ? 'comment' : 'post'}`)
    },
  })

  const unhideMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.id) throw new Error('Not authenticated')
      const authHeaders = await getAuthHeaders()
      if (isCommentReport && commentId) {
        const result = await unhideComment({
          data: {
            commentId,
            _authorization: authHeaders.Authorization,
          },
        } as any)
        if (!result.success) throw new Error(result.error || 'Failed to unhide comment')
        return result
      } else {
        const result = await unhidePost({
          data: {
            postId,
            _authorization: authHeaders.Authorization,
          },
        } as any)
        if (!result.success) throw new Error(result.error || 'Failed to unhide post')
        return result
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      queryClient.invalidateQueries({ queryKey: ['notification-counters'] })
      if (isCommentReport && commentId) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'comment', commentId] })
        toast.success('Comment unhidden successfully')
      } else {
        queryClient.invalidateQueries({ queryKey: ['post', postId] })
        toast.success('Post unhidden successfully')
      }
    },
    onError: (error) => {
      toast.error(error.message || `Failed to unhide ${isCommentReport ? 'comment' : 'post'}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (reason: string) => {
      if (!currentUser?.id) throw new Error('Not authenticated')
      const authHeaders = await getAuthHeaders()
      if (isCommentReport && commentId) {
        const result = await softDeleteComment({
          data: {
            commentId,
            reason,
            _authorization: authHeaders.Authorization,
          },
        } as any)
        if (!result.success) throw new Error(result.error || 'Failed to delete comment')
        return result
      } else {
        const result = await softDeletePost({
          data: {
            postId,
            reason,
            _authorization: authHeaders.Authorization,
          },
        } as any)
        if (!result.success) throw new Error(result.error || 'Failed to delete post')
        return result
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      queryClient.invalidateQueries({ queryKey: ['notification-counters'] })
      toast.success(`${isCommentReport ? 'Comment' : 'Post'} deleted successfully`)
      navigate({ to: '/admin/moderation' })
    },
    onError: (error) => {
      toast.error(error.message || `Failed to delete ${isCommentReport ? 'comment' : 'post'}`)
    },
  })

  const resolveMutation = useMutation({
    mutationFn: async (resolution: 'removed' | 'no_action') => {
      if (!currentUser?.id) throw new Error('Not authenticated')
      const authHeaders = await getAuthHeaders()
      const contentType = isDmThreadReport ? 'dm_thread' : (isCommentReport ? 'comment' : 'post')
      const contentId = isDmThreadReport && threadId ? threadId : (isCommentReport && commentId ? commentId : postId!)
      const result = await resolveReports({
        data: {
          contentType,
          contentId,
          resolution,
          _authorization: authHeaders.Authorization,
        },
      } as any)
      if (!result.success) throw new Error(result.error || 'Failed to resolve reports')
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      queryClient.invalidateQueries({ queryKey: ['notification-counters'] })
      toast.success('Reports resolved successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to resolve reports')
    },
  })

  const [showHideDialog, setShowHideDialog] = useState(false)
  const [hideReason, setHideReason] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')

  const handleHide = () => {
    setShowHideDialog(true)
  }

  const handleHideConfirm = () => {
    if (hideReason.trim()) {
      hideMutation.mutate(hideReason.trim())
      setShowHideDialog(false)
      setHideReason('')
    }
  }

  const handleDelete = () => {
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = () => {
    if (deleteReason.trim()) {
      deleteMutation.mutate(deleteReason.trim())
      setShowDeleteDialog(false)
      setDeleteReason('')
    }
  }

  return (
    <div className="max-w-4xl py-4">
      <Button
        variant="ghost"
        onClick={() => navigate({ to: '/admin/moderation' })}
        className="mb-4 hidden md:inline-flex"
      >
        <Icon name="arrow-left" variant="regular" className="mr-2" />
        Back to Reports
      </Button>

      {isLoadingUser && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <div className="ml-4 text-sm text-muted-foreground">
            Loading user...
          </div>
        </div>
      )}

      {!isLoadingUser && isLoading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <div className="ml-4 text-sm text-muted-foreground">
            Loading report details...
          </div>
        </div>
      )}

      {!isLoading && error && (
        <EmptyState
          icon={<Icon name="circle-exclamation" variant="regular" className="text-4xl" />}
          title="Failed to load report"
          description={error.message || 'An error occurred while loading the report.'}
        />
      )}

      {!isLoading && !error && !postDataResult && !commentDataResult && !dmThreadDataResult && (
        <EmptyState
          icon={<Icon name="circle-exclamation" variant="regular" className="text-4xl" />}
          title={isDmThreadReport ? "Conversation not found" : (isCommentReport ? "Comment not found" : "Post not found")}
          description={isDmThreadReport ? "The reported conversation could not be found." : (isCommentReport ? "The reported comment could not be found." : "The reported post could not be found.")}
        />
      )}

      {!isLoading && !error && postDataResult && reportsData && (
        <div className="space-y-3">
          {/* Reported Comment - Show prominently when viewing comment report */}
          {isCommentReport && commentDataResult && (
            <div className="bg-card border-2 border-destructive/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-destructive uppercase tracking-wide">Reported Comment</span>
              </div>
              <div className="flex items-start gap-3">
                {/* Commenter avatar */}
                <div className="w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
                  {commentDataResult.commenter.avatarUrl ? (
                    <img
                      src={commentDataResult.commenter.avatarUrl}
                      alt={commentDataResult.commenter.displayName || commentDataResult.commenter.usernameSlug}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Icon name="user" variant="regular" className="text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Comment content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">
                      {commentDataResult.commenter.displayName || `@${commentDataResult.commenter.usernameSlug}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      @{commentDataResult.commenter.usernameSlug}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(commentDataResult.comment.createdAt)}
                    </span>
                    {commentDataResult.comment.isHidden && (
                      <>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="flex items-center gap-1 text-xs text-destructive">
                          <Icon name="eye-slash" variant="regular" />
                          <span>Hidden</span>
                        </span>
                      </>
                    )}
                    {commentDataResult.comment.isDeleted && (
                      <>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="flex items-center gap-1 text-xs text-destructive">
                          <Icon name="trash-xmark" variant="regular" />
                          <span>Deleted</span>
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                    {commentDataResult.comment.content}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Parent Post Preview (context for comment reports) */}
          <div className="bg-card border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {isCommentReport ? 'Parent Post' : 'Reported Post'}
              </span>
            </div>
            <div className="flex items-start gap-3">
              {/* Small thumbnail */}
              <div className="w-32 h-32 rounded-[var(--radius-sm)] overflow-hidden bg-muted shrink-0">
                <img
                  src={postDataResult.post.coverUrl || postDataResult.post.mediaUrl}
                  alt="Post thumbnail"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Post info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
                    {postDataResult.user.avatarUrl ? (
                      <img
                        src={postDataResult.user.avatarUrl}
                        alt={postDataResult.user.displayName || postDataResult.user.usernameSlug}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Icon name="user" variant="regular" className="text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Creator name and metadata */}
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm truncate block">
                      {postDataResult.user.displayName || `@${postDataResult.user.usernameSlug}`}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>@{postDataResult.user.usernameSlug}</span>
                      <span>·</span>
                      <span>{formatRelativeTime(postDataResult.post.createdAt)}</span>
                      {postDataResult.post.type !== 'post' && (() => {
                        const typeMeta = POST_TYPE_META[postDataResult.post.type as keyof typeof POST_TYPE_META]
                        const label = postDataResult.post.type === 'edition' && postDataResult.post.maxSupply
                          ? getEditionLabel(postDataResult.post.maxSupply)
                          : typeMeta.label
                        return (
                          <>
                            <span>·</span>
                            <span className={cn('flex items-center gap-1', typeMeta.badgeClass)}>
                              <Icon name={typeMeta.icon.replace('fa-', '')} variant={typeMeta.iconStyle === 'solid' ? 'solid' : 'regular'} className="text-[10px]" />
                              {label}
                            </span>
                          </>
                        )
                      })()}
                      {postDataResult.post.isHidden && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1 text-destructive">
                            <Icon name="eye-slash" variant="regular" />
                            <span>Hidden</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {postDataResult.post.caption && (
                  <p className="text-sm text-foreground/90 line-clamp-2 mt-2">
                    {postDataResult.post.caption}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions and Notes */}
          <div className="bg-card border rounded-lg p-4">
            <h2 className="text-base font-semibold mb-3">Moderation Actions</h2>
            <div className="flex flex-wrap gap-2">
              {isModerator && (
                <>
                  {((isCommentReport && commentDataResult?.comment.isHidden) || (!isCommentReport && postDataResult.post.isHidden)) ? (
                    <Button
                      variant="outline"
                      onClick={() => unhideMutation.mutate()}
                      disabled={unhideMutation.isPending}
                    >
                      <Icon name="eye" variant="regular" className="mr-2" />
                      Unhide {isCommentReport ? 'Comment' : 'Post'}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={handleHide}
                      disabled={hideMutation.isPending}
                    >
                      <Icon name="eye-slash" variant="regular" className="mr-2" />
                      Hide {isCommentReport ? 'Comment' : 'Post'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => resolveMutation.mutate('no_action')}
                    disabled={resolveMutation.isPending}
                  >
                    <Icon name="check" variant="regular" className="mr-2" />
                    Mark Resolved (No Action)
                  </Button>
                </>
              )}
              {isAdm && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  <Icon name="xmark" variant="regular" className="mr-2" />
                  Delete {isCommentReport ? 'Comment' : 'Post'}
                </Button>
              )}
            </div>

            {/* Moderator Notes */}
            {((isCommentReport && commentDataResult && (commentDataResult.comment.hiddenReason || commentDataResult.comment.deleteReason)) || (!isCommentReport && (postDataResult.post.hiddenReason || postDataResult.post.deleteReason))) && (
              <>
                <div className="mt-4 pt-4 border-t">
                  <h3 className="text-sm font-semibold mb-3">Moderator notes</h3>
                  <div className="space-y-2">
                    {isCommentReport && commentDataResult?.comment.hiddenReason && (
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">Moderator</span>{' '}
                        {commentDataResult.comment.hiddenReason}
                      </p>
                    )}
                    {isCommentReport && commentDataResult?.comment.deleteReason && (
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">Admin</span>{' '}
                        {commentDataResult.comment.deleteReason}
                      </p>
                    )}
                    {!isCommentReport && postDataResult.post.hiddenReason && (
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">
                          {postDataResult.post.hiddenByUser
                            ? postDataResult.post.hiddenByUser.displayName || `@${postDataResult.post.hiddenByUser.usernameSlug}`
                            : 'Moderator'}
                        </span>{' '}
                        {postDataResult.post.hiddenReason}
                      </p>
                    )}
                    {!isCommentReport && postDataResult.post.deleteReason && (
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">
                          {postDataResult.post.deletedByUser
                            ? postDataResult.post.deletedByUser.displayName || `@${postDataResult.post.deletedByUser.usernameSlug}`
                            : 'Admin'}
                        </span>{' '}
                        {postDataResult.post.deleteReason}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* All Reports */}
          <div className="bg-card border rounded-lg p-4">
            <h2 className="text-base font-semibold mb-3">
              All Reports ({reportsData.allReports?.length || 0})
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {reportsData.allReports?.map((report) => (
                <div
                  key={report.id}
                  className="p-3 rounded-[var(--radius-sm)] border bg-muted/50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-muted">
                        {report.reporter.avatarUrl ? (
                          <img
                            src={report.reporter.avatarUrl}
                            alt={report.reporter.displayName || report.reporter.usernameSlug}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <Icon name="user" variant="regular" className="text-xs text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-sm">
                        {report.reporter.displayName || `@${report.reporter.usernameSlug}`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Badge
                      variant={
                        report.status === 'resolved' ? 'success' :
                        report.status === 'open' ? 'warning' : 'secondary'
                      }
                    >
                      {report.status}
                    </Badge>
                  </div>
                  <div className="mb-2">
                    <div className="flex flex-wrap gap-2">
                      {report.reasons.map((reason) => (
                        <Badge key={reason} variant="destructive">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {report.details && (
                    <p className="text-sm text-foreground/90 mt-2">{report.details}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DM Thread Report View */}
      {!isLoading && !error && isDmThreadReport && dmThreadDataResult && reportsData && (
        <div className="space-y-3">
          {/* Reported Conversation */}
          <div className="bg-card border-2 border-destructive/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-destructive uppercase tracking-wide">Reported Conversation</span>
            </div>

            <div className="space-y-4">
              {/* User A */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
                  {dmThreadDataResult.userA?.avatarUrl ? (
                    <img
                      src={dmThreadDataResult.userA.avatarUrl}
                      alt={dmThreadDataResult.userA.displayName || dmThreadDataResult.userA.usernameSlug || ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Icon name="user" variant="regular" className="text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <span className="font-semibold text-sm">
                    {dmThreadDataResult.userA?.displayName || `@${dmThreadDataResult.userA?.usernameSlug}`}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    @{dmThreadDataResult.userA?.usernameSlug}
                  </span>
                </div>
              </div>

              {/* Separator */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon name="arrows-up-down" className="text-xs" />
                <span className="text-xs">Conversation between</span>
              </div>

              {/* User B */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
                  {dmThreadDataResult.userB?.avatarUrl ? (
                    <img
                      src={dmThreadDataResult.userB.avatarUrl}
                      alt={dmThreadDataResult.userB.displayName || dmThreadDataResult.userB.usernameSlug || ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Icon name="user" variant="regular" className="text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <span className="font-semibold text-sm">
                    {dmThreadDataResult.userB?.displayName || `@${dmThreadDataResult.userB?.usernameSlug}`}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    @{dmThreadDataResult.userB?.usernameSlug}
                  </span>
                </div>
              </div>

              {/* Thread metadata */}
              <div className="text-xs text-muted-foreground pt-2 border-t">
                <span>Thread created: {formatRelativeTime(dmThreadDataResult.thread.createdAt)}</span>
                {dmThreadDataResult.thread.lastMessageAt && (
                  <span> · Last message: {formatRelativeTime(dmThreadDataResult.thread.lastMessageAt)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-card border rounded-lg p-4">
            <h2 className="text-base font-semibold mb-3">Moderation Actions</h2>
            <div className="flex flex-wrap gap-2">
              {isModerator && (
                <Button
                  variant="outline"
                  onClick={() => resolveMutation.mutate('no_action')}
                  disabled={resolveMutation.isPending}
                >
                  <Icon name="check" variant="regular" className="mr-2" />
                  Mark Resolved (No Action)
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Note: DM threads cannot be hidden or deleted. Users can block each other within the conversation.
            </p>
          </div>

          {/* All Reports */}
          <div className="bg-card border rounded-lg p-4">
            <h2 className="text-base font-semibold mb-3">
              All Reports ({reportsData.allReports?.length || 0})
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {reportsData.allReports?.map((report) => (
                <div
                  key={report.id}
                  className="p-3 rounded-[var(--radius-sm)] border bg-muted/50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-muted">
                        {report.reporter.avatarUrl ? (
                          <img
                            src={report.reporter.avatarUrl}
                            alt={report.reporter.displayName || report.reporter.usernameSlug}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <Icon name="user" variant="regular" className="text-xs text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-sm">
                        {report.reporter.displayName || `@${report.reporter.usernameSlug}`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Badge
                      variant={
                        report.status === 'resolved' ? 'success' :
                        report.status === 'open' ? 'warning' : 'secondary'
                      }
                    >
                      {report.status}
                    </Badge>
                  </div>
                  <div className="mb-2">
                    <div className="flex flex-wrap gap-2">
                      {report.reasons.map((reason) => (
                        <Badge key={reason} variant="destructive">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {report.details && (
                    <p className="text-sm text-foreground/90 mt-2">{report.details}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hide Post Dialog */}
      <Dialog open={showHideDialog} onOpenChange={setShowHideDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hide {isCommentReport ? 'Comment' : 'Post'}</DialogTitle>
            <DialogDescription>
              Enter a reason for hiding this {isCommentReport ? 'comment' : 'post'}. This will make it invisible to regular users.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={`Enter reason for hiding this ${isCommentReport ? 'comment' : 'post'}...`}
              value={hideReason}
              onChange={(e) => setHideReason(e.target.value)}
              rows={4}
              maxLength={500}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setShowHideDialog(false)
              setHideReason('')
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleHideConfirm}
              disabled={!hideReason.trim() || hideMutation.isPending}
            >
              {hideMutation.isPending ? 'Hiding...' : `Hide ${isCommentReport ? 'Comment' : 'Post'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Post Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {isCommentReport ? 'Comment' : 'Post'}</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The {isCommentReport ? 'comment' : 'post'} will be permanently removed from the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={`Enter reason for deleting this ${isCommentReport ? 'comment' : 'post'}...`}
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              rows={4}
              maxLength={500}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setShowDeleteDialog(false)
              setDeleteReason('')
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={!deleteReason.trim() || deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : `Delete ${isCommentReport ? 'Comment' : 'Post'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
