/**
 * ConversationView Component
 * Chat interface for a single conversation
 */

import { useEffect, useRef, useMemo, useCallback, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { ConversationMenu } from './ConversationMenu'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { ReportModal } from '@/components/forms/ReportModal'
import { useMessages, useSendMessage, useMarkRead, useBlockInThread, type Thread } from '@/hooks/useMessages'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useCreateReport } from '@/hooks/useReports'
import { useMessaging } from './MessagingContext'

interface ConversationViewProps {
  thread: Thread
  onBack: () => void
  onClose?: () => void
}

/**
 * Check if two dates are on different calendar days
 */
function isDifferentDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() !== date2.getFullYear() ||
    date1.getMonth() !== date2.getMonth() ||
    date1.getDate() !== date2.getDate()
  )
}

/**
 * Format a date for the date separator
 * Shows "Today", "Yesterday", or the full date
 */
function formatDateSeparator(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (messageDate.getTime() === today.getTime()) {
    return 'Today'
  }
  if (messageDate.getTime() === yesterday.getTime()) {
    return 'Yesterday'
  }
  // Show full date for older messages
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: messageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

// Module-level state shared across all ConversationView instances
// This handles the case where mobile and desktop views are both rendered
const sharedMarkReadState = {
  lastMarkedThreadId: null as string | null,
  lastMarkedTime: 0,
}

export function ConversationView({ thread, onBack, onClose }: ConversationViewProps) {
  const { user } = useCurrentUser()
  const { shouldPollMessages } = useMessaging()
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const prevMessageCountRef = useRef(0)

  // Local state for block status (updates immediately on action)
  const [isBlocked, setIsBlocked] = useState(thread.isBlocked)
  const [isBlockedBy] = useState(thread.isBlockedBy)

  // Report modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)

  // Track if we've already marked this thread as read to prevent infinite loops
  // The thread.hasUnread prop is from a stale snapshot and doesn't update
  const hasMarkedReadRef = useRef(false)

  const {
    data: messagesData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useMessages(thread.id, shouldPollMessages)

  const sendMessageMutation = useSendMessage()
  const markReadMutation = useMarkRead()
  const blockMutation = useBlockInThread()
  const reportMutation = useCreateReport()

  // Flatten pages to get all messages
  const messages = useMemo(() => {
    if (!messagesData?.pages) return []
    // Messages come newest first, we want oldest first for display
    const allMessages = messagesData.pages.flatMap((page) => page.messages)
    return [...allMessages].reverse()
  }, [messagesData])

  // Get other user's last read timestamp for "Seen" indicator
  const otherLastReadAt = useMemo(() => {
    if (!messagesData?.pages?.[0]) return null
    return messagesData.pages[0].otherLastReadAt
  }, [messagesData])

  // Track last marked read time to debounce markRead calls (prevent infinite loops)
  const lastMarkedReadTimeRef = useRef<number>(0)
  const lastMarkedThreadIdRef = useRef<string | null>(null) // Track which thread we last marked
  const MARK_READ_DEBOUNCE_MS = 2000 // Only mark read once every 2 seconds max

  // Track the latest message ID to detect truly NEW messages (not existing ones on mount)
  const prevLatestMessageIdRef = useRef<string | null>(null)

  // Store mutation in ref to avoid dependency issues
  const markReadMutationRef = useRef(markReadMutation)
  markReadMutationRef.current = markReadMutation

  // Reset tracking only when thread ACTUALLY changes (not on StrictMode remount)
  useEffect(() => {
    if (lastMarkedThreadIdRef.current !== thread.id) {
      hasMarkedReadRef.current = false
      lastMarkedReadTimeRef.current = 0
      prevLatestMessageIdRef.current = null
      lastMarkedThreadIdRef.current = thread.id
    }
  }, [thread.id])

  // Mark thread as read when viewing (debounced to prevent loops)
  // Uses shared module-level state to dedupe across mobile/desktop instances
  const markAsReadIfNeeded = useCallback(() => {
    const now = Date.now()

    // Check shared state first (handles multiple ConversationView instances)
    if (
      sharedMarkReadState.lastMarkedThreadId === thread.id &&
      now - sharedMarkReadState.lastMarkedTime < MARK_READ_DEBOUNCE_MS
    ) {
      return // Another instance already marked this thread recently
    }

    // Also check instance-level state
    if (now - lastMarkedReadTimeRef.current < MARK_READ_DEBOUNCE_MS) {
      return // Too soon, skip
    }
    if (markReadMutationRef.current.isPending) {
      return // Already in progress
    }

    // Update both shared and instance state
    sharedMarkReadState.lastMarkedThreadId = thread.id
    sharedMarkReadState.lastMarkedTime = now
    lastMarkedReadTimeRef.current = now

    markReadMutationRef.current.mutate(thread.id)
  }, [thread.id]) // Only depends on thread.id, uses ref for mutation

  // Mark as read on initial open if thread has unread messages
  useEffect(() => {
    if (thread.hasUnread && !hasMarkedReadRef.current) {
      hasMarkedReadRef.current = true
      markAsReadIfNeeded()
    }
  }, [thread.id, thread.hasUnread, markAsReadIfNeeded])

  // Also mark as read when new messages from others arrive while viewing
  const latestMessageId = messages.length > 0 ? messages[messages.length - 1]?.id : null

  useEffect(() => {
    const prevId = prevLatestMessageIdRef.current

    // Always update the ref to current value
    prevLatestMessageIdRef.current = latestMessageId

    // Only trigger for truly NEW messages:
    // - Previous must have been a real ID (not null/undefined - means we had data before)
    // - Current must be a real ID
    // - They must be different
    // This prevents triggering on initial data load (prevId would be null/undefined)
    if (prevId && latestMessageId && prevId !== latestMessageId) {
      const latestMessage = messages[messages.length - 1]
      // Only mark read for messages from others (not our own)
      if (latestMessage && latestMessage.senderId !== user?.id) {
        markAsReadIfNeeded()
      }
    }
  }, [latestMessageId, messages, user?.id, markAsReadIfNeeded])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    // Only auto-scroll if new message was added (not when loading older)
    if (messages.length > prevMessageCountRef.current) {
      // Check if user is near bottom (within 100px)
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100

      if (isNearBottom || prevMessageCountRef.current === 0) {
        container.scrollTop = container.scrollHeight
      }
    }

    prevMessageCountRef.current = messages.length
  }, [messages.length])

  // Load more when scrolling to top
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return

    if (container.scrollTop < 50 && hasNextPage && !isFetchingNextPage) {
      // Store current scroll position to maintain it after loading
      const prevScrollHeight = container.scrollHeight

      fetchNextPage().then(() => {
        // Maintain scroll position after loading older messages
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight
            container.scrollTop = newScrollHeight - prevScrollHeight
          }
        })
      })
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleSend = useCallback((content: string) => {
    sendMessageMutation.mutate({ threadId: thread.id, content })
  }, [sendMessageMutation, thread.id])

  const handleBlock = useCallback(() => {
    const newBlockedState = !isBlocked
    blockMutation.mutate(
      { threadId: thread.id, blocked: newBlockedState },
      {
        onSuccess: () => {
          setIsBlocked(newBlockedState)
        },
      }
    )
  }, [blockMutation, thread.id, isBlocked])

  const handleReport = useCallback(() => {
    setIsReportModalOpen(true)
  }, [])

  const handleReportSubmit = useCallback(async (reasons: string[], details?: string) => {
    await reportMutation.mutateAsync({
      contentType: 'dm_thread',
      contentId: thread.id,
      reasons,
      details: details || null,
    })
    setIsReportModalOpen(false)
  }, [reportMutation, thread.id])

  const { otherUser } = thread
  const displayName = otherUser.displayName || otherUser.usernameSlug || 'Unknown'
  const profilePath = otherUser.usernameSlug ? `/profile/${otherUser.usernameSlug}` : null

  // Find the last message sent by the current user to check for "Seen" status
  const lastOwnMessageIndex = useMemo(() => {
    if (!user?.id) return -1
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderId === user.id && !messages[i].isDeleted) {
        return i
      }
    }
    return -1
  }, [messages, user?.id])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="flex-shrink-0 md:hidden"
          aria-label="Back to conversations"
        >
          <i className="fa-solid fa-arrow-left text-sm" aria-hidden="true" />
        </Button>

        {/* User info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex-shrink-0">
            {otherUser.avatarUrl ? (
              <img
                src={otherUser.avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <i className="fa-solid fa-user" aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            {profilePath ? (
              <Link
                to={profilePath}
                className="text-sm font-semibold hover:underline truncate block"
                onClick={onClose}
              >
                {displayName}
              </Link>
            ) : (
              <span className="text-sm font-semibold truncate block">{displayName}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <ConversationMenu
            otherUser={otherUser}
            isBlocked={isBlocked}
            isBlockPending={blockMutation.isPending}
            onBlock={handleBlock}
            onReport={handleReport}
            onClose={onClose}
          />
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hidden md:flex"
              aria-label="Close conversation"
            >
              <i className="fa-solid fa-xmark text-sm" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-background"
      >
        {/* Loading older messages indicator */}
        {isFetchingNextPage && (
          <div className="flex items-center justify-center py-2">
            <LoadingSpinner className="w-5 h-5" />
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">Say hello!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwn = message.senderId === user?.id
            // Show "Seen" on the last own message if recipient has read it
            const showSeen =
              isOwn &&
              index === lastOwnMessageIndex &&
              !!otherLastReadAt &&
              new Date(otherLastReadAt) >= new Date(message.createdAt)

            // Check if we should show a date separator before this message
            const messageDate = new Date(message.createdAt)
            const prevMessage = index > 0 ? messages[index - 1] : null
            const showDateSeparator = !prevMessage || isDifferentDay(messageDate, new Date(prevMessage.createdAt))

            return (
              <div key={message.id}>
                {showDateSeparator && (
                  <div className="flex items-center justify-center py-3">
                    <span className="text-xs text-muted-foreground px-3 py-1 bg-muted rounded-full">
                      {formatDateSeparator(messageDate)}
                    </span>
                  </div>
                )}
                <MessageBubble
                  message={message}
                  isOwn={isOwn}
                  showSeen={showSeen}
                />
              </div>
            )
          })
        )}
      </div>

      {/* Input or blocked state */}
      {isBlockedBy ? (
        <div className="p-4 border-t bg-muted/50 text-center">
          <p className="text-sm text-muted-foreground">You cannot reply to this conversation</p>
        </div>
      ) : isBlocked ? (
        <div className="p-4 border-t bg-muted/50 text-center">
          <p className="text-sm text-muted-foreground">You blocked this user</p>
          <Button
            variant="link"
            size="default"
            onClick={handleBlock}
            disabled={blockMutation.isPending}
            className="text-sm"
          >
            Unblock to continue messaging
          </Button>
        </div>
      ) : (
        <MessageInput
          onSend={handleSend}
          isLoading={sendMessageMutation.isPending}
          disabled={false}
        />
      )}

      {/* Report Modal */}
      <ReportModal
        open={isReportModalOpen}
        onOpenChange={setIsReportModalOpen}
        contentType="dm_thread"
        contentId={thread.id}
        contentUser={{
          id: otherUser.id,
          usernameSlug: otherUser.usernameSlug || 'unknown',
          displayName: otherUser.displayName,
          avatarUrl: otherUser.avatarUrl,
        }}
        onSubmit={handleReportSubmit}
      />
    </div>
  )
}
