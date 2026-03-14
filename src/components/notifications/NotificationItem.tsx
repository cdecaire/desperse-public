/**
 * NotificationItem component
 * Displays a single notification with actor info, action text, and optional reference
 */

import { Link, useNavigate } from '@tanstack/react-router'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import { OptimizedImage } from '@/components/shared/OptimizedImage'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { detectMediaType } from '@/lib/media'
import { formatRelativeTime } from '@/lib/dates'

// Types defined locally to avoid importing from server functions
export type NotificationType = 'follow' | 'like' | 'comment' | 'collect' | 'purchase' | 'mention'
export type NotificationReferenceType = 'post' | 'comment'

export interface NotificationWithActor {
  id: string
  type: NotificationType
  referenceType: NotificationReferenceType | null
  referenceId: string | null
  isRead: boolean
  createdAt: Date
  actor: {
    id: string
    displayName: string | null
    usernameSlug: string
    avatarUrl: string | null
  }
  reference?: {
    mediaUrl?: string
    coverUrl?: string | null
    caption?: string | null
    content?: string
    postId?: string
  }
}

interface NotificationItemProps {
  notification: NotificationWithActor
}

// Get notification text based on type
function getNotificationText(type: NotificationType, referenceType?: NotificationReferenceType | null): string {
  switch (type) {
    case 'follow':
      return 'started following you'
    case 'like':
      return 'liked your post'
    case 'comment':
      return 'commented on your post'
    case 'collect':
      return 'collected your post'
    case 'purchase':
      return 'bought your edition'
    case 'mention':
      return referenceType === 'comment'
        ? 'mentioned you in a comment'
        : 'mentioned you in a post'
    default:
      return 'interacted with you'
  }
}

// Get link destination based on notification type
type NotificationLinkInfo =
  | { to: '/profile/$slug'; params: { slug: string } }
  | { to: '/post/$postId'; params: { postId: string } }

function getNotificationLink(notification: NotificationWithActor): NotificationLinkInfo {
  const { type, referenceType, referenceId, reference, actor } = notification

  switch (type) {
    case 'follow':
      return { to: '/profile/$slug', params: { slug: actor.usernameSlug } }
    case 'like':
    case 'collect':
    case 'purchase':
      return referenceId
        ? { to: '/post/$postId', params: { postId: referenceId } }
        : { to: '/profile/$slug', params: { slug: actor.usernameSlug } }
    case 'comment':
      if (reference?.postId) {
        return { to: '/post/$postId', params: { postId: reference.postId } }
      }
      return referenceId
        ? { to: '/post/$postId', params: { postId: referenceId } }
        : { to: '/profile/$slug', params: { slug: actor.usernameSlug } }
    case 'mention':
      // For mentions, link to the post (or post containing the comment)
      if (referenceType === 'comment' && reference?.postId) {
        return { to: '/post/$postId', params: { postId: reference.postId } }
      }
      return referenceId
        ? { to: '/post/$postId', params: { postId: referenceId } }
        : { to: '/profile/$slug', params: { slug: actor.usernameSlug } }
    default:
      return { to: '/profile/$slug', params: { slug: actor.usernameSlug } }
  }
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const { actor, type, referenceType, isRead, createdAt, reference } = notification
  const navigate = useNavigate()

  const linkInfo = getNotificationLink(notification)
  const actionText = getNotificationText(type, referenceType)

  // Determine thumbnail URL
  const thumbnailUrl = reference?.coverUrl || reference?.mediaUrl
  const mediaType = thumbnailUrl ? detectMediaType(thumbnailUrl) : null

  const handleContainerClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on a link inside
    if ((e.target as HTMLElement).closest('a')) {
      return
    }

    // Navigate to the notification destination
    navigate({ to: linkInfo.to, params: linkInfo.params })
  }

  return (
    <div
      onClick={handleContainerClick}
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer',
        isRead
          ? 'border border-border/60 bg-card dark:bg-transparent hover:bg-accent'
          : 'bg-accent/50 hover:bg-accent'
      )}
    >
      {/* Actor avatar */}
      <Link
        to="/profile/$slug"
        params={{ slug: actor.usernameSlug }}
        className="shrink-0"
      >
        <UserAvatar src={actor.avatarUrl} alt={actor.displayName || actor.usernameSlug} size="md" />
      </Link>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <Link
            to="/profile/$slug"
            params={{ slug: actor.usernameSlug }}
            className="font-semibold hover:underline"
          >
            {actor.displayName || actor.usernameSlug}
          </Link>{' '}
          <span className="text-muted-foreground">{actionText}</span>
        </p>

        {/* Comment preview */}
        {type === 'comment' && reference?.content && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
            "{reference.content}"
          </p>
        )}

        {/* Mention preview - show the content where you were mentioned */}
        {type === 'mention' && reference?.content && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
            "{reference.content}"
          </p>
        )}
        {type === 'mention' && !reference?.content && reference?.caption && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
            "{reference.caption}"
          </p>
        )}

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatRelativeTime(createdAt)}
        </p>
      </div>

      {/* Post thumbnail (for post-related notifications) */}
      {thumbnailUrl && type !== 'follow' && (
        <div className="shrink-0 w-12 h-12 rounded overflow-hidden bg-muted">
          {mediaType === 'video' ? (
            <video
              src={thumbnailUrl}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
          ) : mediaType === 'audio' || mediaType === 'document' || mediaType === '3d' ? (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Icon
                name={mediaType === 'audio' ? 'music' : mediaType === 'document' ? 'file' : 'cube'}
                className="text-muted-foreground"
              />
            </div>
          ) : (
            <OptimizedImage
              src={thumbnailUrl}
              alt=""
              className="w-full h-full"
              width={320}
              fadeIn={false}
            />
          )}
        </div>
      )}

    </div>
  )
}
