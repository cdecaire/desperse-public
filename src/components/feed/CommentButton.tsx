/**
 * CommentButton Component
 * Shows comment icon and count for feed view
 * Links to post detail page where full comments are shown
 */

import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'
import { useCommentCount } from '@/hooks/useComments'
import { useAuth } from '@/hooks/useAuth'

interface CommentButtonProps {
  /** The post ID */
  postId: string
  /** Additional class names */
  className?: string
  /** Variant for styling */
  variant?: 'default' | 'ghost' | 'outline'
  /** Show count inline or separate */
  showCount?: boolean
}

export function CommentButton({
  postId,
  className,
  variant = 'ghost',
  showCount = true,
}: CommentButtonProps) {
  const { data: commentCount, isLoading } = useCommentCount(postId)
  const { isAuthenticated, isReady } = useAuth()

  // For unauthenticated users, show disabled button
  if (isReady && !isAuthenticated) {
    return (
      <Button
        variant={variant}
        className={cn('gap-1 px-2', className)}
        disabled
      >
        <Icon name="comment" variant="regular" className="text-base" />
        {showCount && commentCount !== undefined && commentCount > 0 && (
          <span className="text-sm font-medium">{commentCount}</span>
        )}
        {isLoading && commentCount === undefined && (
          <span className="text-sm font-medium">-</span>
        )}
      </Button>
    )
  }

  return (
    <Link
      to="/post/$postId"
      params={{ postId }}
      className={cn('inline-flex items-center gap-2 no-hover-bg', className)}
    >
      <Button
        variant={variant}
        className="gap-1 px-2"
      >
        <Icon name="comment" variant="regular" className="text-base" />
        {showCount && commentCount !== undefined && commentCount > 0 && (
          <span className="text-sm font-medium">{commentCount}</span>
        )}
        {isLoading && commentCount === undefined && (
          <span className="text-sm font-medium">-</span>
        )}
      </Button>
    </Link>
  )
}

