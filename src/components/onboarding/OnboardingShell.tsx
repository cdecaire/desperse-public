import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { toast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/hooks/useCurrentUser'
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
}

export function getOnboardingSteps(stage: OnboardingStage = 'profile'): OnboardingStep[] {
  const currentIndex = STAGE_ORDER.indexOf(stage)
  const statusFor = (index: number): OnboardingStep['status'] =>
    index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming'

  return [
    {
      id: 'profile',
      title: 'Set up your profile',
      description: 'Add the identity details people need before they follow or collect from you.',
      status: statusFor(0),
    },
    {
      id: 'firstPost',
      title: 'Create your first collectible',
      description: 'One image and a caption. It publishes as a free collectible fans can mint.',
      status: statusFor(1),
    },
    {
      id: 'summary',
      title: 'Tell the world',
      description: 'Share your new profile — anyone who joins through your link is credited to you.',
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
function Stepper({
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
}: OnboardingShellProps) {
  const { user } = useCurrentUser()
  // Initializer only — no isComplete re-sync effect. The route gates on
  // isLoading, so isComplete is settled by first render; re-syncing on later
  // refetches would yank the user out of whatever stage they navigated to.
  const [stage, setStage] = useState<OnboardingStage>(isComplete ? 'firstPost' : 'profile')
  const [profileDraft, setProfileDraft] = useState<ProfileDraft | null>(null)
  const [postDraft, setPostDraft] = useState<PostDraft | null>(null)
  const [publishedPostId, setPublishedPostId] = useState<string | null>(null)
  const [canNativeShare, setCanNativeShare] = useState(false)

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && 'share' in navigator)
  }, [])

  const steps = getOnboardingSteps(stage)
  const currentStep = steps.find((step) => step.status === 'current')

  // Fall back to the saved user for anything the drafts haven't touched yet.
  const previewProfile: ProfileDraft | null = profileDraft ?? (user
    ? { displayName: user.displayName ?? '', bio: user.bio ?? '', link: user.link ?? '', avatarUrl: user.avatarUrl ?? '' }
    : null)

  const inviteLink = user?.usernameSlug
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://desperse.com'}/i/${user.usernameSlug}`
    : null

  const handleStepClick = (step: OnboardingStep) => {
    if (step.status === 'upcoming') return
    setStage(step.id)
  }

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
    ? 'My first collectible is live on Desperse — free to collect.'
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
    <div className="flex w-full flex-col gap-6">
        <div className="space-y-2">
          <Badge variant="outline">First-run setup</Badge>
          <h1 className="text-heading-2">Get set up on Desperse</h1>
        </div>

        {isLoading ? (
          <>
            <div className="flex items-start">
              <div className="flex-1"><Skeleton className="h-8 w-8 rounded-full" /></div>
              <div className="flex-1"><Skeleton className="h-8 w-8 rounded-full" /></div>
              <div className="flex-1"><Skeleton className="h-8 w-8 rounded-full" /></div>
            </div>
            <Card>
              <CardContent className="space-y-4 pt-6">
                <Skeleton className="h-16 w-16 rounded-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="space-y-4">
            <Stepper steps={steps} onStepClick={handleStepClick} />
            {currentStep ? (
              <div className="space-y-1">
                <p className="text-label-lg sm:hidden">{currentStep.title}</p>
                <p className="text-body-sm text-muted-foreground">{currentStep.description}</p>
              </div>
            ) : null}
          </div>
        )}

        {!isLoading ? (
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
            <div key={stage} className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200 motion-reduce:animate-none">
              {stage === 'profile' ? (
                <ProfileSetupStep onSuccess={() => setStage('firstPost')} onDraftChange={setProfileDraft} />
              ) : null}

              {stage === 'firstPost' ? (
                <FirstPostStep
                  onPublished={(post) => {
                    setPublishedPostId(post?.id ?? null)
                    setStage('summary')
                  }}
                  onSkip={() => setStage('summary')}
                  onBack={() => setStage('profile')}
                  onDraftChange={setPostDraft}
                />
              ) : null}

              {stage === 'summary' ? (
                <div className="space-y-6">
                  {/* The share card is the payoff — surface it inline on mobile
                      where the preview column doesn't exist. */}
                  <OnboardingPreview profile={previewProfile} post={postDraft} showPostPlaceholder={false} className="lg:hidden" />

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-title-lg">
                        {publishedPostId ? 'Your first collectible is live' : "You're set up"}
                      </CardTitle>
                      <CardDescription className="text-body-sm">
                        {publishedPostId
                          ? 'That was it — your art is now collectible on Solana. Share your profile so people can follow and mint it.'
                          : 'Share your profile link — anyone who joins through it is credited to you.'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <Button type="button" size="cta" onClick={handleCopyLink} disabled={!inviteLink}>
                          <Icon name="link-simple" variant="regular" className="mr-2 text-sm" />
                          Copy invite link
                        </Button>
                        {xShareUrl ? (
                          <Button asChild variant="outline">
                            <a href={xShareUrl} target="_blank" rel="noopener noreferrer">
                              <Icon name="x-twitter" variant="brands" className="mr-2 text-sm" />
                              Share on X
                            </a>
                          </Button>
                        ) : null}
                        {canNativeShare ? (
                          <Button type="button" variant="outline" onClick={handleNativeShare} disabled={!inviteLink}>
                            <Icon name="share-nodes" variant="regular" className="mr-2 text-sm" />
                            Share
                          </Button>
                        ) : null}
                        {publishedPostId ? (
                          <Button asChild variant="ghost" className="px-0 text-body-sm text-muted-foreground hover:bg-transparent">
                            <Link to="/post/$postId" params={{ postId: publishedPostId }}>
                              View your post
                            </Link>
                          </Button>
                        ) : null}
                      </div>

                      <ul className="space-y-3 border-t border-border pt-5 text-body-sm text-muted-foreground">
                        <li className="flex items-start gap-3">
                          <Icon name="sparkles" variant="regular" className="mt-0.5 shrink-0 text-foreground" />
                          <span>Limited editions and priced drops unlock from your post composer whenever you're ready to sell.</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <Icon name="users" variant="regular" className="mt-0.5 shrink-0 text-foreground" />
                          <span>Follow creators you like from Explore to build your feed.</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <Icon name="wallet" variant="regular" className="mt-0.5 shrink-0 text-foreground" />
                          <span>Your wallet, payouts, and notification settings live under Settings.</span>
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
                    </CardContent>
                  </Card>
                </div>
              ) : null}
            </div>

            <div className="hidden lg:sticky lg:top-24 lg:block">
              {stage !== 'summary' ? (
                <p className="mb-2 text-label-sm text-muted-foreground">Live preview</p>
              ) : null}
              <OnboardingPreview profile={previewProfile} post={postDraft} showPostPlaceholder={stage !== 'summary'} />
            </div>
          </div>
        ) : null}
    </div>
  )
}

export default OnboardingShell
