import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router'
import { AuthGuard } from '@/components/shared/AuthGuard'
import SettingsNav from '@/components/settings/SettingsNav'
import { Icon } from '@/components/ui/icon'

export const Route = createFileRoute('/settings/account')({
  component: AccountLayout,
})

// Map routes to page titles for mobile header
const routeTitles: Record<string, string> = {
  '/settings/account/profile-info': 'Profile Info',
  '/settings/account/wallets': 'Wallets & Linked',
  '/settings/account/security': 'Security',
  '/settings/account/app': 'App Settings',
  '/settings/account/messaging': 'Messaging',
  '/settings/account/notifications': 'Notifications',
}

function AccountLayout() {
  const location = useLocation()
  const isDetailPage = location.pathname !== '/settings/account' && 
                       location.pathname !== '/settings/account/'
  
  // Get the page title based on current route
  const pageTitle = routeTitles[location.pathname] || 'Account Settings'

  return (
    <AuthGuard>
      <div className="flex flex-col md:flex-row items-start flex-1 min-h-screen">
        <aside className="hidden md:flex md:w-64 border-r border-border/80 bg-background self-stretch">
          <div className="sticky top-16 w-full">
            <SettingsNav variant="desktop" />
          </div>
        </aside>

        <div className="flex-1 w-full">
          {/* Mobile: Show back button on detail pages, menu on index */}
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
                  <h1 className="text-base font-semibold whitespace-nowrap truncate">{pageTitle}</h1>
                </div>
                <div aria-hidden="true" />
              </div>
            </header>
          ) : (
            <div className="md:hidden mb-6 px-4 md:px-6 lg:px-8">
              <SettingsNav variant="mobile" />
            </div>
          )}

          <section className={`max-w-4xl space-y-6 px-4 md:px-6 lg:px-8 ${isDetailPage ? 'pt-settings-header' : ''}`}>
            <Outlet />
          </section>
        </div>
      </div>
    </AuthGuard>
  )
}

