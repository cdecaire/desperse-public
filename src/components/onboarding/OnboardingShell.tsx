import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { UploadedMedia } from '@/components/forms/MediaUpload'
import { FirstPostStep } from './FirstPostStep'
import { OnboardingPreview, type PostDraft, type ProfileDraft } from './OnboardingPreview'
import { ProfileSetupStep } from './ProfileSetupStep'

export type OnboardingStage = 'profile' | 'firstPost' | 'summary'

const STAGE_ORDER: OnboardingStage[] = ['profile', 'firstPost', 'summary']

export interface OnboardingStep {
  id: OnboardingStage
  title: string
  description: string
  status: 'current' | 'upcoming' | 'complete'
}

interface OnboardingShellProps {
  isLoading?: boolean
  /** Whether the required profile fields (name + avatar) are already done. */
  isComplete?: boolean
  /**
   * Dev-preview mode: force-start at the profile stage, seed sample content, and
   * stub every write so the whole flow is walkable without touching an account.
   */
  previewMode?: boolean
}


export function getOnboardingSteps(stage: OnboardingStage = 'profile'): OnboardingStep[] {
  const currentIndex = STAGE_ORDER.indexOf(stage)
  const statusFor = (index: number): OnboardingStep['status'] =>
    index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming'

  return [
    {
      id: 'profile',
      title: 'Make it yours',
      description: 'Choose the name and photo people will know you by.',
      status: statusFor(0),
    },
    {
      id: 'firstPost',
      title: 'Make your first drop',
      description: 'Add a piece people can collect. Keep it simple.',
      status: statusFor(1),
    },
    {
      id: 'summary',
      title: 'Share',
      description: 'Share your profile so people can follow and collect from you.',
      status: statusFor(2),
    },
  ]
}

/** Compact horizontal progress indicator — replaces a 3-up card grid that was
 * all visual weight and no information at this width. Completed steps are
 * clickable so users can step back. Each step is an equal-width flex column;
 * the connecting line for step N spans from step N-1's circle center to its
 * own circle center. Circles are pinned to each column's left edge (16px in,
 * half the 32px circle), not centered in the column, so the line runs from
 * calc(-100% + 16px) — the previous column's circle center — with width:100%
 * so it lands exactly on this column's own circle center. Titles hide on
 * mobile (the current step's title renders below the row instead). */
export function Stepper({
  steps,
  onStepClick,
}: {
  steps: OnboardingStep[]
  onStepClick?: (step: OnboardingStep) => void
}) {
  return (
    <div className="flex items-start">
      {steps.map((step, index) => {
        const clickable = step.status !== 'upcoming' && Boolean(onStepClick)
        return (
          <div key={step.id} className="relative min-w-0 flex-1">
            {index > 0 ? <div className="absolute left-[calc(-100%_+_16px)] top-4 z-0 h-px w-full bg-border" aria-hidden /> : null}
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onStepClick?.(step)}
              className={cn(
                'group relative z-10 flex flex-col items-start gap-2 rounded-md pr-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
                clickable ? 'cursor-pointer' : 'cursor-default',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-label-lg transition-transform duration-150 ease-out',
                  step.status === 'complete' && 'bg-(--tone-standard) text-(--tone-standard-foreground)',
                  step.status === 'current' && 'bg-foreground text-background',
                  step.status === 'upcoming' && 'bg-muted text-muted-foreground',
                  clickable && 'group-hover:scale-105 motion-reduce:group-hover:scale-100',
                )}
              >
                {step.status === 'complete' ? <Icon name="check" variant="solid" className="text-xs" /> : index + 1}
              </span>
              <p
                className={cn(
                  'hidden text-label-md sm:block',
                  step.status === 'upcoming' && 'text-muted-foreground',
                  clickable && 'underline-offset-4 group-hover:underline',
                )}
              >
                {step.title}
              </p>
            </button>
          </div>
        )
      })}
    </div>
  )
}

