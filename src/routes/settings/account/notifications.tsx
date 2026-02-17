import { createFileRoute } from '@tanstack/react-router'
import { usePreferences } from '@/hooks/usePreferences'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

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
    <div className="space-y-4 pt-4">
      <div className="space-y-2">
        <h1 className="hidden md:block text-xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Choose which notifications you want to receive.
        </p>
      </div>

      <div className="rounded-[var(--radius-lg)] bg-white dark:bg-input/30 border border-input px-5 md:px-6 lg:px-8 py-4 md:py-5">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <LoadingSpinner />
          </div>
        ) : !user ? (
          <p className="text-sm text-muted-foreground py-2">
            Sign in to manage notification preferences
          </p>
        ) : (
          <div className="space-y-4">
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
          </div>
        )}
      </div>
    </div>
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
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-3">
        <i className={`fa-regular ${icon} w-4 text-center text-muted-foreground/70`} aria-hidden="true" />
        <div className="flex flex-col">
          <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
            {label}
          </Label>
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={`Toggle ${label.toLowerCase()} notifications`}
      />
    </div>
  )
}
