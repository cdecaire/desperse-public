import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router'
import { Col } from '@cdecaire/sable/layout'
import { AuthGuard } from '@/components/shared/AuthGuard'
import SettingsNav, { settingsRouteTitles } from '@/components/settings/SettingsNav'
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

  // Two sections of the page grid (placed by AppShell's <Columns>): the settings
  // sub-nav in columns 3–4, the content pane in columns 5–10. No divider rule —
  // the grid gutter separates them. AuthGuard is transparent when authed, so
  // these Cols are direct grid items.
  return (
    <AuthGuard>
      {/* Sidebar section — columns 3–4, desktop only */}
      <Col
        span={{ base: 12, md: 2 }}
        start={{ md: 3 }}
        className="hidden md:block"
      >
        <div className="sticky top-16">
          <SettingsNav variant="desktop" />
        </div>
      </Col>

      {/* Content section — columns 5–10 */}
      <Col span={{ base: 12, md: 6 }} start={{ md: 5 }} className="min-w-0">
        {/* Mobile: back button on detail pages, the nav on the index */}
        {isDetailPage ? (
          <header
            className="md:hidden fixed top-0 left-0 right-0 z-40 w-full border-b bg-background"
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
      </Col>
    </AuthGuard>
  )
}
