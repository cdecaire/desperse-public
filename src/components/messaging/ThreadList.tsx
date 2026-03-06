/**
 * ThreadList Component
 * List of conversations with virtualized infinite scroll
 */

import { useEffect, useRef, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ThreadItem } from './ThreadItem'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Icon } from '@/components/ui/icon'
import type { Thread } from '@/hooks/useMessages'

interface ThreadListProps {
  threads: Thread[]
  activeThreadId: string | null
  onSelectThread: (thread: Thread) => void
  hasMore: boolean
  isLoading: boolean
  isFetchingMore: boolean
  onLoadMore: () => void
}

export function ThreadList({
  threads,
  activeThreadId,
  onSelectThread,
  hasMore,
  isLoading,
  isFetchingMore,
  onLoadMore,
}: ThreadListProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<HTMLDivElement>(null)

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      if (entry.isIntersecting && hasMore && !isFetchingMore) {
        onLoadMore()
      }
    },
    [hasMore, isFetchingMore, onLoadMore]
  )

  useEffect(() => {
    const element = observerRef.current
    if (!element) return

    const observer = new IntersectionObserver(handleObserver, {
      rootMargin: '100px',
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [handleObserver])

  const virtualizer = useVirtualizer({
    count: threads.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 3,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Icon name="message" variant="regular" className="text-2xl text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No conversations yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Start a conversation from someone's profile
        </p>
      </div>
    )
  }

  return (
    <div ref={parentRef} className="flex flex-col p-1 overflow-y-auto" role="list" aria-label="Conversations" style={{ height: '100%' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const thread = threads[virtualItem.index]
          return (
            <div
              key={thread.id}
              ref={virtualizer.measureElement}
              data-index={virtualItem.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <ThreadItem
                thread={thread}
                isActive={thread.id === activeThreadId}
                onClick={() => onSelectThread(thread)}
              />
            </div>
          )
        })}
      </div>

      {/* Load more trigger */}
      <div ref={observerRef} className="h-1" />

      {isFetchingMore && (
        <div className="flex items-center justify-center py-4">
          <LoadingSpinner className="w-5 h-5" />
        </div>
      )}
    </div>
  )
}
