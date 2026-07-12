import { createFileRoute } from '@tanstack/react-router'
import {
  Fieldset,
  FieldsetContent,
  FieldsetDescription,
  FieldsetLegend,
} from '@cdecaire/sable'
import { Row, Stack } from '@cdecaire/sable/layout'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Icon } from '@/components/ui/icon'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { PageHeader } from '@/components/shared/PageHeader'
import { usePreferences } from '@/hooks/usePreferences'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export const Route = createFileRoute('/settings/account/privacy')({
  component: PrivacyPage,
})

function PrivacyPage() {
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const {
    preferences,
    isLoading: isPrefsLoading,
    isUpdating,
    setLeaderboardParticipation,
  } = usePreferences()
  const isLoading = isUserLoading || isPrefsLoading

  return (
    <Stack gap={2} className="pt-4">
      <PageHeader
        title="Privacy"
        description="Control how your account appears in public discovery features."
      />

      <Fieldset>
        <FieldsetLegend>Public discovery</FieldsetLegend>
        <FieldsetDescription>
          Choose whether your profile can appear in public rankings. Your posts and profile keep their existing visibility.
        </FieldsetDescription>
        <FieldsetContent>
          {isLoading ? (
            <Row justify="center" className="py-4">
              <LoadingSpinner />
            </Row>
          ) : !user ? (
            <p className="py-2 text-body-sm text-muted-foreground">
              Sign in to manage privacy preferences.
            </p>
          ) : (
            <Row align="center" justify="between" className="gap-6 py-1">
              <Row gap={1.5} align="center" className="min-w-0">
                <Icon name="fa-ranking-star" variant="regular" className="w-4 shrink-0 text-center text-muted-foreground/70" />
                <Stack gap={0}>
                  <Label htmlFor="leaderboard-participation" className="text-label-lg cursor-pointer">
                    Show my profile in the Leaderboard
                  </Label>
                  <span className="text-caption text-muted-foreground">
                    Turn this off to be removed from Creator and Collector rankings at the next refresh.
                  </span>
                </Stack>
              </Row>
              <Switch
                id="leaderboard-participation"
                checked={preferences.privacy?.leaderboardParticipation ?? true}
                disabled={isUpdating}
                onCheckedChange={setLeaderboardParticipation}
                aria-label="Show my profile in the Leaderboard"
              />
            </Row>
          )}
        </FieldsetContent>
      </Fieldset>
    </Stack>
  )
}
