import { useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
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

// Routes that should not show the navigation shell
const STANDALONE_ROUTES = ['/login']
// Routes that need wider layout aligned with the sidebar (e.g. settings, admin, post detail)
const WIDE_LAYOUT_PREFIXES = ['/settings', '/admin', '/post']
// Routes where mobile bottom nav should be hidden (e.g. post detail)
// Note: Settings pages always show bottom nav until lg breakpoint (sidebar takes over)
const HIDE_BOTTOM_NAV_PREFIXES = ['/post']

export default function AppShell({ children }: AppShellProps) {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const { showModal, setShowModal } = useLoginModal()
  const { isAuthenticated } = useAuth()
  const { user: currentUser } = useCurrentUser()

  // Check if we're at tablet/desktop breakpoint (md = 768px)
  // IMPORTANT: All hooks must be called before any conditional returns
  const [isTabletOrAbove, setIsTabletOrAbove] = useState(false)
  
  useEffect(() => {
    const checkBreakpoint = () => {
      setIsTabletOrAbove(window.matchMedia('(min-width: 768px)').matches)
    }
    checkBreakpoint()
    window.addEventListener('resize', checkBreakpoint)
    return () => window.removeEventListener('resize', checkBreakpoint)
  }, [])
  
  // Check if current route should be standalone (no navigation)
  const isStandalone = STANDALONE_ROUTES.some(route => 
    currentPath === route || currentPath.startsWith(`${route}/`)
  )

  // Render standalone pages without navigation
  if (isStandalone) {
    return (
      <>
        {children}
        <Toaster />
      </>
    )
  }

  const isWideLayout = WIDE_LAYOUT_PREFIXES.some((route) =>
    currentPath === route || currentPath.startsWith(`${route}/`)
  )

  const isPostDetailPage = currentPath.startsWith('/post/')

  const mainContainerClass = isPostDetailPage
    ? 'w-full px-0' // Post detail: full width
    : isWideLayout
      ? 'w-full max-w-6xl lg:mx-0'
      : 'w-full max-w-full lg:max-w-4xl lg:mx-auto px-0 lg:px-4'

  // Hide TopNav on mobile for pages that have their own headers
  // TopNav is already lg:hidden, so this only affects mobile
  const isSettingsIndexPage = currentPath === '/settings' || currentPath === '/settings/'
  const isAccountDetailPage = currentPath.startsWith('/settings/account/') &&
                               currentPath !== '/settings/account' &&
                               currentPath !== '/settings/account/'
  const isExplorePage = currentPath === '/explore' || currentPath === '/explore/'
  const isSearchPage = currentPath === '/search' || currentPath === '/search/'
  const showTopNav = !isSettingsIndexPage && !isAccountDetailPage && !isExplorePage && !isSearchPage

  // Bottom nav logic:
  // - Mobile: Hide for settings pages (they have their own header navigation)
  // - Tablet: Show for all settings pages (no sidebar yet, need navigation)
  // - Desktop: Hidden via CSS (lg:hidden) when sidebar is visible
  const isSettingsPage = currentPath === '/settings' || currentPath.startsWith('/settings/')
  
  // On mobile, hide bottom nav for settings pages (index and account detail pages)
  // On tablet/desktop, show bottom nav for settings pages (it will hide at lg via CSS)
  const shouldHideBottomNavOnMobile = (isSettingsIndexPage || isAccountDetailPage) && !isTabletOrAbove
  
  // Hide bottom nav for non-settings routes (profile detail, post detail, etc.)
  const shouldHideBottomNavForOtherRoutes = !isSettingsPage && HIDE_BOTTOM_NAV_PREFIXES.some(
    (route) => currentPath === route || currentPath.startsWith(`${route}/`)
  )

  // Hide bottom nav when viewing other users' profiles (not your own)
  const isProfilePage = currentPath.startsWith('/profile/')
  const profileSlug = isProfilePage ? currentPath.split('/')[2] : undefined
  const isViewingOtherProfile = isProfilePage && profileSlug && currentUser?.usernameSlug !== profileSlug

  const showBottomNav = !shouldHideBottomNavOnMobile && !shouldHideBottomNavForOtherRoutes && !isViewingOtherProfile

  // On mobile pages with custom headers (settings, explore, search), don't add pt-14 to main
  // These pages handle their own safe-area padding via MobileHeader + MobileHeaderSpacer
  // Desktop always uses lg:pt-0 anyway.
  const hasCustomMobileHeader = isSettingsIndexPage || isAccountDetailPage || isExplorePage || isSearchPage

  return (
    <MessagingProvider>
      <div className="flex flex-col min-h-screen overflow-x-hidden">
        {/* Global route transition progress bar */}
        <RouteProgressBar />

        {/* Network and RPC status banners */}
        <NetworkBanner />
        <RpcHealthBanner />

        {/* Mobile TopNav */}
        {showTopNav && <TopNav />}

        <div className="flex flex-1 min-w-0 overflow-hidden">
          {/* Desktop Sidebar */}
          <Sidebar />

          {/* Main Content Area */}
          {/* PWA safe-area: TopNav has paddingTop for safe-area, so main content needs to account for both header height (3.5rem/56px) AND safe-area */}
          <main className={`flex-1 min-w-0 lg:ml-64 pb-16 lg:pb-0 px-0 overflow-x-hidden ${hasCustomMobileHeader ? '' : 'pt-topnav-safe'}`}>
            <div className={mainContainerClass}>{children}</div>
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        {showBottomNav && <BottomNav />}

        {/* Floating Message Button - Auth gated, hidden on settings and admin pages */}
        {/* On post detail and other user profiles, render with hideTrigger so the popover still works when opened via MessageButton */}
        {isAuthenticated && !isSettingsPage && !currentPath.startsWith('/admin') && (
          <FloatingMessageButton hideTrigger={isPostDetailPage || !!isViewingOtherProfile} />
        )}

        <Toaster />

        {/* Login Modal - Shows on initial load for unauthenticated users */}
        <LoginModal open={showModal} onOpenChange={setShowModal} />
      </div>
    </MessagingProvider>
  )
}
