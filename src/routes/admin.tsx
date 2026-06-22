import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router'
import { AuthGuard } from '@/components/shared/AuthGuard'
import { RoleGuard } from '@/components/shared/RoleGuard'
import AdminNav from '@/components/admin/AdminNav'
import { Icon } from '@/components/ui/icon'
import { Col, Columns, Stack } from '@cdecaire/sable/layout'

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
        {/* Two grid sections: the admin sub-nav + the content pane. No divider
            rule — the grid gutter separates them. Centered on the page grid by
            AppShell (cols 2–11). */}
        <Columns count={12} className="min-h-screen">
          <Col span={{ base: 12, md: 3 }} className="hidden md:block">
            <div className="sticky top-16">
              <AdminNav variant="desktop" />
            </div>
          </Col>

          <Col span={{ base: 12, md: 9 }} className="min-w-0">
            {/* Mobile: Show appropriate header based on page type */}
            {isDetailPage ? (
              <header className="md:hidden fixed top-0 left-0 right-0 z-40 w-full border-b bg-background">
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
                <header className="md:hidden fixed top-0 left-0 right-0 z-40 w-full border-b bg-background">
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
              <header className="md:hidden fixed top-0 left-0 right-0 z-40 w-full border-b bg-background">
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
          </Col>
        </Columns>
      </RoleGuard>
    </AuthGuard>
  )
}
