/**
 * ThreadList Component
 * List of conversations with infinite scroll
 */

import { useEffect, useRef, useCallback } from 'react'
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
    <div className="flex flex-col p-1">
      {threads.map((thread) => (
        <ThreadItem
          key={thread.id}
          thread={thread}
          isActive={thread.id === activeThreadId}
          onClick={() => onSelectThread(thread)}
        />
      ))}

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
