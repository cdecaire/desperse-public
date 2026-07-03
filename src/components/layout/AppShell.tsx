import { useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AppShell as SableAppShell } from '@cdecaire/sable'
import { Col, Columns, GridOverlay, Region } from '@cdecaire/sable/layout'
import TopNav from './TopNav'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'
import { PublicHeader, PUBLIC_NAV_ITEMS } from './PublicHeader'
import { GridOverlayContext } from './GridOverlayContext'
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

function MarketplaceGridFrame({ children, showGrid }: AppShellProps & { showGrid: boolean }) {
  return (
    <div className="relative w-full">
      <GridOverlay
        show={showGrid}
        inset={false}
        className="px-4 md:px-6 lg:px-8"
      />
      {children}
    </div>
  )
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

  // Content sits on the SAME 12-column grid the GridOverlay visualizes, so it
  // aligns to the columns instead of a separate centered max-width block. Most
  // pages occupy the middle 6 columns (4–9) — 3 empty margin columns each side,
  // centered. Post detail → full-bleed.
  //
  // Settings/account and admin render their OWN two-rail chrome layout
  // (SettingsLayout — a sticky sub-nav rail flush against the app Sidebar + a
  // capped content pane) OUTSIDE this grid, so the rail reads as chrome like the
  // Sidebar rather than as a sub-nav floating in the centered content grid. They
  // get the bare branch below. The settings index/help still place their content
  // directly on the 12-col grid via isWideLayout.
  const isSettingsAccountRoute = currentPath.startsWith('/settings/account')
  const isAdminRoute = currentPath.startsWith('/admin')
  const ownsRailLayout = isSettingsAccountRoute || isAdminRoute
  const isWideLayout = currentPath.startsWith('/settings') && !isSettingsAccountRoute

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
        // Logged-out visitors get one seamless public chrome: the same
        // PublicHeader the home gallery and static pages use (sticky, all
        // breakpoints) and no app sidebar/bottom nav. The app shell chrome is
        // a logged-in affordance. (__root only mounts AppShell once auth is
        // ready, so isAuthenticated is settled here.)
        header={
          isAuthenticated
            ? (showTopNav ? <TopNav /> : undefined)
            : <PublicHeader navItems={PUBLIC_NAV_ITEMS} position="sticky" />
        }
        sidebar={isAuthenticated ? <Sidebar /> : undefined}
        bottomNav={isAuthenticated && showBottomNav ? <BottomNav /> : undefined}
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
        <GridOverlayContext.Provider value={showGrid}>
          <div className="relative w-full">
            {isPostDetailPage ? (
              <Region bleed>{children}</Region>
            ) : ownsRailLayout ? (
              // Settings/account + admin own a two-rail chrome layout (SettingsLayout);
              // they render full-width beside the app Sidebar, OUTSIDE the centered
              // 12-col grid, and manage their own local overlay via GridOverlayContext.
              children
            ) : isExplorePage || isSearchPage ? (
              // Explore/search own marketplace layouts (filter rail + gallery grid),
              // so render the dev column overlay against their full-width content frame
              // instead of the default centered 12-col content block.
              <MarketplaceGridFrame showGrid={showGrid}>
                {children}
              </MarketplaceGridFrame>
            ) : (
              // The page IS the 12-col grid, but CAPPED + centered so it stops
              // stretching at --region-wide (1280) on large displays. Content places
              // ON the columns (it visibly aligns to the grid), not as a floating
              // centered block. The GridOverlay lives INSIDE this capped container, so
              // ⌘/Ctrl+Shift+G matches the real grid exactly.
              <div className="relative mx-auto w-full max-w-[var(--region-wide)]">
                {showGrid && <GridOverlay />}
                <Columns count={12} style={{ paddingInline: 'var(--page-inset)' }}>
                  {isWideLayout ? (
                    // Settings index/help place their own Cols directly on the grid.
                    children
                  ) : (
                    // Default routes (feed, explore, search, notifications, create):
                    // the middle 8 of 12 (cols 3–10) — wide enough for forms/media
                    // without sprawling. (Long-form text within still caps its own
                    // measure at ~65ch, so reading lines never run too long.)
                    <Col span={{ base: 12, lg: 8 }} start={{ lg: 3 }}>
                      {children}
                    </Col>
                  )}
                </Columns>
              </div>
            )}
          </div>
        </GridOverlayContext.Provider>
      </SableAppShell>
    </MessagingProvider>
  )
}
