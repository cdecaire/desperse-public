/**
 * NotificationItem component
 * Displays a single notification with actor info, action text, and optional reference
 */

import { Link, useNavigate } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { OptimizedImage } from '@/components/shared/OptimizedImage'

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

// Format relative time
function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const then = new Date(date)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (seconds < 60) return 'now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w`

  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

// Detect media type from URL
function detectMediaType(url: string): 'image' | 'video' | 'audio' | 'document' | '3d' {
  const extension = url.split('.').pop()?.toLowerCase()?.split('?')[0]

  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(extension || '')) {
    return 'image'
  }
  if (['mp4', 'webm', 'mov'].includes(extension || '')) {
    return 'video'
  }
  if (['mp3', 'wav', 'ogg', 'aac'].includes(extension || '')) {
    return 'audio'
  }
  if (['pdf', 'zip'].includes(extension || '')) {
    return 'document'
  }
  if (['glb', 'gltf'].includes(extension || '')) {
    return '3d'
  }

  return 'image'
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
        {actor.avatarUrl ? (
          <OptimizedImage
            src={actor.avatarUrl}
            alt={actor.displayName || actor.usernameSlug}
            className="w-10 h-10 rounded-full"
            width={320}
            fadeIn={false}
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <i className="fa-solid fa-user text-muted-foreground" />
          </div>
        )}
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
              <i
                className={cn(
                  'text-muted-foreground',
                  mediaType === 'audio' && 'fa-solid fa-music',
                  mediaType === 'document' && 'fa-solid fa-file',
                  mediaType === '3d' && 'fa-solid fa-cube'
                )}
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
