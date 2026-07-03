import { Link, useLocation } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import {
  Sidebar as SableSidebar,
  SidebarHeader,
  SidebarNav,
  SidebarFooter,
  SidebarItem,
} from '@cdecaire/sable'
import MoreMenu from './MoreMenu'
import Wallets from './Wallets'
import { Logo } from '../shared/Logo'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

const COLLAPSE_KEY = 'desperse:sidebar-collapsed'

// Force every collapsed row's icon to stay left-anchored (instead of Sable's
// justify-center) so it never moves horizontally during the width transition.
// Every row's icon centre sits at 32px (nav/footer px-3 + item px-3 + half a
// size-6 icon); the collapsed rail is 64px so that 32px IS the centre — zero
// pixel shift on toggle, and perfectly centred when collapsed.
const ITEM_ANCHOR = 'justify-start px-3'
import { useAuth } from '../../hooks/useAuth'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useNotificationCounters } from '../../hooks/useNotificationCounters'
import { triggerFeedRefresh, smoothScrollTo } from '../../hooks/useFeedRefresh'
import { NotificationBadge } from '../ui/notification-badge'

// Skeleton for auth button while Privy initializes
function AuthButtonSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 w-full">
      <div className="w-6 h-6 rounded-full bg-muted motion-pulse" />
      <div className="h-4 w-24 rounded bg-muted motion-pulse" />
    </div>
  )
}

// Skeleton for nav items while auth initializes
function NavItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 w-full">
      <div className="w-6 h-6 rounded-full bg-muted motion-pulse" />
      <div className="h-4 w-16 rounded bg-muted motion-pulse" />
    </div>
  )
}

type NavItem = { path: string; label: string; icon: string }

export default function Sidebar() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  })
  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0') } catch { /* ignore */ }
      return next
    })
  }, [])
  const { avatarUrl: authAvatarUrl, isAuthenticated, isReady, login } = useAuth()
  const { user: currentUser } = useCurrentUser()
  const profileAvatar = currentUser?.avatarUrl || authAvatarUrl
  const canModerate = currentUser?.role === 'moderator' || currentUser?.role === 'admin'

  const { data: notificationCounters } = useNotificationCounters()
  const adminBadgeCount = (notificationCounters?.unreviewedReportsCount ?? 0) + (notificationCounters?.newFeedbackCount ?? 0)
  const unreadNotificationsCount = notificationCounters?.unreadNotificationsCount

  const profilePath = currentUser?.usernameSlug ? `/profile/${currentUser.usernameSlug}` : '/profile'

  const baseNavItems: NavItem[] = [
    { path: '/', label: 'Home', icon: 'fa-house' },
    { path: '/explore', label: 'Explore', icon: 'fa-magnifying-glass' },
    { path: '/create', label: 'Create', icon: 'fa-plus' },
  ]
  const authNavItems: NavItem[] = isAuthenticated
    ? [
        { path: '/notifications', label: 'Notifications', icon: 'fa-bell' },
        { path: profilePath, label: 'Profile', icon: 'fa-user' },
        ...(canModerate ? [{ path: '/admin', label: 'Admin', icon: 'fa-shield-halved' }] : []),
      ]
    : []
  const navItems = [...baseNavItems, ...authNavItems]

  const renderIcon = (item: NavItem, isActive: boolean) => {
    const isProfile = item.path.startsWith('/profile')
    if (isProfile && profileAvatar) {
      return (
        <span className="w-6 h-6 rounded-full overflow-hidden bg-muted/60 flex items-center justify-center">
          <img src={profileAvatar} alt={currentUser?.displayName ?? 'Your profile'} className="w-full h-full object-cover" loading="lazy" />
        </span>
      )
    }
    // Notifications carries a corner dot directly on the icon (distinct from the
    // admin row-end count badge).
    if (item.path === '/notifications') {
      return (
        <span className="relative grid place-items-center">
          <Icon name={item.icon} variant={isActive ? 'solid' : 'regular'} className="text-xl" />
          {unreadNotificationsCount !== undefined && unreadNotificationsCount > 0 && (
            <NotificationBadge variant="destructive" size="dot" className="absolute -top-0.5 -right-0.5" />
          )}
        </span>
      )
    }
    return <Icon name={item.icon} variant={isActive ? 'solid' : 'regular'} className="text-xl" />
  }

  return (
    <SableSidebar
      collapsed={collapsed}
      // 64px collapsed width (see ITEM_ANCHOR — explicit px, not rem, since the
      // desktop root font is 14px) + a width transition for a crisp, fluid
      // open/close. Icons stay put; only the rail width animates.
      className="[--sidebar-width-collapsed:64px] transition-[width] duration-200 ease-out motion-reduce:transition-none"
    >
      <SidebarHeader className="px-3">
        <Link
          to="/"
          aria-label="Desperse home"
          className="no-hover-bg flex items-center gap-3 px-3 hover:opacity-80 transition-opacity"
          onClick={(e) => {
            if (location.pathname === '/') {
              e.preventDefault()
              triggerFeedRefresh()
            }
          }}
        >
          {/* size-6 icon box, no ml offset — matches nav icon x so it doesn't
              shift when collapsing (px-3 + 12 = 32px = collapsed rail centre). */}
          <span className="grid size-6 shrink-0 place-items-center">
            <Logo size={15} className="text-foreground" />
          </span>
          {/* Wordmark stays mounted and fades/collapses its width so it eases
              out in sync with the rail instead of popping. */}
          <span
            aria-hidden={collapsed}
            className={cn(
              'text-xl font-extrabold whitespace-nowrap overflow-hidden transition-all duration-200 ease-out motion-reduce:transition-none',
              collapsed ? 'max-w-0 opacity-0' : 'max-w-[9rem] opacity-100',
            )}
          >
            Desperse
          </span>
        </Link>
      </SidebarHeader>

      <SidebarNav>
        {navItems.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === item.path
              : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
          return (
            <SidebarItem
              key={item.path}
              label={item.label}
              active={isActive}
              icon={renderIcon(item, isActive)}
              className={ITEM_ANCHOR}
              badge={
                item.path === '/admin' && adminBadgeCount > 0 ? (
                  <NotificationBadge variant="destructive" count={adminBadgeCount} />
                ) : undefined
              }
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
        {!isReady && <NavItemSkeleton />}
      </SidebarNav>

      <SidebarFooter>
        {!isReady ? (
          <AuthButtonSkeleton />
        ) : isAuthenticated ? (
          <Wallets />
        ) : (
          <SidebarItem
            label="Log in or Sign up"
            icon={<Icon name="right-to-bracket" variant="regular" className="text-xl" />}
            className={ITEM_ANCHOR}
            onClick={() => login()}
          />
        )}
        <MoreMenu />
        <SidebarItem
          label={collapsed ? 'Expand' : 'Collapse'}
          icon={
            <Icon
              name={collapsed ? 'chevron-right' : 'chevron-left'}
              variant="regular"
              className="text-xl"
            />
          }
          className={ITEM_ANCHOR}
          onClick={toggleCollapsed}
        />
      </SidebarFooter>
    </SableSidebar>
  )
}
