import { createFileRoute, Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Stack } from '@cdecaire/sable/layout'
import { AuthGuard } from '@/components/shared/AuthGuard'
import { Icon } from '@/components/ui/icon'
import { MobileHeader, MobileHeaderSpacer } from '@/components/layout/MobileHeader'
import { settingsCategories } from '@/components/settings/SettingsNav'

export const Route = createFileRoute('/settings/')({
  component: SettingsIndexPage,
})

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
                <h2 className="px-4 text-label-xs text-muted-foreground mb-3">
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
                          <Icon
                            name={item.icon}
                            variant={isActive ? 'solid' : 'regular'}
                            className="text-xl"
                          />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-title-sm leading-none">
                            {item.label}
                          </div>
                          <div className="text-caption text-muted-foreground mt-1">
                            {item.description}
                          </div>
                        </div>
                        <Icon name="chevron-right" variant="regular" className="text-muted-foreground text-sm" />
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
          <Stack gap={3} className="py-8 px-4 md:px-6 lg:px-8">
            <Stack gap={1}>
              <h1 className="text-heading-2">Settings</h1>
              <p className="text-body-sm text-muted-foreground">
                Select a category from the sidebar to get started.
              </p>
            </Stack>
          </Stack>
        </div>
      </div>
    </AuthGuard>
  )
}
