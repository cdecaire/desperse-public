import { useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AppShell as SableAppShell } from '@cdecaire/sable'
import { Col, Columns, GridOverlay, Region } from '@cdecaire/sable/layout'
import TopNav from './TopNav'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'
import { Toaster } from '@/components/ui/toaster'
import { RouteProgressBar } from '@/components/shared/RouteProgressBar'
import { NetworkBanner } from '@/components/shared/NetworkBanner'
import { RpcHealthBanner } from '@/components/shared/RpcHealthBanner'
import { LoginModal, useLoginModal } from '@/components/shared/LoginModal'
import { FloatingMessageButton, MessagingProvider } from '@/components/messaging'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface AppShellProps {
  children: React.ReactNode
}

// Routes that render without the navigation shell.
const STANDALONE_ROUTES = ['/login']
// Routes where the mobile bottom nav is hidden.
const HIDE_BOTTOM_NAV_PREFIXES = ['/post']

export default function AppShell({ children }: AppShellProps) {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const { showModal, setShowModal } = useLoginModal()
  const { isAuthenticated } = useAuth()
  const { user: currentUser } = useCurrentUser()

  // Tablet breakpoint (md=768) — used only for the bottom-nav exception below.
  const [isTabletOrAbove, setIsTabletOrAbove] = useState(false)
  useEffect(() => {
    const checkBreakpoint = () => {
      setIsTabletOrAbove(window.matchMedia('(min-width: 768px)').matches)
    }
    checkBreakpoint()
    window.addEventListener('resize', checkBreakpoint)
    return () => window.removeEventListener('resize', checkBreakpoint)
  }, [])

  // Dev affordance: toggle the column-grid overlay with ⌘/Ctrl+Shift+G to verify
  // that recomposed page layouts align to the column system + page inset.
  const [showGrid, setShowGrid] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault()
        setShowGrid((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const isStandalone = STANDALONE_ROUTES.some(
    (route) => currentPath === route || currentPath.startsWith(`${route}/`),
  )

  // Standalone pages render bare (login).
  if (isStandalone) {
    return (
      <>
        {children}
        <Toaster />
      </>
    )
  }

  const isPostDetailPage = currentPath.startsWith('/post/')

  // Pages that render their own MobileHeader hide the global AppHeader on mobile.
  const isSettingsIndexPage = currentPath === '/settings' || currentPath === '/settings/'
  const isAccountDetailPage =
    currentPath.startsWith('/settings/account/') &&
    currentPath !== '/settings/account' &&
    currentPath !== '/settings/account/'
  const isExplorePage = currentPath === '/explore' || currentPath === '/explore/'
  const isSearchPage = currentPath === '/search' || currentPath === '/search/'
  const showTopNav = !isSettingsIndexPage && !isAccountDetailPage && !isExplorePage && !isSearchPage

  // Bottom-nav visibility: hidden on settings-index/account-detail on phones (own
  // header), shown at tablet (no sidebar yet); hidden on post detail and other
  // users' profiles.
  const isSettingsPage = currentPath === '/settings' || currentPath.startsWith('/settings/')
  const shouldHideBottomNavOnMobile = (isSettingsIndexPage || isAccountDetailPage) && !isTabletOrAbove
  const shouldHideBottomNavForOtherRoutes =
    !isSettingsPage &&
    HIDE_BOTTOM_NAV_PREFIXES.some((route) => currentPath === route || currentPath.startsWith(`${route}/`))
  const isProfilePage = currentPath.startsWith('/profile/')
  const profileSlug = isProfilePage ? currentPath.split('/')[2] : undefined
  const isViewingOtherProfile = isProfilePage && profileSlug && currentUser?.usernameSlug !== profileSlug
  const showBottomNav =
    !shouldHideBottomNavOnMobile && !shouldHideBottomNavForOtherRoutes && !isViewingOtherProfile

  // Content width — unified on Sable's named Region widths. Post detail goes
  // Content sits on the SAME 12-column grid the GridOverlay visualizes, so it
  // aligns to the columns instead of a separate centered max-width block. Most
  // pages occupy the middle 8 columns (3–10) — 2 empty margin columns each side,
  // centered. Settings/admin place their OWN sidebar + content Cols directly on
  // this grid (sidebar 3–4, content 5–10). Post detail → full-bleed.
  const isWideLayout =
    currentPath.startsWith('/settings') || currentPath.startsWith('/admin')

  return (
    <MessagingProvider>
      <SableAppShell
        banners={
          <>
            <RouteProgressBar />
            <NetworkBanner />
            <RpcHealthBanner />
          </>
        }
        header={showTopNav ? <TopNav /> : undefined}
        sidebar={<Sidebar />}
        bottomNav={showBottomNav ? <BottomNav /> : undefined}
        overlays={
          <>
            {isAuthenticated && !isSettingsPage && !currentPath.startsWith('/admin') && (
              <FloatingMessageButton hideTrigger={isPostDetailPage || !!isViewingOtherProfile} />
            )}
            <Toaster />
            <LoginModal open={showModal} onOpenChange={setShowModal} />
          </>
        }
      >
        <div className="relative w-full">
          {showGrid && <GridOverlay />}
          {isPostDetailPage ? (
            <Region bleed>{children}</Region>
          ) : isWideLayout ? (
            // Settings/admin own their layout: they place a sidebar Col and a
            // content Col directly on this page grid (the guards are transparent
            // when authed, so those Cols are direct grid items).
            <Columns count={12} style={{ paddingInline: 'var(--page-inset)' }}>
              {children}
            </Columns>
          ) : (
            // Matches the GridOverlay exactly (12 cols, --grid-gutter gap,
            // --page-inset) so content lines up with the visualized columns.
            <Columns count={12} style={{ paddingInline: 'var(--page-inset)' }}>
              <Col span={{ base: 12, lg: 8 }} start={{ lg: 3 }}>
                {children}
              </Col>
            </Columns>
          )}
        </div>
      </SableAppShell>
    </MessagingProvider>
  )
}
