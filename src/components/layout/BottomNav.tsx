import { Link, useLocation } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { BottomNav as SableBottomNav, BottomNavItem } from '@cdecaire/sable'
import MoreMenu from './MoreMenu'
import { Icon } from '@/components/ui/icon'
import { useAuth } from '../../hooks/useAuth'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useNotificationCounters } from '../../hooks/useNotificationCounters'
import { triggerFeedRefresh, smoothScrollTo } from '../../hooks/useFeedRefresh'
import { useScrollHideNav } from '../../hooks/useScrollHideNav'
import { NotificationBadge } from '../ui/notification-badge'

// Determine if a path is a top-level page (shows bottom nav)
function isTopLevelPage(pathname: string): boolean {
  if (pathname === '/') return true
  if (pathname === '/explore') return true
  if (pathname === '/leaderboard') return true
  if (pathname === '/notifications') return true
  if (pathname.startsWith('/profile')) return true
  if (pathname === '/admin' || pathname === '/admin/moderation' || pathname === '/admin/feedback') return true
  return false
}

export default function BottomNav() {
  const location = useLocation()
  const { avatarUrl: authAvatarUrl, isAuthenticated, login } = useAuth()
  const isScrollHidden = useScrollHideNav()
  const isTopLevel = isTopLevelPage(location.pathname)
  const { user: currentUser } = useCurrentUser()

  // At tablet (768-1024px) the main sidebar is hidden but the settings sidebar
  // shows — bottom nav is still needed for primary navigation there.
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

  const isSettingsOrAdmin = location.pathname.startsWith('/settings') || location.pathname.startsWith('/admin')
  const showForSettingsAtTablet = isSettingsOrAdmin && isTablet
  const isHidden = isScrollHidden || (!isTopLevel && !showForSettingsAtTablet)

  const profileAvatar = currentUser?.avatarUrl || authAvatarUrl
  const profilePath = currentUser?.usernameSlug ? `/profile/${currentUser.usernameSlug}` : '/profile'
  const canModerate = currentUser?.role === 'moderator' || currentUser?.role === 'admin'

  const { data: notificationCounters } = useNotificationCounters()
  const adminBadgeCount = (notificationCounters?.unreviewedReportsCount ?? 0) + (notificationCounters?.newFeedbackCount ?? 0)
  const unreadNotificationsCount = notificationCounters?.unreadNotificationsCount

  const navItems = [
    { path: '/', label: 'Home', icon: 'fa-house' },
    { path: '/explore', label: 'Explore', icon: 'fa-magnifying-glass' },
    ...(isAuthenticated
      ? [
          { path: '/notifications', label: 'Notifications', icon: 'fa-bell' },
          { path: profilePath, label: 'Profile', icon: 'fa-user' },
          ...(canModerate ? [{ path: '/admin', label: 'Admin', icon: 'fa-shield-halved' }] : []),
        ]
      : []),
  ]

  const renderIcon = (item: { path: string; icon: string }, isActive: boolean) => {
    const isProfile = item.path.startsWith('/profile')
    if (isProfile && profileAvatar) {
      return (
        <span className="w-6 h-6 rounded-full overflow-hidden bg-muted/60 flex items-center justify-center">
          <img src={profileAvatar} alt="Profile avatar" className="w-full h-full object-cover" loading="lazy" />
        </span>
      )
    }
    return <Icon name={item.icon} variant={isActive ? 'solid' : 'regular'} className="text-xl" />
  }

  return (
    <SableBottomNav
      className={`transition-transform duration-200 ${isHidden ? 'translate-y-full' : 'translate-y-0'}`}
    >
      {navItems.map((item) => {
        const isActive =
          item.path === '/'
            ? location.pathname === item.path
            : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
        const isNotifications = item.path === '/notifications'
        const isAdmin = item.path === '/admin'
        const badge =
          isNotifications && unreadNotificationsCount !== undefined && unreadNotificationsCount > 0 ? (
            <NotificationBadge variant="destructive" size="dot" />
          ) : isAdmin && adminBadgeCount > 0 ? (
            <NotificationBadge variant="destructive" size="sm" count={adminBadgeCount} />
          ) : undefined

        return (
          <BottomNavItem
            key={item.path}
            label={item.label}
            active={isActive}
            icon={renderIcon(item, isActive)}
            badge={badge}
            render={
              <Link
                to={item.path}
                onClick={(e) => {
                  if (item.path === '/' && location.pathname === '/') {
                    e.preventDefault()
                    triggerFeedRefresh()
                    return
                  }
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
              />
            }
          />
        )
      })}

      <MoreMenu variant="bottomnav" />
    </SableBottomNav>
  )
}
