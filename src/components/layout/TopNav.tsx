import { Link, useRouterState, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { AppHeader } from '@cdecaire/sable'
import { Icon } from '@/components/ui/icon'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Logo } from '../shared/Logo'
import Wallets from './Wallets'
import { triggerFeedRefresh } from '@/hooks/useFeedRefresh'
import { useScrollHideNav, resetNavVisibility } from '@/hooks/useScrollHideNav'
import { useProfileUser } from '@/hooks/useProfileQuery'

// Skeleton for wallet button while auth initializes
function WalletSkeleton() {
  return <div className="w-8 h-8 rounded-full bg-muted motion-pulse" />
}

// Determine if a path is a top-level page (shows create icon + wallet).
function isTopLevelPage(pathname: string, isOwnProfile?: boolean): boolean {
  if (pathname === '/') return true
  if (pathname === '/search') return true
  if (pathname === '/notifications') return true
  if (pathname.startsWith('/profile')) return isOwnProfile === true
  if (pathname === '/admin' || pathname === '/admin/moderation' || pathname === '/admin/feedback') return true
  return false
}

// Get page title for top-level pages (null means show logo).
function getPageTitle(pathname: string, profileDisplayName?: string, profileSlug?: string): string | null {
  if (pathname === '/') return null
  if (pathname === '/search') return 'Search'
  if (pathname === '/notifications') return 'Notifications'
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

  const profileSlug = pathname.startsWith('/profile/') ? pathname.split('/')[2] : undefined
  const isOwnProfile = profileSlug ? currentUser?.usernameSlug === profileSlug : undefined
  const isTopLevel = isTopLevelPage(pathname, isOwnProfile)

  const { data: profileData } = useProfileUser(profileSlug)
  const profileDisplayName = profileData?.user?.displayName || profileData?.user?.slug

  useEffect(() => {
    resetNavVisibility()
  }, [pathname])

  const handleBack = () => {
    if (window.history.length > 1) {
      router.history.back()
    } else {
      router.navigate({ to: '/' })
    }
  }

  const pageTitle = getPageTitle(pathname, profileDisplayName, profileSlug)

  const leading = isTopLevel ? (
    <Link
      to="/create"
      className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-accent hover-fade"
      aria-label="Create"
      onClick={(e) => {
        if (!isAuthenticated) {
          e.preventDefault()
          login()
        }
      }}
    >
      <Icon name="plus" variant="regular" className="text-xl" />
    </Link>
  ) : (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-accent hover-fade"
      aria-label="Back"
    >
      <Icon name="arrow-left" />
    </button>
  )

  const title =
    pageTitle === null ? (
      <Link
        to="/"
        className="flex items-center space-x-2"
        onClick={(e) => {
          if (isFeed) {
            e.preventDefault()
            triggerFeedRefresh()
          }
        }}
      >
        <Logo size={22} className="text-foreground" />
        <span className="text-xl font-bold">Desperse</span>
      </Link>
    ) : (
      <span className="text-lg font-semibold truncate max-w-[200px]">{pageTitle}</span>
    )

  const actions = isTopLevel ? (
    !isReady ? <WalletSkeleton /> : isAuthenticated ? <Wallets variant="bottomnav" /> : null
  ) : null

  return (
    <AppHeader
      className={`transition-transform duration-200 ${isHidden ? '-translate-y-full' : 'translate-y-0'}`}
      leading={leading}
      title={title}
      actions={actions}
    />
  )
}
