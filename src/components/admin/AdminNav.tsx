import { Link, useLocation } from '@tanstack/react-router'
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
      <div className="flex flex-col">
        <div className="flex items-center h-16 px-6">
          <span className="text-xl font-bold">Admin</span>
        </div>
        <nav className="flex flex-col px-3 py-4 space-y-1">
          {adminNavItems.map((item) => {
            const isActive =
              location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
            const iconStyle = isActive ? 'fa-solid' : 'fa-regular'

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-lg hover-fade ${
                  isActive
                    ? 'text-foreground font-medium hover:bg-accent hover:text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <span className="w-6 h-6 grid place-items-center">
                  <i className={`${iconStyle} ${item.icon} text-xl`} aria-hidden="true" />
                </span>
                <span className="text-sm font-medium leading-none">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
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
                className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg hover-fade ${
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <span className="w-6 h-6 grid place-items-center shrink-0">
                  <i
                    className={`${isActive ? 'fa-solid' : 'fa-regular'} ${item.icon} text-xl`}
                    aria-hidden="true"
                  />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-none">
                    {item.label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 leading-tight">
                    {item.description}
                  </div>
                </div>
                {badgeCount > 0 && (
                  <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold bg-destructive text-destructive-foreground">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
                <i
                  className="fa-regular fa-chevron-right text-muted-foreground text-sm"
                  aria-hidden="true"
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
