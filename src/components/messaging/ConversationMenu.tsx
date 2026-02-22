/**
 * ConversationMenu Component
 * 3-dot menu for conversation actions (Block, Report, Go to profile)
 */

import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ConversationMenuProps {
  otherUser: {
    id: string
    usernameSlug: string | null
    displayName: string | null
  }
  isBlocked: boolean
  isBlockPending: boolean
  onBlock: () => void
  onReport: () => void
  onClose?: () => void
  className?: string
}

export function ConversationMenu({
  otherUser,
  isBlocked,
  isBlockPending,
  onBlock,
  onReport,
  onClose,
  className,
}: ConversationMenuProps) {
  const profilePath = otherUser.usernameSlug ? `/profile/${otherUser.usernameSlug}` : null

  // Custom item styles matching existing design
  const itemClassName = "flex items-center gap-3 px-4 py-3 text-sm text-foreground rounded-lg cursor-pointer"

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-accent",
            className
          )}
          aria-label="Conversation options"
        >
          <Icon name="ellipsis-vertical" className="text-sm" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Go to profile */}
        {profilePath && (
          <DropdownMenuItem asChild className={itemClassName} onClick={onClose}>
            <Link to={profilePath}>
              <Icon name="user" variant="regular" className="w-5 text-center" />
              <span>Go to profile</span>
            </Link>
          </DropdownMenuItem>
        )}

        {/* Block/Unblock */}
        <DropdownMenuItem
          onClick={onBlock}
          disabled={isBlockPending}
          className={cn(itemClassName, "text-destructive hover:bg-destructive/10")}
        >
          {isBlockPending ? (
            <>
              <LoadingSpinner size="sm" className="w-5" />
              <span>{isBlocked ? 'Unblocking...' : 'Blocking...'}</span>
            </>
          ) : (
            <>
              <Icon
                name="user-slash"
                variant={isBlocked ? "solid" : "regular"}
                className="w-5 text-center"
              />
              <span>{isBlocked ? 'Unblock messages' : 'Block messages'}</span>
            </>
          )}
        </DropdownMenuItem>

        {/* Report */}
        <DropdownMenuItem
          onClick={onReport}
          className={cn(itemClassName, "text-destructive hover:bg-destructive/10")}
        >
          <Icon name="flag" variant="regular" className="w-5 text-center" />
          <span>Report user</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