export function OnboardingShell({
  isLoading = false,
  isComplete = false,
  previewMode = false,
}: OnboardingShellProps) {
  const { user } = useCurrentUser()
  // Initializer only — no isComplete re-sync effect. The route gates on
  // isLoading, so isComplete is settled by first render; re-syncing on later
  // refetches would yank the user out of whatever stage they navigated to.
  // Preview always starts at profile so all three stages are reachable.
  const [stage, setStage] = useState<OnboardingStage>(
    previewMode ? 'profile' : isComplete ? 'firstPost' : 'profile',
  )
  const [profileDraft, setProfileDraft] = useState<ProfileDraft | null>(null)
  // Post state lives at the flow level (not inside FirstPostStep) so navigating
  // back from Share never drops the picked image or caption.
  const [postMedia, setPostMedia] = useState<UploadedMedia | null>(null)
  const [postCaption, setPostCaption] = useState('')
  const [publishedPostId, setPublishedPostId] = useState<string | null>(null)
  const [canNativeShare, setCanNativeShare] = useState(false)

  const postDraft: PostDraft | null = postMedia ? { mediaUrl: postMedia.url, caption: postCaption } : null

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && 'share' in navigator)
  }, [])

  // Contained header per stage: a "01 / 03" counter plus a title + subtitle that
  // live inside the panel card rather than floating above it.
  const stepIndex = STAGE_ORDER.indexOf(stage)
  const counter = `${String(stepIndex + 1).padStart(2, '0')} / ${String(STAGE_ORDER.length).padStart(2, '0')}`
  const header =
    stage === 'summary'
      ? {
          title: publishedPostId ? 'Your first collectible is live' : "You're ready to create",
          description: publishedPostId
            ? 'Share it with your people and invite them to collect.'
            : 'Share your profile, or explore what other creators are making.',
        }
      : stage === 'firstPost'
        ? { title: 'Make your first drop', description: 'Add a piece people can collect. Keep it simple.' }
        : { title: 'Make it yours', description: 'Choose the name and photo people will know you by.' }

  // Fall back to the saved user for anything the drafts haven't touched yet.
  const previewProfile: ProfileDraft | null = profileDraft ?? (user
    ? { displayName: user.displayName ?? '', bio: user.bio ?? '', link: user.link ?? '', avatarUrl: user.avatarUrl ?? '', usernameSlug: user.usernameSlug ?? '' }
    : null)

  const inviteLink = user?.usernameSlug
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://desperse.com'}/i/${user.usernameSlug}`
    : null

  const handleCopyLink = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      toast.success('Invite link copied')
    } catch {
      toast.error('Could not copy the link.')
    }
  }

  const shareText = publishedPostId
    ? 'I just shared my first collectible on Desperse.'
    : 'Join me on Desperse.'
  // When a post exists, share the invite link deep-linked to the art: the
  // redirect captures referral attribution, then lands (and unfurls) on the post.
  const shareUrl = inviteLink && publishedPostId
    ? `${inviteLink}?next=${encodeURIComponent(`/post/${publishedPostId}`)}`
    : inviteLink
  const xShareUrl = shareUrl
    ? `https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
    : null

  const handleNativeShare = async () => {
    if (!shareUrl) return
    try {
      await navigator.share({
        title: previewProfile?.displayName ? `${previewProfile.displayName} on Desperse` : 'Join me on Desperse',
        text: shareText,
        url: shareUrl,
      })
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  }

  return (
    <div className="w-full lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
      {/* Left: the flow panel — counter, title, and step body all contained. */}
      <Card className="overflow-hidden">
        <CardContent className="space-y-7 p-6 sm:p-8">
          <header className="space-y-3">
            <p className="text-label-sm font-medium tabular-nums text-muted-foreground">{counter}</p>
            <div className="space-y-1.5">
              <h2 className="text-balance text-heading-2">{header.title}</h2>
              <p className="max-w-prose text-pretty text-body-md text-muted-foreground">{header.description}</p>
            </div>
          </header>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          ) : (
            <div key={stage} className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200 motion-reduce:animate-none">
              {stage === 'profile' ? (
                <ProfileSetupStep onSuccess={() => setStage('firstPost')} onDraftChange={setProfileDraft} preview={previewMode} />
              ) : null}

              {stage === 'firstPost' ? (
                <FirstPostStep
                  onPublished={(post) => {
                    setPublishedPostId(post?.id ?? null)
                    setStage('summary')
                  }}
                  onSkip={() => setStage('summary')}
                  onBack={() => setStage('profile')}
                  media={postMedia}
                  onMediaChange={setPostMedia}
                  caption={postCaption}
                  onCaptionChange={setPostCaption}
                  preview={previewMode}
                />
              ) : null}

              {stage === 'summary' ? (
                <div className="space-y-6">
                  {/* The share card is the payoff — surface it inline on mobile
                      where the preview column doesn't exist. */}
                  <OnboardingPreview profile={previewProfile} post={postDraft} showPostPlaceholder={false} className="lg:hidden" />

                  <div className="flex flex-col gap-3">
                    <Button type="button" size="cta" className="w-full" onClick={handleCopyLink} disabled={!inviteLink}>
                      <Icon name="link-simple" variant="regular" className="mr-2 text-sm" />
                      Copy invite link
                    </Button>
                    <div className="flex flex-wrap items-center gap-2">
                      {xShareUrl ? (
                        <Button asChild variant="outline" className="flex-1">
                          <a href={xShareUrl} target="_blank" rel="noopener noreferrer">
                            <Icon name="x-twitter" variant="brands" className="mr-2 text-sm" />
                            Share on X
                          </a>
                        </Button>
                      ) : null}
                      {canNativeShare ? (
                        <Button type="button" variant="outline" className="flex-1" onClick={handleNativeShare} disabled={!inviteLink}>
                          <Icon name="share-nodes" variant="regular" className="mr-2 text-sm" />
                          Share
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <ul className="space-y-2.5 border-t border-border pt-5 text-body-sm text-muted-foreground">
                    <li className="flex items-center gap-3">
                      <Icon name="sparkles" variant="regular" className="shrink-0 text-foreground" />
                      <span>Sell limited editions and priced drops from the composer.</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Icon name="users" variant="regular" className="shrink-0 text-foreground" />
                      <span>Follow creators in Explore to build your feed.</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Icon name="wallet" variant="regular" className="shrink-0 text-foreground" />
                      <span>Manage your wallet and settings anytime.</span>
                    </li>
                  </ul>

                  <div className="flex items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      className="px-0 text-body-sm text-muted-foreground hover:bg-transparent"
                      onClick={() => setStage('firstPost')}
                    >
                      <Icon name="arrow-left" variant="regular" className="mr-1.5 text-xs" />
                      Back
                    </Button>
                    <Button asChild size="cta">
                      <Link to="/">Explore Desperse</Link>
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Right: live preview — desktop only; the payoff card renders inline on mobile summary. */}
      <div className="mt-6 hidden lg:sticky lg:top-24 lg:mt-0 lg:block">
        <OnboardingPreview profile={previewProfile} post={postDraft} showPostPlaceholder={stage !== 'summary'} />
      </div>
    </div>
  )
}

export default OnboardingShell
