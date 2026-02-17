import { createFileRoute, Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { AuthGuard } from '@/components/shared/AuthGuard'
import { MobileHeader, MobileHeaderSpacer } from '@/components/layout/MobileHeader'

export const Route = createFileRoute('/settings/')({
  component: SettingsIndexPage,
})

const settingsCategories = [
  {
    title: 'Account',
    items: [
      {
        path: '/settings/account/profile-info',
        label: 'Profile Info',
        icon: 'fa-user',
        description: 'Update your profile and username',
      },
      {
        path: '/settings/account/wallets',
        label: 'Wallets & Linked',
        icon: 'fa-wallet',
        description: 'Manage connected wallets and accounts',
      },
      {
        path: '/settings/account/notifications',
        label: 'Notifications',
        icon: 'fa-bell',
        description: 'Choose which notifications to receive',
      },
      {
        path: '/settings/account/messaging',
        label: 'Messaging',
        icon: 'fa-message',
        description: 'Control who can message you',
      },
      {
        path: '/settings/account/security',
        label: 'Security',
        icon: 'fa-shield',
        description: 'Password and security settings',
      },
      {
        path: '/settings/account/app',
        label: 'App Settings',
        icon: 'fa-gear',
        description: 'Preferences and app configuration',
      },
    ],
  },
  {
    title: 'General',
    items: [
      {
        path: '/settings/help',
        label: 'Help & About',
        icon: 'fa-circle-info',
        description: 'Learn more and get support',
      },
    ],
  },
]

function SettingsIndexPage() {
  const location = useLocation()
  const navigate = useNavigate()

  // On desktop (md and above), redirect to profile-info by default
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)') // md breakpoint
    if (mediaQuery.matches) {
      navigate({ to: '/settings/account/profile-info', replace: true })
    }
  }, [navigate])

  return (
    <AuthGuard>
      <div className="min-h-screen">
        {/* Mobile View - Settings Menu */}
        <div className="md:hidden">
          {/* Mobile Header - replaces TopNav with PWA safe-area support */}
          <MobileHeader title="Settings" backTo="/" />

          {/* Settings Menu Content */}
          <div>
            <MobileHeaderSpacer />
            <div className="divide-y divide-border/80">
            {settingsCategories.map((category) => (
              <div key={category.title} className="py-4">
                <h2 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {category.title}
                </h2>
                <nav className="space-y-1">
                  {category.items.map((item) => {
                    const isActive =
                      location.pathname === item.path ||
                      location.pathname.startsWith(`${item.path}/`)

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-accent hover:text-accent-foreground'
                        }`}
                      >
                        <span className="w-6 h-6 grid place-items-center flex-shrink-0">
                          <i
                            className={`${isActive ? 'fa-solid' : 'fa-regular'} ${item.icon} text-xl`}
                            aria-hidden="true"
                          />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium leading-none">
                            {item.label}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 leading-tight">
                            {item.description}
                          </div>
                        </div>
                        <i
                          className="fa-regular fa-chevron-right text-muted-foreground text-sm"
                          aria-hidden="true"
                        />
                      </Link>
                    )
                  })}
                </nav>
              </div>
            ))}
            </div>
          </div>
        </div>

        {/* Desktop View - Redirect to account settings via account layout */}
        <div className="hidden md:block">
          <div className="py-8 space-y-6 px-4 md:px-6 lg:px-8">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Select a category from the sidebar to get started.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
