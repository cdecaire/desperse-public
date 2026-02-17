import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/settings/account/')({
  beforeLoad: () => {
    // Redirect to profile-info by default
    // On desktop, this shows the account settings with sidebar
    // On mobile, users will navigate via the settings menu
    throw redirect({ to: '/settings/account/profile-info' })
  },
})

