/**
 * ModerationRowMenu Component
 * Row actions menu for content moderation table
 */

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { hidePost, unhidePost, hideComment, unhideComment, resolveReports } from '@/server/functions/admin'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface ModerationRowMenuProps {
  contentType: 'post' | 'comment'
  postId: string
  commentId?: string
  isHidden: boolean
  hasOpenReports: boolean
  className?: string
}

export function ModerationRowMenu({
  contentType,
  postId,
  commentId,
  isHidden,
  hasOpenReports,
  className,
}: ModerationRowMenuProps) {
  const [showHideDialog, setShowHideDialog] = useState(false)
  const [hideReason, setHideReason] = useState('')
  const { getAuthHeaders } = useAuth()
  const queryClient = useQueryClient()

  const isComment = contentType === 'comment'
  const contentId = isComment ? commentId! : postId

  const hideMutation = useMutation({
    mutationFn: async (reason: string) => {
      const authHeaders = await getAuthHeaders()
      if (isComment && commentId) {
        const result = await hideComment({
          data: {
            commentId,
            reason,
            _authorization: authHeaders.Authorization,
          },
        } as never)
        if (!result.success) throw new Error(result.error || 'Failed to hide comment')
        return result
      } else {
        const result = await hidePost({
          data: {
            postId,
            reason,
            _authorization: authHeaders.Authorization,
          },
        } as never)
        if (!result.success) throw new Error(result.error || 'Failed to hide post')
        return result
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      queryClient.invalidateQueries({ queryKey: ['notification-counters'] })
      toast.success(`${isComment ? 'Comment' : 'Post'} hidden successfully`)
    },
    onError: (error) => {
      toast.error(error.message || `Failed to hide ${isComment ? 'comment' : 'post'}`)
    },
  })

  const unhideMutation = useMutation({
    mutationFn: async () => {
      const authHeaders = await getAuthHeaders()
      if (isComment && commentId) {
        const result = await unhideComment({
          data: {
            commentId,
            _authorization: authHeaders.Authorization,
          },
        } as never)
        if (!result.success) throw new Error(result.error || 'Failed to unhide comment')
        return result
      } else {
        const result = await unhidePost({
          data: {
            postId,
            _authorization: authHeaders.Authorization,
          },
        } as never)
        if (!result.success) throw new Error(result.error || 'Failed to unhide post')
        return result
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      queryClient.invalidateQueries({ queryKey: ['notification-counters'] })
      toast.success(`${isComment ? 'Comment' : 'Post'} unhidden successfully`)
    },
    onError: (error) => {
      toast.error(error.message || `Failed to unhide ${isComment ? 'comment' : 'post'}`)
    },
  })

  const resolveMutation = useMutation({
    mutationFn: async () => {
      const authHeaders = await getAuthHeaders()
      const result = await resolveReports({
        data: {
          contentType,
          contentId,
          resolution: 'no_action',
          _authorization: authHeaders.Authorization,
        },
      } as never)
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

  const handleHideConfirm = () => {
    if (hideReason.trim()) {
      hideMutation.mutate(hideReason.trim())
      setShowHideDialog(false)
      setHideReason('')
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full hover:bg-accent transition-colors",
              className
            )}
            aria-label="Actions menu"
          >
            <i className="fa-regular fa-ellipsis-vertical text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[180px]">
          {/* Hide/Unhide */}
          {isHidden ? (
            <DropdownMenuItem
              onClick={() => unhideMutation.mutate()}
              disabled={unhideMutation.isPending}
            >
              <i className="fa-regular fa-eye w-4 text-center text-muted-foreground" />
              <span>{unhideMutation.isPending ? 'Unhiding...' : `Unhide ${isComment ? 'comment' : 'post'}`}</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setShowHideDialog(true)}>
              <i className="fa-regular fa-eye-slash w-4 text-center text-muted-foreground" />
              <span>Hide {isComment ? 'comment' : 'post'}</span>
            </DropdownMenuItem>
          )}

          {/* Mark resolved (only show if there are open reports) */}
          {hasOpenReports && (
            <DropdownMenuItem
              onClick={() => resolveMutation.mutate()}
              disabled={resolveMutation.isPending}
            >
              <i className="fa-regular fa-check w-4 text-center text-muted-foreground" />
              <span>{resolveMutation.isPending ? 'Resolving...' : 'Mark resolved'}</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hide Dialog */}
      <Dialog open={showHideDialog} onOpenChange={setShowHideDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Hide {isComment ? 'Comment' : 'Post'}</DialogTitle>
            <DialogDescription>
              Enter a reason for hiding this {isComment ? 'comment' : 'post'}. This will make it invisible to regular users.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={`Enter reason for hiding this ${isComment ? 'comment' : 'post'}...`}
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
              {hideMutation.isPending ? 'Hiding...' : `Hide ${isComment ? 'Comment' : 'Post'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
