import { UserAvatar } from '@/components/shared/UserAvatar'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

export interface ProfileDraft {
  displayName: string
  bio: string
  link: string
  avatarUrl: string
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

function displayDomain(link: string): string {
  try {
    return new URL(link.match(/^https?:\/\//i) ? link : `https://${link}`).hostname.replace(/^www\./, '')
  } catch {
    return link
  }
}

/**
 * Live "build" preview — a compact profile-plus-first-post card that fills in
 * as the user completes onboarding, and doubles as the share card at the end.
 */
export function OnboardingPreview({ profile, post, showPostPlaceholder = true, className }: OnboardingPreviewProps) {
  const name = profile?.displayName?.trim()
  const bio = profile?.bio?.trim()
  const link = profile?.link?.trim()

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-card', className)}>
      <div className="space-y-3 p-5">
        <UserAvatar src={profile?.avatarUrl || null} alt={name || ''} size="lg" />
        <div className="space-y-1">
          <p className={cn('text-title-lg', !name && 'text-muted-foreground/60')}>{name || 'Your name'}</p>
          <p className={cn('text-body-sm', bio ? 'text-muted-foreground' : 'text-muted-foreground/60')}>
            {bio || 'Your bio appears here'}
          </p>
          {link ? (
            <p className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
              <Icon name="link-simple" variant="regular" className="text-xs" />
              {displayDomain(link)}
            </p>
          ) : null}
        </div>
      </div>

      {post?.mediaUrl ? (
        <div>
          <img src={post.mediaUrl} alt={post.caption || 'First post'} className="aspect-square w-full object-cover" />
          {post.caption?.trim() ? (
            <p className="line-clamp-2 px-5 py-3 text-body-sm text-muted-foreground">{post.caption}</p>
          ) : null}
        </div>
      ) : showPostPlaceholder ? (
        <div className="mx-5 mb-5 flex aspect-[2/1] items-center justify-center rounded-lg border border-dashed border-border">
          <p className="flex items-center gap-2 text-body-sm text-muted-foreground/60">
            <Icon name="image" variant="regular" />
            Your first post
          </p>
        </div>
      ) : null}
    </div>
  )
}

export default OnboardingPreview
