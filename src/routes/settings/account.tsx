import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router'
import { AuthGuard } from '@/components/shared/AuthGuard'
import SettingsNav, { settingsRouteTitles } from '@/components/settings/SettingsNav'
import { SettingsLayout } from '@/components/layout/SettingsLayout'
import { Icon } from '@/components/ui/icon'

export const Route = createFileRoute('/settings/account')({
  component: AccountLayout,
})

function AccountLayout() {
  const location = useLocation()
  const isDetailPage = location.pathname !== '/settings/account' &&
                       location.pathname !== '/settings/account/'

  // Get the page title based on current route
  const pageTitle = settingsRouteTitles[location.pathname] || 'Account Settings'

  // SettingsLayout supplies the two-rail chrome shell: a sticky sub-nav rail
  // (the desktop SettingsNav) flush against the app Sidebar + a capped content
  // pane. AppShell renders this route bare (outside the 12-col grid) so the rail
  // sits flush to <main>. AuthGuard is transparent when authed.
  return (
    <AuthGuard>
      <SettingsLayout nav={<SettingsNav variant="desktop" />}>
        {/* Mobile: back button on detail pages, the nav on the index */}
        {isDetailPage ? (
          <header
            className="md:hidden fixed top-0 left-0 right-0 z-(--z-nav) w-full border-b bg-background"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            <div className="grid grid-cols-3 items-center h-14 px-4">
              <div className="flex items-center">
                <Link
                  to="/settings"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground"
                  aria-label="Back to settings"
                >
                  <Icon name="arrow-left" />
                </Link>
              </div>
              <div className="flex justify-center min-w-0 flex-1">
                <h1 className="text-title-lg whitespace-nowrap truncate">{pageTitle}</h1>
              </div>
              <div aria-hidden="true" />
            </div>
          </header>
        ) : (
          <div className="md:hidden mb-6">
            <SettingsNav variant="mobile" />
          </div>
        )}

        <section className={`space-y-6 ${isDetailPage ? 'pt-settings-header md:pt-0' : ''}`}>
          <Outlet />
        </section>
      </SettingsLayout>
    </AuthGuard>
  )
}
