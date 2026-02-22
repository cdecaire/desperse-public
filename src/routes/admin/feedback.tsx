/**
 * Admin Beta Feedback List Page
 * Shows all user feedback for review
 */

import { createFileRoute, Outlet, useMatchRoute, Link } from '@tanstack/react-router'
import { useBetaFeedbackList } from '@/hooks/useFeedback'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import { useState } from 'react'

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
function StarDisplay({ rating }: { rating: number | null }) {
  if (rating === null) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Icon
          key={star}
          name="star"
          variant={star <= rating ? 'solid' : 'regular'}
          className={cn(
            'text-sm',
            star <= rating
              ? 'text-yellow-400'
              : 'text-muted-foreground/30'
          )}
        />
      ))}
    </div>
  )
}

export const Route = createFileRoute('/admin/feedback')({
  component: FeedbackListPage,
})

function FeedbackListPage() {
  const matchRoute = useMatchRoute()
  const [activeTab, setActiveTab] = useState<'new' | 'reviewed'>('new')

  // Check if we're on a detail page (child route)
  const isDetailPage = matchRoute({ to: '/admin/feedback/$feedbackId' })

  const { data, isLoading, isPending, error } = useBetaFeedbackList(activeTab)

  // If we're on a detail page, render the outlet (child route)
  if (isDetailPage) {
    return <Outlet />
  }

  return (
    <div className="pt-4">
      <div className="max-w-4xl">
        <div className="space-y-2 mb-6">
          <h1 className="hidden md:block text-xl font-bold">Beta Feedback</h1>
          <p className="text-sm text-muted-foreground">
            Review user feedback, bugs, and ideas.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mb-4 border-b border-border">
          <button
            onClick={() => setActiveTab('new')}
            className={cn(
              'py-3 text-sm font-medium transition-colors relative',
              activeTab === 'new'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground/80'
            )}
          >
            New
            {activeTab === 'new' && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-foreground rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('reviewed')}
            className={cn(
              'py-3 text-sm font-medium transition-colors relative',
              activeTab === 'reviewed'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground/80'
            )}
          >
            Reviewed
            {activeTab === 'reviewed' && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-foreground rounded-full" />
            )}
          </button>
        </div>

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

        {!isLoading && !isPending && (!data || data.length === 0) && (
          <EmptyState
            icon={<Icon name="message-lines" variant="regular" className="text-4xl" />}
            title={activeTab === 'new' ? 'No new feedback' : 'No reviewed feedback'}
            description={activeTab === 'new'
              ? 'No new feedback to review.'
              : 'No reviewed feedback yet.'}
          />
        )}

        {data && data.length > 0 && (
          <div className="space-y-3">
            {data.map((feedback) => (
              <Link
                key={feedback.id}
                to="/admin/feedback/$feedbackId"
                params={{ feedbackId: feedback.id }}
                className="block"
              >
                <div className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-start gap-4">
                    {/* User avatar */}
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
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

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-sm truncate">
                            {feedback.displayName || feedback.user?.displayName || `@${feedback.user?.usernameSlug}` || 'Unknown'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(feedback.createdAt)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Screenshot indicator */}
                          {feedback.imageUrl && (
                            <span className="text-muted-foreground">
                              <Icon name="image" variant="regular" className="text-sm" />
                            </span>
                          )}
                          {/* Rating */}
                          <StarDisplay rating={feedback.rating} />
                        </div>
                      </div>

                      {/* Message preview */}
                      {feedback.message ? (
                        <p className="text-sm text-foreground/90 line-clamp-2">
                          {feedback.message}
                        </p>
                      ) : feedback.imageUrl ? (
                        <p className="text-sm text-muted-foreground italic">
                          Screenshot attached
                        </p>
                      ) : feedback.rating ? (
                        <p className="text-sm text-muted-foreground italic">
                          Rating only
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
