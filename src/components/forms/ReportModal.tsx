/**
 * ReportModal Component
 * Modal for reporting posts with multi-select reasons and optional details
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { PostCardUser } from '@/components/feed/PostCard'

export const REPORT_REASONS = [
  'Copyright infringement',
  'Fraud / scam',
  'Hate speech',
  'Abuse & harassment',
  'Privacy concern',
  'Other',
] as const

export type ReportReason = typeof REPORT_REASONS[number]

interface ReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contentType?: 'post' | 'comment' | 'dm_thread'
  contentId: string
  // For posts
  postId?: string
  postUser?: PostCardUser
  postCaption?: string | null
  postMediaUrl?: string
  // For comments
  contentUser?: PostCardUser
  contentText?: string
  // For dm_thread - reuses contentUser for the other user's info
  // Handler
  onSubmit: (reasons: string[], details?: string) => void | Promise<void>
}

export function ReportModal({
  open,
  onOpenChange,
  contentType = 'post',
  contentId,
  postId,
  postUser,
  postCaption,
  postMediaUrl,
  contentUser,
  contentText,
  onSubmit,
}: ReportModalProps) {
  // Determine which user/content to show based on contentType
  const user = contentType === 'post' ? postUser : contentUser
  const isComment = contentType === 'comment'
  const isDmThread = contentType === 'dm_thread'
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])
  const [details, setDetails] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const hasOther = selectedReasons.includes('Other')
  const isDetailsRequired = hasOther
  const canSubmit = selectedReasons.length > 0 && (!isDetailsRequired || details.trim().length > 0)

  const handleReasonToggle = (reason: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason],
    )
    // Clear details if "Other" is deselected
    if (reason === 'Other' && selectedReasons.includes('Other')) {
      setDetails('')
    }
  }

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return

    setIsSubmitting(true)
    try {
      const result = onSubmit(selectedReasons, hasOther ? details.trim() : undefined)
      // Handle both sync and async handlers
      if (result instanceof Promise) {
        await result
      }
      // Reset form
      setSelectedReasons([])
      setDetails('')
      onOpenChange(false)
    } catch (error) {
      // Error handling is done in parent component
      console.error('Error submitting report:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setSelectedReasons([])
    setDetails('')
    onOpenChange(false)
  }

  if (!user) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report content</DialogTitle>
          <DialogDescription>
            {(isComment || isDmThread) && (
              <span className="block mb-1 text-xs text-muted-foreground">
                Reporting: {isComment ? 'Comment' : 'Conversation'}
              </span>
            )}
            Help us understand what's wrong with this content. Select all that apply.
          </DialogDescription>
        </DialogHeader>

        {/* Content Preview */}
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName || user.usernameSlug}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <i className="fa-regular fa-user text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {user.displayName || `@${user.usernameSlug}`}
              </p>
              <p className="text-xs text-muted-foreground truncate">@{user.usernameSlug}</p>
            </div>
          </div>

          {isComment ? (
            <div className="text-sm text-foreground/90">
              <p className="font-medium mb-1">Comment:</p>
              <p className="line-clamp-4">{contentText}</p>
            </div>
          ) : isDmThread ? (
            <div className="text-sm text-muted-foreground">
              <p>Report this conversation with {user?.displayName || `@${user?.usernameSlug}`}</p>
            </div>
          ) : (
            <>
              {postCaption && (
                <p className="text-sm text-foreground/90 line-clamp-2">{postCaption}</p>
              )}

              {postMediaUrl && (
                <div className="w-full aspect-square max-h-32 rounded overflow-hidden bg-muted">
                  <img
                    src={postMediaUrl}
                    alt="Post media"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Report Reasons */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Why are you reporting this?</label>
          <p className="text-xs text-muted-foreground mb-3">Select all that apply</p>
          <div className="space-y-2">
            {REPORT_REASONS.map((reason) => {
              const isChecked = selectedReasons.includes(reason)
              return (
                <label
                  key={reason}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    isChecked
                      ? 'bg-accent border-accent-foreground/20'
                      : 'bg-background border-border hover:bg-accent/50',
                  )}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => handleReasonToggle(reason)}
                  />
                  <span className="text-sm flex-1">{reason}</span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Details Input (required if "Other" selected) */}
        {hasOther && (
          <div>
            <label htmlFor="report-details" className="text-sm font-medium mb-2 block">
              Please provide more details <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe the issue..."
                maxLength={500}
                rows={4}
                className="resize-none pb-7"
              />
              <div className="absolute bottom-2 right-3 text-xs text-muted-foreground pointer-events-none">
                {details.length} / 500
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

