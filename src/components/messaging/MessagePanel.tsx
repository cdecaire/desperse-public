/**
 * MessagePanel Component
 * Sheet containing thread list and conversation view
 */

import { useState, useMemo, useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ThreadList } from './ThreadList'
import { ConversationView } from './ConversationView'
import { useThreads, type Thread } from '@/hooks/useMessages'
import { useMessaging } from './MessagingContext'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'

interface MessagePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialThreadId?: string
}

export function MessagePanel({ open, onOpenChange, initialThreadId }: MessagePanelProps) {
  const [activeThread, setActiveThread] = useState<Thread | null>(null)
  const { shouldPollMessages } = useMessaging()

  const {
    data: threadsData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useThreads(shouldPollMessages)

  // Flatten pages to get all threads
  const threads = useMemo(() => {
    if (!threadsData?.pages) return []
    return threadsData.pages.flatMap((page) => page.threads)
  }, [threadsData])

  // If initialThreadId is provided and we don't have an active thread, find it
  useMemo(() => {
    if (initialThreadId && !activeThread && threads.length > 0) {
      const thread = threads.find((t) => t.id === initialThreadId)
      if (thread) {
        setActiveThread(thread)
      }
    }
  }, [initialThreadId, activeThread, threads])

  const handleSelectThread = useCallback((thread: Thread) => {
    setActiveThread(thread)
  }, [])

  const handleBack = useCallback(() => {
    setActiveThread(null)
  }, [])

  const handleClose = useCallback(() => {
    onOpenChange(false)
    // Reset active thread when closing
    setTimeout(() => setActiveThread(null), 300)
  }, [onOpenChange])

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showClose={false}
        className={cn(
          'p-0 flex flex-col w-full sm:max-w-md',
          // Full height on mobile
          'h-full'
        )}
      >
        {activeThread ? (
          <ConversationView
            thread={activeThread}
            onBack={handleBack}
            onClose={handleClose}
          />
        ) : (
          <>
            {/* Header */}
            <SheetHeader className="px-4 py-3 border-b flex-shrink-0">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-lg font-semibold">Messages</SheetTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    onClick={handleClose}
                  >
                    <Link to="/settings/account/messaging" aria-label="Message settings">
                      <Icon name="gear" variant="regular" className="text-sm" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    aria-label="Close messages"
                  >
                    <Icon name="xmark" className="text-sm" />
                  </Button>
                </div>
              </div>
            </SheetHeader>

            {/* Thread list */}
            <div className="flex-1 overflow-y-auto">
              <ThreadList
                threads={threads}
                activeThreadId={null}
                onSelectThread={handleSelectThread}
                hasMore={!!hasNextPage}
                isLoading={isLoading}
                isFetchingMore={isFetchingNextPage}
                onLoadMore={handleLoadMore}
              />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
