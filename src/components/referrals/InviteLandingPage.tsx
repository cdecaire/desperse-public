import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Icon } from '@/components/ui/icon'
import { Skeleton } from '@/components/ui/skeleton'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'
import { getPrimaryDisplayMedia } from '@/components/feed/postAssets'
import { getOnboardingSteps, Stepper } from '@/components/onboarding/OnboardingShell'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useFollowMutation, useFollowStats } from '@/hooks/useProfileQuery'
import { getInviteReferrerPreview, getMyReferralStatus } from '@/server/functions/referrals'

interface ReferrerPreview {
  id: string
  slug: string | null
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
}

interface SamplePost {
  id: string
  mediaUrl: string
  coverUrl: string | null
  caption: string | null
}

export interface InviteReferrerPreviewResult {
  referrer: ReferrerPreview
  samplePosts: SamplePost[]
}

interface InviteLandingPageProps {
  code: string
  referrerSlug: string | null
  invalid: boolean
  /** Preview already fetched by the route loader (for OG meta) — seeds the
   * client query so the page doesn't refetch what the server just looked up. */
  initialPreview?: InviteReferrerPreviewResult | null
}

function useInviteReferrerPreview(
  code: string,
  enabled: boolean,
  initialPreview?: InviteReferrerPreviewResult | null,
) {
  return useQuery({
    queryKey: ['invite-referrer-preview', code],
    queryFn: async (): Promise<InviteReferrerPreviewResult | null> => {
      const result = await getInviteReferrerPreview({ data: { code } } as never)
      return result.success ? { referrer: result.referrer, samplePosts: result.samplePosts } : null
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    initialData: initialPreview === undefined ? undefined : initialPreview,
  })
}

function useMyReferralStatus(
  userId: string | undefined,
  enabled: boolean,
  getAuthHeaders: () => Promise<Record<string, string>>,
) {
  return useQuery({
    // Scoped by user id — a static key would serve one account's referral
    // state to the next user who signs in from the same tab.
    queryKey: ['my-referral-status', userId],
    queryFn: async () => {
      const authHeaders = await getAuthHeaders().catch(() => null)
      const result = await getMyReferralStatus({
        data: authHeaders ? { _authorization: authHeaders.Authorization } : {},
      } as never)
      return result.success ? result.referral : null
    },
    enabled: enabled && Boolean(userId),
    staleTime: 30 * 1000,
  })
}

function SamplePostThumb({ post }: { post: SamplePost }) {
  const { coverUrl, mediaType } = getPrimaryDisplayMedia({
    mediaUrl: post.mediaUrl,
    coverUrl: post.coverUrl,
    mediaMimeType: null,
    assets: null,
  })
  const thumbSrc = mediaType === 'video' ? coverUrl : (coverUrl ?? post.mediaUrl)

  return (
    <div className="aspect-square overflow-hidden rounded-xl bg-muted">
      {thumbSrc ? (
        <img src={thumbSrc} alt={post.caption ?? ''} className="h-full w-full object-cover" loading="lazy" />
      ) : null}
    </div>
  )
}

/** Small, de-emphasized "invited by" row — used once the invite has already done its job. */
function ReferrerStrip({
  referrer,
  referrerName,
  currentUserId,
}: {
  referrer: ReferrerPreview
  referrerName: string
  currentUserId: string | undefined
}) {
  const { data: followStats } = useFollowStats(referrer.id, currentUserId)
  const followMutation = useFollowMutation(referrer.id, currentUserId ?? '')
  const isFollowing = followStats?.isFollowing ?? false

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar src={referrer.avatarUrl} alt={referrerName} size="sm" />
        <p className="truncate text-body-sm text-muted-foreground">
          Invited by <span className="text-foreground">{referrerName}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {currentUserId ? (
          <Button
            className="h-8 px-3 text-body-sm"
            variant={isFollowing ? 'outline' : 'secondary'}
            disabled={followMutation.isPending}
            onClick={() => followMutation.mutate({ action: isFollowing ? 'unfollow' : 'follow' })}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Button>
        ) : null}
        {referrer.slug ? (
          <Button asChild className="h-8 px-3 text-body-sm" variant="ghost">
            <Link to="/profile/$slug" params={{ slug: referrer.slug }}>
              View profile
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  )
}

/** Authenticated, just joined via this invite, not yet activated: onboarding is the whole page. */
function NextStepsView({
  referrer,
  referrerName,
  currentUserId,
  isProfileComplete,
}: {
  referrer: ReferrerPreview
  referrerName: string
  currentUserId: string | undefined
  isProfileComplete: boolean
}) {
  const steps = getOnboardingSteps(isProfileComplete ? 'firstPost' : 'profile')

  return (
    <StaticPageLayout>
      <div className="flex flex-col gap-6">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="circle-check" variant="solid" className="text-lg text-(--tone-standard)" />
              <Badge variant="outline">Invite accepted</Badge>
            </div>
            <CardTitle className="text-heading-2">Let's get your profile ready</CardTitle>
            <CardDescription className="text-body-md">
              Two quick steps and you're set up as a creator on Desperse.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Stepper steps={steps.slice(0, 2)} />
              <p className="text-body-sm text-muted-foreground">
                {steps.find((step) => step.status === 'current')?.description}
              </p>
            </div>

            <Button asChild size="cta" className="w-full sm:w-auto">
              <Link to="/onboarding">{isProfileComplete ? 'Continue onboarding' : 'Get started'}</Link>
            </Button>

            <ReferrerStrip referrer={referrer} referrerName={referrerName} currentUserId={currentUserId} />
          </CardContent>
        </Card>
      </div>
    </StaticPageLayout>
  )
}

/** Authenticated, activated: light confirmation, no more onboarding nudge. */
function ActivatedView({
  referrer,
  referrerName,
  currentUserId,
}: {
  referrer: ReferrerPreview
  referrerName: string
  currentUserId: string | undefined
}) {
  return (
    <StaticPageLayout>
      <div className="flex flex-col gap-6">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="circle-check" variant="solid" className="text-lg text-(--tone-standard)" />
              <Badge variant="success">Invite activated</Badge>
            </div>
            <CardTitle className="text-heading-2">You're all set</CardTitle>
            <CardDescription className="text-body-md">
              {referrerName} has been credited for this invite. Welcome to Desperse.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button asChild size="cta" className="w-full sm:w-auto">
              <Link to="/">Go to your feed</Link>
            </Button>
            <ReferrerStrip referrer={referrer} referrerName={referrerName} currentUserId={currentUserId} />
          </CardContent>
        </Card>
      </div>
    </StaticPageLayout>
  )
}

export function InviteLandingPage({ code, referrerSlug, invalid, initialPreview }: InviteLandingPageProps) {
  const { isAuthenticated, login, isReady } = useAuth()
  const { user, isProfileIncomplete } = useCurrentUser()
  const { data: preview, isLoading: isPreviewLoading } = useInviteReferrerPreview(code, !invalid, initialPreview)
  const referrer = preview?.referrer ?? null
  const samplePosts = preview?.samplePosts ?? []

  const { getAuthHeaders } = useAuth()
  const isReferrer = Boolean(isAuthenticated && referrer && user?.usernameSlug?.toLowerCase() === referrer.slug?.toLowerCase())
  // Wait for the preview to settle before asking for referral status — firing
  // early would waste a round-trip for a referrer viewing their own link.
  const { data: myReferral } = useMyReferralStatus(
    user?.id,
    isAuthenticated && preview !== undefined && !isReferrer,
    getAuthHeaders,
  )
  const joinedViaThisInvite = Boolean(myReferral && referrer && myReferral.referrerUserId === referrer.id)
  const isProfileComplete = !isProfileIncomplete
  // ?ref= is display-only fallback while the preview is in flight. Once the
  // preview has resolved, only the resolved user may be named — otherwise a
  // crafted URL (/i/<dead-code>/welcome?ref=<anyone>) renders "<anyone> invited
  // you" for a code that never validated.
  const referrerName =
    referrer?.displayName?.trim() || referrer?.slug || (isPreviewLoading ? referrerSlug : null) || 'Someone'
  const codeResolvedEmpty = !invalid && !isPreviewLoading && !referrer

  if (invalid || codeResolvedEmpty) {
    return (
      <StaticPageLayout>
        <div className="flex flex-col gap-6">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="space-y-4">
              <Badge variant="secondary" className="w-fit">
                Invite
              </Badge>
              <CardTitle className="text-heading-2">This invite code isn't valid</CardTitle>
              <CardDescription className="text-body-md">
                "{code}" doesn't match an active Desperse invite link. It may be mistyped or no longer active.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="cta">
                <Link to="/">Go to Desperse</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </StaticPageLayout>
    )
  }

  // Signed up through this exact link and haven't activated yet: the invite's job
  // is done, so the page becomes an onboarding hand-off instead of a sales pitch.
  if (isAuthenticated && !isReferrer && joinedViaThisInvite && referrer) {
    if (myReferral?.state === 'activated') {
      return <ActivatedView referrer={referrer} referrerName={referrerName} currentUserId={user?.id} />
    }
    return (
      <NextStepsView
        referrer={referrer}
        referrerName={referrerName}
        currentUserId={user?.id}
        isProfileComplete={isProfileComplete}
      />
    )
  }

  return (
    <StaticPageLayout>
      <div className="flex flex-col gap-6">
        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardHeader className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Invite</Badge>
              <Badge variant="secondary">Personal link</Badge>
            </div>

            <div className="flex items-center gap-4">
              {isPreviewLoading ? (
                <Skeleton className="h-16 w-16 rounded-full" />
              ) : (
                <UserAvatar src={referrer?.avatarUrl} alt={referrerName} className="!h-16 !w-16" />
              )}
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-heading-2 truncate">
                  {isReferrer ? 'This is your invite link' : `${referrerName} invited you to Desperse`}
                </CardTitle>
                {referrer?.bio ? (
                  <p className="line-clamp-2 text-body-sm text-muted-foreground">{referrer.bio}</p>
                ) : (
                  <CardDescription className="text-body-md">
                    {isReferrer
                      ? 'You are looking at the invite link tied to your account.'
                      : 'A simple path into Desperse that keeps attribution attached through signup.'}
                  </CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {samplePosts.length > 0 ? (
              <div className="space-y-2">
                <p className="text-label-lg text-muted-foreground">Recent work from {referrerName}</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {samplePosts.slice(0, 4).map((post: SamplePost) => (
                    <SamplePostThumb key={post.id} post={post} />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-body-md">Desperse is a place to publish, discover, and collect creative work.</p>
            )}
            <p className="text-body-sm text-muted-foreground">
              If you join and activate, the referrer may receive in-app recognition in Desperse.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              {isReferrer ? (
                <Button asChild size="cta">
                  <Link to="/settings/account">Go to settings</Link>
                </Button>
              ) : isAuthenticated ? (
                <Button asChild size="cta">
                  <Link to="/">Go to Desperse</Link>
                </Button>
              ) : (
                <Button size="cta" onClick={() => login()} disabled={!isReady}>
                  Join Desperse
                </Button>
              )}
              <Button asChild variant="outline">
                <Link to="/">Go to feed</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <section className="rounded-2xl border bg-muted/20 p-5 text-body-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <Icon name="triangle-exclamation" variant="regular" className="mt-0.5 text-lg" />
            <p>This invite flow is about joining Desperse and finishing activation.</p>
          </div>
        </section>
      </div>
    </StaticPageLayout>
  )
}

export default InviteLandingPage
