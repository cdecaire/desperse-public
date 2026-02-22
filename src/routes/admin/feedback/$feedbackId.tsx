/**
 * Admin Feedback Detail Page
 * Shows full details of a feedback submission
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useBetaFeedbackById, useMarkBetaFeedbackReviewed } from '@/hooks/useFeedback'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

// Format relative time
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

// Star display component
function StarDisplay({ rating, size = 'md' }: { rating: number | null; size?: 'sm' | 'md' }) {
  if (rating === null) {
    return <span className="text-muted-foreground">No rating</span>
  }

  const starSize = size === 'sm' ? 'text-sm' : 'text-xl'

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Icon
          key={star}
          name="star"
          variant={star <= rating ? 'solid' : 'regular'}
          className={cn(
            starSize,
            star <= rating
              ? 'text-yellow-400'
              : 'text-muted-foreground/30'
          )}
        />
      ))}
      <span className="ml-2 text-sm text-muted-foreground">({rating}/5)</span>
    </div>
  )
}

export const Route = createFileRoute('/admin/feedback/$feedbackId')({
  component: FeedbackDetailPage,
})

function FeedbackDetailPage() {
  const { feedbackId } = Route.useParams()
  const navigate = useNavigate()

  const { data: feedback, isLoading, isPending, error } = useBetaFeedbackById(feedbackId)
  const markReviewed = useMarkBetaFeedbackReviewed()

  const handleMarkReviewed = () => {
    if (feedbackId) {
      markReviewed.mutate(feedbackId)
    }
  }

  return (
    <div className="max-w-4xl py-4">
      <Button
        variant="ghost"
        onClick={() => navigate({ to: '/admin/feedback' })}
        className="mb-4 hidden md:inline-flex"
      >
        <Icon name="arrow-left" variant="regular" className="mr-2" />
        Back to Feedback
      </Button>

      {(isLoading || isPending) && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <div className="ml-4 text-sm text-muted-foreground">
            Loading feedback...
          </div>
        </div>
      )}

      {error && (
        <EmptyState
          icon={<Icon name="circle-exclamation" variant="regular" className="text-4xl" />}
          title="Failed to load feedback"
          description={error.message || 'An error occurred while loading feedback.'}
        />
      )}

      {!isLoading && !isPending && !feedback && (
        <EmptyState
          icon={<Icon name="circle-exclamation" variant="regular" className="text-4xl" />}
          title="Feedback not found"
          description="The feedback submission could not be found."
        />
      )}

      {!isLoading && !isPending && feedback && (
        <div className="space-y-4">
          {/* User & Status Header */}
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-muted shrink-0">
                  {feedback.user?.avatarUrl ? (
                    <img
                      src={feedback.user.avatarUrl}
                      alt={feedback.user.displayName || feedback.user.usernameSlug || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Icon name="user" variant="regular" className="text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold">
                    {feedback.displayName || feedback.user?.displayName || `@${feedback.user?.usernameSlug}` || 'Unknown'}
                  </p>
                  {feedback.user?.usernameSlug && (
                    <p className="text-sm text-muted-foreground">@{feedback.user.usernameSlug}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                    feedback.status === 'new'
                      ? 'bg-(--tone-warning)/10 text-(--tone-warning) border border-(--tone-warning)/20'
                      : 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                  )}
                >
                  {feedback.status === 'new' ? 'New' : 'Reviewed'}
                </span>
              </div>
            </div>

            <div className="mt-3 text-sm text-muted-foreground">
              Submitted {formatRelativeTime(feedback.createdAt)}
              {feedback.reviewedAt && (
                <span> · Reviewed {formatRelativeTime(feedback.reviewedAt)}</span>
              )}
            </div>
          </div>

          {/* Rating */}
          <div className="bg-card border rounded-lg p-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Rating
            </h2>
            <StarDisplay rating={feedback.rating} />
          </div>

          {/* Message */}
          {feedback.message && (
            <div className="bg-card border rounded-lg p-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Message
              </h2>
              <p className="text-foreground whitespace-pre-wrap break-words">
                {feedback.message}
              </p>
            </div>
          )}

          {/* Screenshot */}
          {feedback.imageUrl && (
            <div className="bg-card border rounded-lg p-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Screenshot
              </h2>
              <a
                href={feedback.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={feedback.imageUrl}
                  alt="Feedback screenshot"
                  className="max-w-full max-h-[400px] rounded-lg border object-contain"
                />
              </a>
            </div>
          )}

          {/* Context */}
          <div className="bg-card border rounded-lg p-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Context
            </h2>
            <div className="space-y-2 text-sm">
              {feedback.pageUrl && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground shrink-0 w-20">Page:</span>
                  <a
                    href={feedback.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline break-all"
                  >
                    {feedback.pageUrl}
                  </a>
                </div>
              )}
              {feedback.appVersion && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground shrink-0 w-20">Version:</span>
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                    {feedback.appVersion}
                  </span>
                </div>
              )}
              {feedback.userAgent && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground shrink-0 w-20">Browser:</span>
                  <span className="text-xs text-muted-foreground break-all">
                    {feedback.userAgent}
                  </span>
                </div>
              )}
              {!feedback.pageUrl && !feedback.appVersion && !feedback.userAgent && (
                <p className="text-muted-foreground italic">No context available</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-card border rounded-lg p-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Actions
            </h2>
            <div className="flex flex-wrap gap-2">
              {feedback.status === 'new' ? (
                <Button
                  onClick={handleMarkReviewed}
                  disabled={markReviewed.isPending}
                >
                  <Icon name="check" variant="regular" className="mr-2" />
                  {markReviewed.isPending ? 'Marking...' : 'Mark as Reviewed'}
                </Button>
              ) : (
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon name="check-circle" variant="regular" className="text-green-500" />
                  Already reviewed
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
