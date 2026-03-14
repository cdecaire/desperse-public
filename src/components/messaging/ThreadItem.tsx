/**
 * ThreadItem Component
 * Single thread row in the thread list
 */

import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { NotificationBadge } from '@/components/ui/notification-badge'
import type { Thread } from '@/hooks/useMessages'
import { formatRelativeTime } from '@/lib/dates'

interface ThreadItemProps {
  thread: Thread
  isActive?: boolean
  onClick: () => void
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
        <UserAvatar src={avatarUrl} alt={displayName} size="lg" />
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
