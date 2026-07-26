import { UserAvatar } from '@/components/shared/UserAvatar'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

export interface ProfileDraft {
  displayName: string
  bio: string
  link: string
  avatarUrl: string
  usernameSlug: string
}

export interface PostDraft {
  mediaUrl: string
  caption: string
}

interface OnboardingPreviewProps {
  profile: ProfileDraft | null
  post: PostDraft | null
  /** Hide the dashed "your first post" placeholder — e.g. on the summary step
   * after the user skipped posting, where an empty slot reads as unfinished. */
  showPostPlaceholder?: boolean
  className?: string
}

/**
 * Live "build" preview — mirrors the real feed post card (avatar-left header,
 * media, engagement row, caption) so what the user builds looks like what ships.
 * Before a post exists it reads as a profile card (name + bio); once artwork is
 * added it becomes the collectible post card and doubles as the share card.
 */
export function OnboardingPreview({ profile, post, showPostPlaceholder = true, className }: OnboardingPreviewProps) {
  const name = profile?.displayName?.trim()
  const slug = profile?.usernameSlug?.trim()
  const bio = profile?.bio?.trim()
  const hasImage = Boolean(post?.mediaUrl)

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-card', className)}>
      {/* Header — matches the feed card: avatar left, name + @handle to the right. */}
      <div className="flex items-center gap-3 p-4 pb-3">
        <UserAvatar src={profile?.avatarUrl || null} alt={name || ''} size="md" />
        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-sm font-semibold', !name && 'text-muted-foreground/60')}>
            {name || 'Your name'}
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="truncate">@{slug || 'username'}</span>
            {hasImage ? (
              <>
                <span>·</span>
                <span>now</span>
                <span>·</span>
                <span className="flex items-center gap-1 text-(--tone-collectible)">
                  <Icon name="gem" variant="solid" className="text-[10px]" />
                  Collectible
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Bio — profile-building state only (before a post exists). */}
      {bio && !hasImage ? (
        <p className="px-4 pb-3 text-sm text-muted-foreground">{bio}</p>
      ) : null}

      {/* Media */}
      {hasImage ? (
        <img src={post!.mediaUrl} alt={post?.caption || 'First post'} className="aspect-square w-full object-cover" />
      ) : showPostPlaceholder ? (
        <div className="mx-4 mb-4 flex aspect-square items-center justify-center rounded-lg border border-dashed border-border">
          <p className="flex items-center gap-2 text-body-sm text-muted-foreground/60">
            <Icon name="image" variant="regular" />
            Your first post
          </p>
        </div>
      ) : null}

      {/* Engagement row + caption — post state. Icons are illustrative (non-interactive). */}
      {hasImage ? (
        <div className="space-y-2 px-4 py-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <div className="flex items-center gap-4">
              <Icon name="heart" variant="solid" className="text-base text-red-500" />
              <Icon name="comment" variant="regular" className="text-base" />
            </div>
            <Icon name="gem" variant="solid" className="text-base text-(--tone-collectible)" />
          </div>
          {post?.caption?.trim() ? (
            <p className="text-sm leading-relaxed text-foreground">
              <span className="mr-2 font-semibold">{name || slug || 'You'}</span>
              <span className="text-foreground/90">{post.caption}</span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default OnboardingPreview
