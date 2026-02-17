import { Link, useLocation } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import MoreMenu from './MoreMenu'
import { useAuth } from '../../hooks/useAuth'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useNotificationCounters } from '../../hooks/useNotificationCounters'
import { triggerFeedRefresh, smoothScrollTo } from '../../hooks/useFeedRefresh'
import { useScrollHideNav } from '../../hooks/useScrollHideNav'
import { NotificationBadge } from '../ui/notification-badge'

// Determine if a path is a top-level page (shows bottom nav)
function isTopLevelPage(pathname: string): boolean {
  // Home
  if (pathname === '/') return true
  // Explore
  if (pathname === '/explore') return true
  // Notifications
  if (pathname === '/notifications') return true
  // Profile pages (but not settings)
  if (pathname.startsWith('/profile')) return true
  // Admin pages (index and moderation list, but NOT individual report details)
  if (pathname === '/admin' || pathname === '/admin/moderation' || pathname === '/admin/feedback') return true

  return false
}

export default function BottomNav() {
  const location = useLocation()
  const { avatarUrl: authAvatarUrl, isAuthenticated, login } = useAuth()
  const isScrollHidden = useScrollHideNav()
  const isTopLevel = isTopLevelPage(location.pathname)
  const { user: currentUser } = useCurrentUser()

  // Check if at tablet breakpoint (md to lg: 768px-1024px)
  // At this size, main sidebar is hidden but settings sidebar shows - need bottom nav for main navigation
  const [isTablet, setIsTablet] = useState(false)
  useEffect(() => {
    const checkTablet = () => {
      const width = window.innerWidth
      setIsTablet(width >= 768 && width < 1024)
    }
    checkTablet()
    window.addEventListener('resize', checkTablet)
    return () => window.removeEventListener('resize', checkTablet)
  }, [])

  // Settings/admin pages need bottom nav at tablet (no main sidebar at that breakpoint)
  const isSettingsOrAdmin = location.pathname.startsWith('/settings') || location.pathname.startsWith('/admin')
  const showForSettingsAtTablet = isSettingsOrAdmin && isTablet

  // Hide completely on secondary pages, unless it's settings/admin at tablet
  const isHidden = isScrollHidden || (!isTopLevel && !showForSettingsAtTablet)
  const profileAvatar = currentUser?.avatarUrl || authAvatarUrl
  const profilePath = currentUser?.usernameSlug ? `/profile/${currentUser.usernameSlug}` : '/profile'

  // Check if user is moderator/admin
  const canModerate = currentUser?.role === 'moderator' || currentUser?.role === 'admin'

  // Get notification counters (includes unreviewed reports count and unread notifications)
  const { data: notificationCounters } = useNotificationCounters()
  const adminBadgeCount = (notificationCounters?.unreviewedReportsCount ?? 0) + (notificationCounters?.newFeedbackCount ?? 0)
  const unreadNotificationsCount = notificationCounters?.unreadNotificationsCount

  // Icon names without style prefix - style is applied based on active state
  const navItems = [
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
    ...(isAuthenticated
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
      : []),
  ]

  const renderIcon = (item: { path: string; icon: string }, isActive: boolean) => {
    const iconStyle = isActive ? 'fa-solid' : 'fa-regular'
    const isProfile = item.path.startsWith('/profile')
    const isAdmin = item.path === '/admin'
    const isNotifications = item.path === '/notifications'
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
      <span className={`${sizeClasses} grid place-items-center relative`}>
        <i className={`${iconStyle} ${item.icon} text-xl`} aria-hidden="true" />
        {isNotifications && unreadNotificationsCount !== undefined && unreadNotificationsCount > 0 && (
          <NotificationBadge variant="destructive" size="dot" className="absolute -top-0.5 -right-0.5" />
        )}
        {isAdmin && adminBadgeCount > 0 && (
          <NotificationBadge variant="destructive" size="sm" count={adminBadgeCount} className="absolute -top-1 -right-1" />
        )}
      </span>
    )
  }

  return (
    <nav
      className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm transition-transform duration-200 ${
        isHidden ? 'translate-y-full' : 'translate-y-0'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-14 px-2">
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
                className="flex items-center justify-center text-foreground opacity-50 cursor-not-allowed min-w-[44px] min-h-[44px]"
                aria-label={`${item.label} (coming soon)`}
              >
                {renderIcon(item, false)}
              </button>
            )
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center justify-center rounded-lg transition-colors min-w-[44px] min-h-[44px] text-foreground"
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
              {renderIcon(item, isActive)}
            </Link>
          )
        })}
        
        {/* More */}
        <MoreMenu variant="bottomnav" />
      </div>
    </nav>
  )
}

