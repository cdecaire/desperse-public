import { Link, useLocation } from '@tanstack/react-router'
import { Icon } from '@/components/ui/icon'

type SettingsNavVariant = 'desktop' | 'mobile'

interface SettingsNavProps {
  variant?: SettingsNavVariant
}

const accountNavItems = [
  {
    path: '/settings/account/profile-info',
    label: 'Profile Info',
    icon: 'fa-user',
    disabled: false,
  },
  {
    path: '/settings/account/wallets',
    label: 'Wallets & Linked',
    icon: 'fa-wallet',
    disabled: false,
  },
  {
    path: '/settings/account/security',
    label: 'Security',
    icon: 'fa-shield',
    disabled: false,
  },
  {
    path: '/settings/account/messaging',
    label: 'Messaging',
    icon: 'fa-message',
    disabled: false,
  },
  {
    path: '/settings/account/notifications',
    label: 'Notifications',
    icon: 'fa-bell',
    disabled: false,
  },
  {
    path: '/settings/account/app',
    label: 'App Settings',
    icon: 'fa-gear',
    disabled: false,
  },
]

const generalNavItems = [
  {
    path: '/settings/help',
    label: 'Help',
    icon: 'fa-circle-info',
    disabled: false,
  },
]

export function SettingsNav({ variant = 'desktop' }: SettingsNavProps) {
  const location = useLocation()

  const header =
    variant === 'desktop' ? (
      <div className="flex items-center h-16 px-6">
        <span className="text-xl font-bold">Account</span>
      </div>
    ) : (
      <div className="px-1 pb-2">
        <div className="text-sm font-semibold text-foreground">Account</div>
      </div>
    )

  const navPadding =
    variant === 'desktop' ? 'px-3 py-4 space-y-1' : 'px-1 py-2 space-y-1'

  const renderNavItem = (item: typeof accountNavItems[0]) => {
    const isActive =
      location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)

    if (item.disabled) {
      return (
        <button
          key={item.path}
          disabled
          className="flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-lg text-muted-foreground opacity-50 cursor-not-allowed transition-colors"
          aria-label={`${item.label} (coming soon)`}
        >
          <span className="w-6 h-6 grid place-items-center">
            <Icon name={item.icon} variant="regular" className="text-xl" />
          </span>
          <span className="text-sm font-medium leading-none">{item.label}</span>
        </button>
      )
    }

    return (
      <Link
        key={item.path}
        to={item.path}
        className={`flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-lg transition-colors ${
          isActive
            ? 'text-foreground font-medium hover:bg-accent hover:text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }`}
      >
        <span className="w-6 h-6 grid place-items-center">
          <Icon name={item.icon} variant={isActive ? "solid" : "regular"} className="text-xl" />
        </span>
        <span className="text-sm font-medium leading-none">{item.label}</span>
      </Link>
    )
  }

  return (
    <div className="flex flex-col">
      {header}
      <nav className={`flex flex-col ${navPadding}`}>
        {accountNavItems.map(renderNavItem)}
        
        <div className="border-t border-border/50 my-2" />
        
        {variant === 'desktop' && (
          <div className="px-3 py-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              General
            </span>
          </div>
        )}
        
        {generalNavItems.map(renderNavItem)}
      </nav>
    </div>
  )
}

export default SettingsNav

