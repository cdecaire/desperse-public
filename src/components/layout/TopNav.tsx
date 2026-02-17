import { Link, useRouterState, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Logo } from '../shared/Logo'
import Wallets from './Wallets'
import { triggerFeedRefresh } from '@/hooks/useFeedRefresh'
import { useScrollHideNav, resetNavVisibility } from '@/hooks/useScrollHideNav'
import { useProfileUser } from '@/hooks/useProfileQuery'

// Skeleton for wallet button while auth initializes
function WalletSkeleton() {
  return <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
}

// Determine if a path is a top-level page (shows bottom nav, create icon, wallet)
// For profile pages, pass isOwnProfile to distinguish own vs other users' profiles
function isTopLevelPage(pathname: string, isOwnProfile?: boolean): boolean {
  // Home
  if (pathname === '/') return true
  // Search
  if (pathname === '/search') return true
  // Notifications
  if (pathname === '/notifications') return true
  // Profile pages - only own profile is top-level (shows create icon)
  // Other users' profiles show back button instead
  if (pathname.startsWith('/profile')) return isOwnProfile === true
  // Admin pages (index and moderation list, but NOT individual report details)
  if (pathname === '/admin' || pathname === '/admin/moderation' || pathname === '/admin/feedback') return true

  return false
}

// Get page title for top-level pages (null means show logo)
function getPageTitle(pathname: string, profileDisplayName?: string, profileSlug?: string): string | null {
  if (pathname === '/') return null // Show logo
  if (pathname === '/search') return 'Search'
  if (pathname === '/notifications') return 'Notifications'
  // Use display name, fallback to slug (from URL), fallback to empty to prevent "Profile" flash
  if (pathname.startsWith('/profile')) return profileDisplayName || profileSlug || ''
  if (pathname === '/admin') return 'Admin'
  if (pathname === '/admin/moderation') return 'Moderation'
  if (pathname === '/admin/feedback') return 'Feedback'

  return null
}

export default function TopNav() {
  const { isAuthenticated, isReady, login } = useAuth()
  const { user: currentUser } = useCurrentUser()
  const router = useRouter()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isHidden = useScrollHideNav()
  const isFeed = pathname === '/'

  // Get profile slug from URL if on a profile page
  const profileSlug = pathname.startsWith('/profile/')
    ? pathname.split('/')[2]
    : undefined

  // Check if viewing own profile
  const isOwnProfile = profileSlug ? currentUser?.usernameSlug === profileSlug : undefined
  const isTopLevel = isTopLevelPage(pathname, isOwnProfile)

  // Fetch profile user for display name (only when on profile page)
  const { data: profileData } = useProfileUser(profileSlug)

  // Get display name for profile pages
  const profileDisplayName = profileData?.user?.displayName || profileData?.user?.slug

  // Reset nav visibility on route change
  useEffect(() => {
    resetNavVisibility()
  }, [pathname])

  const handleCreateClick = () => {
    if (!isAuthenticated) {
      login()
    }
  }

  const handleBack = () => {
    // Use browser history to go back
    if (window.history.length > 1) {
      router.history.back()
    } else {
      // Fallback to home if no history
      router.navigate({ to: '/' })
    }
  }

  const pageTitle = getPageTitle(pathname, profileDisplayName, profileSlug)

  return (
    <header
      className={`lg:hidden fixed top-0 left-0 right-0 z-40 w-full border-b bg-background transition-transform duration-200 ${
        isHidden ? '-translate-y-full' : 'translate-y-0'
      }`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="grid grid-cols-3 items-center h-14 px-4">
        {/* Left: Create (top-level) or Back (secondary) */}
        <div className="flex items-center">
          {isTopLevel ? (
            <Link
              to="/create"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-accent transition-colors"
              aria-label="Create"
              onClick={(e) => {
                if (!isAuthenticated) {
                  e.preventDefault()
                  handleCreateClick()
                }
              }}
            >
              <i className="fa-regular fa-plus text-xl" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-accent transition-colors"
              aria-label="Back"
            >
              <i className="fa-solid fa-arrow-left" />
            </button>
          )}
        </div>

        {/* Center: Logo (home) or Page Title */}
        <div className="flex justify-center">
          {pageTitle === null ? (
            <Link
              to="/"
              className="flex items-center space-x-2"
              onClick={(e) => {
                // If already on home page, scroll to top and refresh
                if (isFeed) {
                  e.preventDefault()
                  triggerFeedRefresh()
                }
              }}
            >
              <Logo
                size={22}
                className="text-foreground"
              />
              <span className="text-xl font-bold">Desperse</span>
            </Link>
          ) : (
            <span className="text-lg font-semibold truncate max-w-[200px]">
              {pageTitle}
            </span>
          )}
        </div>

        {/* Right: Wallet (top-level only) */}
        <div className="flex justify-end">
          {isTopLevel && (
            <>
              {!isReady ? <WalletSkeleton /> : isAuthenticated ? <Wallets variant="bottomnav" /> : null}
            </>
          )}
        </div>
      </div>
    </header>
  )
}

