/**
 * Admin Beta Feedback List Page
 * Shows all user feedback for review
 */

import { createFileRoute, Outlet, useMatchRoute, Link } from '@tanstack/react-router'
import { useBetaFeedbackList } from '@/hooks/useFeedback'
import { ContentLoadingSkeleton } from '@/components/shared/ContentLoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { Icon } from '@/components/ui/icon'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { formatRelativeTime } from '@/lib/dates'
import { Stack, Row } from '@cdecaire/sable/layout'

// Star display component
function StarDisplay({ rating }: { rating: number | null }) {
  if (rating === null) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <Row align="center" gap={0.25}>
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
    </Row>
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
        <Stack gap={1} className="mb-6">
          <h1 className="hidden md:block text-heading-3">Beta Feedback</h1>
          <p className="text-body-sm text-muted-foreground">
            Review user feedback, bugs, and ideas.
          </p>
        </Stack>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'new' | 'reviewed')}
          className="mb-4"
        >
          <TabsList>
            <TabsTrigger value="new">New</TabsTrigger>
            <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
          </TabsList>
        </Tabs>

        {(isLoading || isPending) && (
          <ContentLoadingSkeleton label="Loading feedback" rows={5} />
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
          <Stack gap={1.5}>
            {data.map((feedback) => (
              <Link
                key={feedback.id}
                to="/admin/feedback/$feedbackId"
                params={{ feedbackId: feedback.id }}
                className="block"
              >
                <div className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                  <Row align="start" gap={2}>
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
                      <Row align="center" justify="between" gap={1} className="mb-1">
                        <Row align="center" gap={1} className="min-w-0">
                          <span className="text-label-md truncate">
                            {feedback.displayName || feedback.user?.displayName || `@${feedback.user?.usernameSlug}` || 'Unknown'}
                          </span>
                          <span className="text-caption text-muted-foreground">
                            {formatRelativeTime(feedback.createdAt)}
                          </span>
                        </Row>

                        <Row align="center" gap={1} className="shrink-0">
                          {/* Screenshot indicator */}
                          {feedback.imageUrl && (
                            <span className="text-muted-foreground">
                              <Icon name="image" variant="regular" className="text-sm" />
                            </span>
                          )}
                          {/* Rating */}
                          <StarDisplay rating={feedback.rating} />
                        </Row>
                      </Row>

                      {/* Message preview */}
                      {feedback.message ? (
                        <p className="text-body-sm text-foreground/90 line-clamp-2">
                          {feedback.message}
                        </p>
                      ) : feedback.imageUrl ? (
                        <p className="text-body-sm text-muted-foreground italic">
                          Screenshot attached
                        </p>
                      ) : feedback.rating ? (
                        <p className="text-body-sm text-muted-foreground italic">
                          Rating only
                        </p>
                      ) : null}
                    </div>
                  </Row>
                </div>
              </Link>
            ))}
          </Stack>
        )}
    </div>
  )
}
