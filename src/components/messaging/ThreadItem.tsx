/**
 * ThreadItem Component
 * Single thread row in the thread list
 */

import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'
import { NotificationBadge } from '@/components/ui/notification-badge'
import type { Thread } from '@/hooks/useMessages'

interface ThreadItemProps {
  thread: Thread
  isActive?: boolean
  onClick: () => void
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return ''

  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(d)
}

export function ThreadItem({ thread, isActive = false, onClick }: ThreadItemProps) {
  const { otherUser, lastMessagePreview, lastMessageAt, hasUnread, isBlocked, isBlockedBy } = thread

  const displayName = otherUser.displayName || otherUser.usernameSlug || 'Unknown'
  const avatarUrl = otherUser.avatarUrl

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 text-left transition-colors',
        'hover:bg-accent/50 rounded-lg',
        isActive && 'bg-accent',
        (isBlocked || isBlockedBy) && 'opacity-60'
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-muted overflow-hidden">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Icon name="user" className="text-lg" />
            </div>
          )}
        </div>
        {/* Unread indicator */}
        {hasUnread && (
          <NotificationBadge variant="destructive" size="dot" className="absolute -top-0.5 -right-0.5" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('text-sm truncate', hasUnread ? 'font-semibold' : 'font-medium')}>
            {displayName}
          </span>
          {lastMessageAt && (
            <span className="text-xs text-muted-foreground flex-shrink-0 pr-1">
              {formatRelativeTime(lastMessageAt)}
            </span>
          )}
        </div>
        <p
          className={cn(
            'text-sm truncate mt-0.5',
            hasUnread ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {isBlocked ? (
            <span className="italic">You blocked this user</span>
          ) : isBlockedBy ? (
            <span className="italic">You were blocked</span>
          ) : (
            lastMessagePreview || 'No messages yet'
          )}
        </p>
      </div>
    </button>
  )
}
