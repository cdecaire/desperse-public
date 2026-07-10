import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Icon } from '@/components/ui/icon'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface InviteLandingPageProps {
  code: string
  referrerSlug: string | null
  invalid: boolean
}

export function InviteLandingPage({ code, referrerSlug, invalid }: InviteLandingPageProps) {
  const { isAuthenticated } = useAuth()
  const { user, shouldShowOnboarding } = useCurrentUser()
  const isReferrer = Boolean(
    isAuthenticated && referrerSlug && user?.usernameSlug?.toLowerCase() === referrerSlug.toLowerCase(),
  )
  const nextPath = shouldShowOnboarding ? '/onboarding' : '/'

  if (invalid) {
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

  return (
    <StaticPageLayout>
      <div className="flex flex-col gap-6">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Invite</Badge>
              <Badge variant="secondary">Personal link</Badge>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-heading-2">
                {isReferrer ? 'This is your invite link' : `${referrerSlug ?? 'Someone'} invited you to Desperse`}
              </CardTitle>
              <CardDescription className="text-body-md">
                {isReferrer
                  ? 'You are looking at the invite link tied to your account.'
                  : 'A simple path into Desperse that keeps attribution attached through signup.'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <p className="text-body-md">Desperse is a place to publish, discover, and collect creative work.</p>
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

        <section className="rounded-2xl border bg-muted/20 p-5 text-body-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <Icon name="triangle-exclamation" variant="regular" className="mt-0.5 text-lg" />
            <p>
              Recognition only. No cash value. This invite flow is about joining Desperse and finishing activation,
              not rewards or future value.
            </p>
          </div>
        </section>
      </div>
    </StaticPageLayout>
  )
}

export default InviteLandingPage
