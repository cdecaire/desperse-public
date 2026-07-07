import { Link, useLocation } from '@tanstack/react-router'
import { SideNav, SideNavItem } from '@cdecaire/sable'
import { Icon } from '@/components/ui/icon'
import { NotificationBadge } from '@/components/ui/notification-badge'
import { useNotificationCounters } from '@/hooks/useNotificationCounters'

type AdminNavVariant = 'desktop' | 'mobile'

interface AdminNavProps {
  variant?: AdminNavVariant
}

const adminNavItems = [
  {
    path: '/admin/moderation',
    label: 'Content Moderation',
    description: 'Review reported content and take action',
    icon: 'fa-flag',
    badgeKey: 'unreviewedReportsCount' as const,
    disabled: false,
  },
  {
    path: '/admin/feedback',
    label: 'Beta Feedback',
    description: 'View user feedback and suggestions',
    icon: 'fa-message-lines',
    badgeKey: 'newFeedbackCount' as const,
    disabled: false,
  },
]

export function AdminNav({ variant = 'desktop' }: AdminNavProps) {
  const location = useLocation()
  const { data: notificationCounters } = useNotificationCounters()

  // Desktop variant
  if (variant === 'desktop') {
    return (
      <SideNav aria-label="Admin" size="lg">
        {/* Primary section title — matches SettingsNav (text-heading-3, top-aligned
            pt-4 in an h-16 zone + mb-4) so the rail aligns with the app Sidebar's
            logo, the page title, and the Sidebar's first item ("Home"). */}
        <h2 className="h-16 px-3 pt-4 text-heading-3 mb-4">Admin</h2>
        <div className="flex flex-col gap-1">
          {adminNavItems.map((item) => {
            const isActive =
              location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
            const badgeCount = notificationCounters?.[item.badgeKey] ?? 0

            return (
              <SideNavItem
                key={item.path}
                label={item.label}
                icon={<Icon name={item.icon} variant={isActive ? "solid" : "regular"} />}
                active={isActive}
                badge={
                  badgeCount > 0 ? (
                    <NotificationBadge variant="destructive" count={badgeCount} />
                  ) : undefined
                }
                render={<Link to={item.path} />}
              />
            )
          })}
        </div>
      </SideNav>
    )
  }

  // Mobile variant - matches settings design
  return (
    <div className="divide-y divide-border/80">
      <div className="pb-4">
        <nav className="space-y-1">
          {adminNavItems.map((item) => {
            const isActive =
              location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
            const badgeCount = notificationCounters?.[item.badgeKey] ?? 0

            return (
              <Link
                key={item.path}
                to={item.path}
                data-active={isActive ? '' : undefined}
                className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg hover-fade ${
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span className="w-6 h-6 grid place-items-center shrink-0">
                  <Icon name={item.icon} variant={isActive ? "solid" : "regular"} className="text-xl" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-none">
                    {item.label}
                  </div>
                  <div
                    className={`text-xs mt-1 leading-tight ${
                      isActive ? 'text-accent-foreground/70' : 'text-muted-foreground'
                    }`}
                  >
                    {item.description}
                  </div>
                </div>
                {badgeCount > 0 && (
                  <NotificationBadge variant="destructive" count={badgeCount} />
                )}
                <Icon
                  name="chevron-right"
                  variant="regular"
                  className={`text-sm ${
                    isActive ? 'text-accent-foreground/70' : 'text-muted-foreground'
                  }`}
                />
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

export default AdminNav
