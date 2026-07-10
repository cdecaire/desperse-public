import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Icon } from '@/components/ui/icon'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useOnboardingState } from '@/hooks/useOnboardingState'

interface InviteLandingPageProps {
  code: string
}

function InviteStateCard({ title, description, cta }: { title: string; description: string; cta?: ReactNode }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-title-lg">{title}</CardTitle>
        <CardDescription className="text-body-md">{description}</CardDescription>
      </CardHeader>
      {cta ? <CardContent>{cta}</CardContent> : null}
    </Card>
  )
}

export function InviteLandingPage({ code }: InviteLandingPageProps) {
  const { isAuthenticated } = useAuth()
  const { user, shouldShowOnboarding } = useCurrentUser()
  const { shouldShowOnboarding: needsOnboarding } = useOnboardingState()
  const displayName = user?.displayName?.trim() || user?.usernameSlug || 'someone'
  const codeLabel = code.trim() || 'this invite'
  const isReferrer = isAuthenticated && user?.usernameSlug?.toLowerCase() === code.trim().toLowerCase()
  const nextPath = needsOnboarding || shouldShowOnboarding ? '/onboarding' : '/'

  return (
    <StaticPageLayout>
      <div className="flex flex-col gap-6">
        <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Invite</Badge>
                <Badge variant="secondary">Personal link</Badge>
              </div>
              <div className="space-y-2">
                <CardTitle className="text-heading-2">
                  {isReferrer ? 'This is your invite link' : `${displayName} invited you to Desperse`}
                </CardTitle>
                <CardDescription className="text-body-md">
                  {isReferrer
                    ? 'You are looking at the invite link tied to your account.'
                    : 'A simple path into Desperse that keeps attribution attached through signup.'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="text-body-sm text-muted-foreground">Invite code</p>
                <p className="mt-1 font-mono text-title-lg tracking-[0.2em]">{codeLabel}</p>
              </div>
              <div className="space-y-3">
                <p className="text-body-md">
                  Desperse is a place to publish, discover, and collect creative work.
                </p>
                <p className="text-body-sm text-muted-foreground">
                  If you join and activate, the referrer may receive in-app recognition in Desperse.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                {isReferrer ? (
                  <Button asChild size="cta">
                    <Link to="/settings/account">Go to settings</Link>
                  </Button>
                ) : isAuthenticated ? (
                  <Button asChild size="cta">
                    <Link to={nextPath}>Continue with this invite</Link>
                  </Button>
                ) : (
                  <Button asChild size="cta">
                    <Link to="/">Join Desperse</Link>
                  </Button>
                )}
                <Button asChild variant="outline">
                  <Link to="/">Go to feed</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-title-lg">What happens next</CardTitle>
              <CardDescription className="text-body-md">Activation is what counts, not signup alone.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-body-sm text-muted-foreground">
              <p>1. Create or sign in to your account.</p>
              <p>2. Finish your profile.</p>
              <p>3. Follow a creator to activate the invite.</p>
              <p>4. Return here for confirmation once activation lands.</p>
            </CardContent>
          </Card>
        </section>

        {isAuthenticated ? (
          <section className="grid gap-4 md:grid-cols-2">
            <InviteStateCard
              title={isReferrer ? 'Own-link edge state' : 'Signed-in invite continuation'}
              description={isReferrer ? 'You opened your own invite, so we keep you on your settings surface.' : 'This invite can still be applied if your account has not already been bound.'}
              cta={
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button asChild>
                    <Link to={isReferrer ? '/settings/account' : nextPath}>
                      {isReferrer ? 'Open settings' : 'Continue onboarding'}
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/settings/profile">Profile settings</Link>
                  </Button>
                </div>
              }
            />
            <InviteStateCard
              title="Post-activation confirmation"
              description="After activation, we show a simple confirmation that the invite counted and the next step is complete."
              cta={<Badge variant="success">Ready after activation</Badge>}
            />
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <InviteStateCard
            title="Invalid or expired code"
            description="If the code is wrong or no longer active, show a clear fallback instead of silently dropping the user into the app."
            cta={<Badge variant="secondary">Graceful fallback</Badge>}
          />
          <InviteStateCard
            title="No referrer yet"
            description="Signed-in users without attribution should see an explicit continuation path, not a silent redirect."
            cta={<Badge variant="outline">Attribution preserved</Badge>}
          />
          <InviteStateCard
            title="Cannot rebind attribution"
            description="If the account already has attribution history, we explain that the invite cannot be applied and move on clearly."
            cta={<Badge variant="destructive">No rebinding</Badge>}
          />
        </section>

        <section className="rounded-2xl border bg-muted/20 p-5 text-body-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <Icon name="triangle-exclamation" variant="regular" className="mt-0.5 text-lg" />
            <p>
              Recognition only. No cash value. This invite flow is about joining Desperse and
              finishing activation, not rewards or future value.
            </p>
          </div>
        </section>
      </div>
    </StaticPageLayout>
  )
}

export default InviteLandingPage
