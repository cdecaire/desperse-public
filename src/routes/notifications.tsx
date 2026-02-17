/**
 * User Notifications Page
 * Shows all notifications for the current user
 */

import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useCallback } from 'react'
import { AuthGuard } from '@/components/shared/AuthGuard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { PullToRefresh } from '@/components/shared/PullToRefresh'
import { useNotifications, useMarkAllNotificationsAsReadMutation, useClearAllNotificationsMutation } from '@/hooks/useNotifications'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { Button } from '@/components/ui/button'
import { useQueryClient } from '@tanstack/react-query'

export const Route = createFileRoute('/notifications')({
  component: NotificationsPage,
})

function NotificationsPage() {
  return (
    <AuthGuard>
      <NotificationsContent />
    </AuthGuard>
  )
}

function NotificationsContent() {
  const queryClient = useQueryClient()
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    error,
  } = useNotifications()

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  const markAllAsRead = useMarkAllNotificationsAsReadMutation()
  const clearAll = useClearAllNotificationsMutation()

  // Simple scroll-based infinite loading
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback(() => {
    if (!loadMoreRef.current) return
    const rect = loadMoreRef.current.getBoundingClientRect()
    if (rect.top < window.innerHeight + 200 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Flatten all pages of notifications
  const allNotifications = data?.pages.flatMap((page) => page.notifications) ?? []

  // Check if there are any unread notifications
  const hasUnread = allNotifications.some((n) => !n.isRead)

  // Mark all notifications as read when visiting the page
  useEffect(() => {
    if (hasUnread && !markAllAsRead.isPending) {
      markAllAsRead.mutate()
    }
  }, [hasUnread])

  // Invalidate notification counters when leaving the page
  useEffect(() => {
    return () => {
      queryClient.invalidateQueries({ queryKey: ['notification-counters'] })
    }
  }, [queryClient])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4">
        <p className="text-destructive">Failed to load notifications</p>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    )
  }

  // Empty state - no header needed
  if (allNotifications.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <EmptyState
          icon={<i className="fa-regular fa-bell text-4xl" />}
          title="No notifications yet"
          description="When someone follows you or interacts with your posts, you'll see it here."
        />
      </div>
    )
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="pt-4 px-4 md:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="space-y-2 mb-6">
            <h1 className="hidden md:block text-xl font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              Stay updated on follows, likes, comments, and more.
            </p>
          </div>

          {/* Notifications list */}
          <div className="space-y-2">
            {allNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
              />
            ))}

            {/* Load more trigger */}
            {(isFetchingNextPage || hasNextPage) && (
              <div ref={loadMoreRef} className="py-4 flex justify-center">
                {isFetchingNextPage ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <span className="text-sm text-muted-foreground">Scroll for more...</span>
                )}
              </div>
            )}

            {/* Clear all button */}
            <div className="pt-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => clearAll.mutate()}
                disabled={clearAll.isPending}
              >
                {clearAll.isPending ? 'Clearing...' : 'Clear all notifications'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PullToRefresh>
  )
}
