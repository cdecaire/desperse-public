import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router'
import { AuthGuard } from '@/components/shared/AuthGuard'
import { RoleGuard } from '@/components/shared/RoleGuard'
import AdminNav from '@/components/admin/AdminNav'
import { SettingsLayout } from '@/components/layout/SettingsLayout'
import { Icon } from '@/components/ui/icon'
import { Stack } from '@cdecaire/sable/layout'

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
})

// Map routes to page titles for mobile header
const routeTitles: Record<string, string> = {
  '/admin/moderation': 'Content Moderation',
  '/admin/feedback': 'Beta Feedback',
}

function AdminLayout() {
  const location = useLocation()
  const isIndexPage = location.pathname === '/admin' || location.pathname === '/admin/'
  const isDetailPage = location.pathname.includes('/moderation/') || location.pathname.includes('/feedback/')

  // Get the page title based on current route
  const getPageTitle = () => {
    // Check for exact match first
    if (routeTitles[location.pathname]) {
      return routeTitles[location.pathname]
    }
    // Check for partial match (for nested routes)
    if (location.pathname.startsWith('/admin/moderation')) {
      return 'Content Moderation'
    }
    if (location.pathname.startsWith('/admin/feedback')) {
      return 'Beta Feedback'
    }
    return 'Admin'
  }

  const pageTitle = getPageTitle()

  // Get back link for detail pages
  const getBackLink = () => {
    if (location.pathname.includes('/moderation/')) {
      return '/admin/moderation'
    }
    if (location.pathname.includes('/feedback/')) {
      return '/admin/feedback'
    }
    return '/admin'
  }

  return (
    <AuthGuard>
      <RoleGuard requiredRole="moderator">
        {/* Admin owns the same two-rail chrome layout as settings (SettingsLayout).
            LIST pages are data tables → `wide` (pane caps at 1280, content fills all
            12 cols). DETAIL pages are reading views → default (content/896, 8 cols),
            so wide is conditional on isDetailPage. */}
        <SettingsLayout wide={!isDetailPage} nav={<AdminNav variant="desktop" />}>
            {/* Mobile: Show appropriate header based on page type */}
            {isDetailPage ? (
              <header className="md:hidden fixed top-0 left-0 right-0 z-(--z-nav) w-full border-b bg-background">
                <div className="grid grid-cols-3 items-center h-14 px-4">
                  <div className="flex items-center">
                    <Link
                      to={getBackLink()}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground"
                      aria-label="Back"
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
            ) : isIndexPage ? (
              <>
                <header className="md:hidden fixed top-0 left-0 right-0 z-(--z-nav) w-full border-b bg-background">
                  <div className="grid grid-cols-3 items-center h-14 px-4">
                    <div className="flex items-center">
                      <Link
                        to="/"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground"
                        aria-label="Back to home"
                      >
                        <Icon name="arrow-left" />
                      </Link>
                    </div>
                    <div className="flex justify-center min-w-0 flex-1">
                      <h1 className="text-title-lg whitespace-nowrap truncate">Admin</h1>
                    </div>
                    <div aria-hidden="true" />
                  </div>
                </header>
                <div className="md:hidden pt-4">
                  <AdminNav variant="mobile" />
                </div>
              </>
            ) : (
              <header className="md:hidden fixed top-0 left-0 right-0 z-(--z-nav) w-full border-b bg-background">
                <div className="grid grid-cols-3 items-center h-14 px-4">
                  <div className="flex items-center">
                    <Link
                      to="/admin"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground"
                      aria-label="Back to admin"
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
            )}

            <Stack gap={3}>
              <Outlet />
            </Stack>
        </SettingsLayout>
      </RoleGuard>
    </AuthGuard>
  )
}
