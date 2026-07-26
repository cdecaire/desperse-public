import { createFileRoute } from '@tanstack/react-router'
import { Row, Stack } from '@cdecaire/sable/layout'
import {
  Fieldset,
  FieldsetContent,
  FieldsetDescription,
  FieldsetLegend,
} from '@cdecaire/sable'
import { usePreferences } from '@/hooks/usePreferences'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Icon } from '@/components/ui/icon'
import { ContentLoadingSkeleton } from '@/components/shared/ContentLoadingSkeleton'
import { PageHeader } from '@/components/shared/PageHeader'

export const Route = createFileRoute('/settings/account/notifications')({
  component: NotificationsSettingsPage,
})

function NotificationsSettingsPage() {
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const {
    preferences,
    isLoading: isPrefsLoading,
    setNotifyFollows,
    setNotifyLikes,
    setNotifyComments,
    setNotifyCollects,
    setNotifyPurchases,
    setNotifyMentions,
    setNotifyMessages,
  } = usePreferences()

  const isLoading = isUserLoading || isPrefsLoading

  return (
    <Stack gap={2} className="pt-4">
      <PageHeader
        title="Notifications"
        description="Choose which notifications you want to receive."
      />

      <Fieldset>
        <FieldsetLegend>Notification events</FieldsetLegend>
        <FieldsetDescription>
          Control which activity appears in your notification stream.
        </FieldsetDescription>
        <FieldsetContent>
        {isLoading ? (
          <ContentLoadingSkeleton label="Loading notification preferences" rows={5} variant="compact" />
        ) : !user ? (
          <p className="text-body-sm text-muted-foreground py-2">
            Sign in to manage notification preferences
          </p>
        ) : (
          <Stack gap={2}>
            <NotificationToggle
              id="notify-messages"
              label="Messages"
              description="When you receive a new message"
              icon="fa-message"
              checked={preferences.notifications?.messages ?? true}
              onCheckedChange={setNotifyMessages}
            />
            <NotificationToggle
              id="notify-follows"
              label="New followers"
              description="When someone follows you"
              icon="fa-user-plus"
              checked={preferences.notifications?.follows ?? true}
              onCheckedChange={setNotifyFollows}
            />
            <NotificationToggle
              id="notify-likes"
              label="Likes"
              description="When someone likes your post"
              icon="fa-heart"
              checked={preferences.notifications?.likes ?? true}
              onCheckedChange={setNotifyLikes}
            />
            <NotificationToggle
              id="notify-comments"
              label="Comments"
              description="When someone comments on your post"
              icon="fa-comment"
              checked={preferences.notifications?.comments ?? true}
              onCheckedChange={setNotifyComments}
            />
            <NotificationToggle
              id="notify-collects"
              label="Collects"
              description="When someone collects your free collectible"
              icon="fa-gem"
              checked={preferences.notifications?.collects ?? true}
              onCheckedChange={setNotifyCollects}
            />
            <NotificationToggle
              id="notify-purchases"
              label="Purchases"
              description="When someone buys your edition"
              icon="fa-wallet"
              checked={preferences.notifications?.purchases ?? true}
              onCheckedChange={setNotifyPurchases}
            />
            <NotificationToggle
              id="notify-mentions"
              label="Mentions"
              description="When someone mentions you in a post or comment"
              icon="fa-at"
              checked={preferences.notifications?.mentions ?? true}
              onCheckedChange={setNotifyMentions}
            />
          </Stack>
        )}
        </FieldsetContent>
      </Fieldset>
    </Stack>
  )
}

type NotificationToggleProps = {
  id: string
  label: string
  description: string
  icon: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

function NotificationToggle({
  id,
  label,
  description,
  icon,
  checked,
  onCheckedChange,
}: NotificationToggleProps) {
  return (
    <Row align="center" justify="between" className="py-1">
      <Row gap={1.5} align="center">
        <Icon name={icon} variant="regular" className="w-4 text-center text-muted-foreground/70" />
        <Stack gap={0}>
          <Label htmlFor={id} className="text-label-lg cursor-pointer">
            {label}
          </Label>
          <span className="text-caption text-muted-foreground">{description}</span>
        </Stack>
      </Row>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={`Toggle ${label.toLowerCase()} notifications`}
      />
    </Row>
  )
}
