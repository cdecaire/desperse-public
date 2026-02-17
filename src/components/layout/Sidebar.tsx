import { Link, useLocation } from '@tanstack/react-router'
import MoreMenu from './MoreMenu'
import Wallets from './Wallets'
import { Logo } from '../shared/Logo'
import { useAuth } from '../../hooks/useAuth'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useNotificationCounters } from '../../hooks/useNotificationCounters'
import { triggerFeedRefresh, smoothScrollTo } from '../../hooks/useFeedRefresh'
import { NotificationBadge } from '../ui/notification-badge'

// Skeleton for auth button while Privy initializes
function AuthButtonSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 mx-3 w-[calc(100%-1.5rem)]">
      <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
      <div className="h-4 w-24 rounded bg-muted animate-pulse" />
    </div>
  )
}

// Skeleton for nav items while auth initializes
function NavItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 w-full">
      <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
      <div className="h-4 w-16 rounded bg-muted animate-pulse" />
    </div>
  )
}

type NavItem = {
  path: string
  label: string
  icon: string
  disabled: boolean
}

export default function Sidebar() {
  const location = useLocation()
  const { avatarUrl: authAvatarUrl, isAuthenticated, isReady, login } = useAuth()
  const { user: currentUser } = useCurrentUser()
  const profileAvatar = currentUser?.avatarUrl || authAvatarUrl

  // Check if user is moderator/admin
  const canModerate = currentUser?.role === 'moderator' || currentUser?.role === 'admin'
  
  // Get notification counters (includes unreviewed reports count, new feedback, and unread notifications)
  const { data: notificationCounters } = useNotificationCounters()
  const adminBadgeCount = (notificationCounters?.unreviewedReportsCount ?? 0) + (notificationCounters?.newFeedbackCount ?? 0)
  const unreadNotificationsCount = notificationCounters?.unreadNotificationsCount

  // Icon names without style prefix - style is applied based on active state
  const profilePath = currentUser?.usernameSlug ? `/profile/${currentUser.usernameSlug}` : '/profile'

  // Base nav items (always shown)
  const baseNavItems: NavItem[] = [
    {
      path: '/',
      label: 'Home',
      icon: 'fa-house',
      disabled: false,
    },
    {
      path: '/explore',
      label: 'Explore',
      icon: 'fa-magnifying-glass',
      disabled: false,
    },
    {
      path: '/create',
      label: 'Create',
      icon: 'fa-plus',
      disabled: false,
    },
  ]

  // Auth-dependent nav items (only shown when authenticated)
  const authNavItems: NavItem[] = isAuthenticated
    ? [
        {
          path: '/notifications',
          label: 'Notifications',
          icon: 'fa-bell',
          disabled: false,
        },
        {
          path: profilePath,
          label: 'Profile',
          icon: 'fa-user',
          disabled: false,
        },
        ...(canModerate
          ? [
              {
                path: '/admin',
                label: 'Admin',
                icon: 'fa-shield-halved',
                disabled: false,
              },
            ]
          : []),
      ]
    : []

  const navItems = [...baseNavItems, ...authNavItems]

  // Show skeleton for Profile when auth is loading
  const showProfileSkeleton = !isReady

  const renderIcon = (item: NavItem, isActive: boolean) => {
    const iconStyle = isActive ? 'fa-solid' : 'fa-regular'
    const isProfile = item.path.startsWith('/profile')
    const sizeClasses = 'w-6 h-6'

    if (isProfile && profileAvatar) {
      return (
        <span
          className={`${sizeClasses} rounded-full overflow-hidden bg-muted/60 flex items-center justify-center`}
        >
          <img src={profileAvatar} alt="Profile avatar" className="w-full h-full object-cover" loading="lazy" />
        </span>
      )
    }

    return (
      <span className={`${sizeClasses} grid place-items-center`}>
        <i className={`${iconStyle} ${item.icon} text-xl`} aria-hidden="true" />
      </span>
    )
  }

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-r lg:bg-background lg:z-30">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center h-16 px-3">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 hover:bg-transparent!"
            onClick={(e) => {
              // If already on home page, scroll to top and refresh
              if (location.pathname === '/') {
                e.preventDefault()
                triggerFeedRefresh()
              }
            }}
          >
            <span className="w-6 h-6 grid place-items-center ml-0.5">
              <Logo
                size={15}
                className="text-foreground"
              />
            </span>
            <span className="text-xl font-extrabold -ml-0.5">Desperse</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === item.path
                : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
            const isDisabled = item.disabled

            if (isDisabled) {
              return (
                <button
                  key={item.path}
                  disabled
                  className="flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-lg text-foreground opacity-50 cursor-not-allowed transition-colors"
                  aria-label={`${item.label} (coming soon)`}
                >
                  {renderIcon(item, false)}
                  <span className="text-sm font-medium leading-none pt-1">{item.label}</span>
                </button>
              )
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-lg hover-fade text-foreground hover:bg-accent hover:text-accent-foreground ${
                  isActive ? 'font-semibold' : 'font-medium'
                }`}
                aria-label={item.label}
                onClick={(e) => {
                  // If clicking Home while already on home page, scroll to top and refresh
                  if (item.path === '/' && location.pathname === '/') {
                    e.preventDefault()
                    triggerFeedRefresh()
                    return
                  }
                  // If clicking Explore while already on explore page, scroll to top
                  if (item.path === '/explore' && location.pathname === '/explore') {
                    e.preventDefault()
                    smoothScrollTo()
                    return
                  }
                  if (!isAuthenticated && item.path === '/create') {
                    e.preventDefault()
                    login()
                  }
                }}
              >
                <span className="relative">
                  {renderIcon(item, isActive)}
                  {item.path === '/notifications' && unreadNotificationsCount !== undefined && unreadNotificationsCount > 0 && (
                    <NotificationBadge variant="destructive" size="dot" className="absolute -top-0.5 -right-0.5" />
                  )}
                </span>
                <span className="text-sm leading-none">{item.label}</span>
                {item.path === '/admin' && adminBadgeCount > 0 && (
                  <NotificationBadge variant="destructive" count={adminBadgeCount} className="ml-auto" />
                )}
              </Link>
            )
          })}
          {/* Show skeleton for Profile link while auth is loading */}
          {showProfileSkeleton && <NavItemSkeleton />}
        </nav>

        {/* Wallets, Settings and Login - anchored to bottom */}
        <div className="py-4 border-t border-border/50 space-y-1">
          {!isReady ? (
            <AuthButtonSkeleton />
          ) : isAuthenticated ? (
            <Wallets />
          ) : (
            <button
              onClick={() => login()}
              className="flex items-center gap-3 px-3 py-2.5 mx-3 w-[calc(100%-1.5rem)] text-left rounded-lg hover-fade text-foreground hover:bg-accent hover:text-accent-foreground"
              aria-label="Log in or Sign up"
            >
              <span className="w-6 h-6 grid place-items-center">
                <i className="fa-regular fa-right-to-bracket text-xl" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium leading-none">Log in or Sign up</span>
            </button>
          )}
          <MoreMenu />
        </div>
      </div>
    </aside>
  )
}

