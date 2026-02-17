/**
 * MessageBubble Component
 * Individual message display with sender alignment
 */

import { cn } from '@/lib/utils'
import type { Message } from '@/hooks/useMessages'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  showSeen?: boolean
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))
}

export function MessageBubble({ message, isOwn, showSeen = false }: MessageBubbleProps) {
  if (message.isDeleted) {
    return (
      <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
        <div
          className={cn(
            'max-w-[75%] px-3 py-2 rounded-2xl',
            'bg-muted/50 text-muted-foreground italic text-sm'
          )}
        >
          This message was deleted
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[75%] px-3 py-2 rounded-2xl',
          isOwn
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted rounded-bl-sm'
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
      </div>
      <div className="flex items-center gap-1 mt-0.5 px-1">
        <span className="text-[10px] text-muted-foreground">
          {formatTime(message.createdAt)}
        </span>
        {isOwn && showSeen && (
          <span className="text-[10px] text-muted-foreground">
            · Seen
          </span>
        )}
      </div>
    </div>
  )
}
