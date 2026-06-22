import { Link, useLocation } from '@tanstack/react-router'
import { Icon } from '@/components/ui/icon'

type SettingsNavVariant = 'desktop' | 'mobile'

interface SettingsNavProps {
  variant?: SettingsNavVariant
}

export interface SettingsNavItem {
  path: string
  label: string
  icon: string
  description: string
  disabled?: boolean
}

export interface SettingsNavCategory {
  title: string
  items: SettingsNavItem[]
}

/**
 * Single source of truth for all settings navigation items.
 * Used by: desktop sidebar, mobile index page, mobile detail headers.
 */
export const settingsCategories: SettingsNavCategory[] = [
  {
    title: 'Account',
    items: [
      {
        path: '/settings/account/profile-info',
        label: 'Profile Info',
        icon: 'fa-user',
        description: 'Update your profile and username',
      },
      {
        path: '/settings/account/wallets',
        label: 'Wallets & Linked',
        icon: 'fa-wallet',
        description: 'Manage connected wallets and accounts',
      },
      {
        path: '/settings/account/notifications',
        label: 'Notifications',
        icon: 'fa-bell',
        description: 'Choose which notifications to receive',
      },
      {
        path: '/settings/account/messaging',
        label: 'Messaging',
        icon: 'fa-message',
        description: 'Control who can message you',
      },
      {
        path: '/settings/account/security',
        label: 'Security',
        icon: 'fa-shield',
        description: 'Password and security settings',
      },
      {
        path: '/settings/account/storage-credits',
        label: 'Storage Credits',
        icon: 'fa-hard-drive',
        description: 'Manage Arweave storage credits and authorizations',
      },
      {
        path: '/settings/account/copyright',
        label: 'Copyright & Licensing',
        icon: 'fa-copyright',
        description: 'Set default license and copyright for your posts',
      },
      {
        path: '/settings/account/app',
        label: 'App Settings',
        icon: 'fa-gear',
        description: 'Preferences and app configuration',
      },
      {
        path: '/settings/account/blocked-users',
        label: 'Blocked Accounts',
        icon: 'fa-ban',
        description: 'See and unblock people you have blocked',
      },
    ],
  },
  {
    title: 'General',
    items: [
      {
        path: '/settings/help',
        label: 'Help & About',
        icon: 'fa-circle-info',
        description: 'Learn more and get support',
      },
    ],
  },
]

/** Flat lookup of path → label for mobile headers */
export const settingsRouteTitles: Record<string, string> = Object.fromEntries(
  settingsCategories.flatMap((cat) => cat.items.map((item) => [item.path, item.label]))
)

export function SettingsNav({ variant = 'desktop' }: SettingsNavProps) {
  const location = useLocation()

  const renderNavItem = (item: SettingsNavItem) => {
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
          <span className="text-title-sm leading-none">{item.label}</span>
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
        <span className="text-title-sm leading-none">{item.label}</span>
      </Link>
    )
  }

  const navPadding =
    variant === 'desktop' ? 'px-3 py-4 space-y-1' : 'px-1 py-2 space-y-1'

  return (
    <div className="flex flex-col">
      {variant === 'desktop' ? (
        <div className="px-3 pb-4">
          <span className="text-heading-3">Account</span>
        </div>
      ) : (
        <div className="px-1 pb-2">
          <div className="text-title-sm text-foreground">Account</div>
        </div>
      )}
      <nav className={`flex flex-col ${navPadding}`}>
        {settingsCategories[0].items.map(renderNavItem)}

        <div className="border-t border-border/50 my-2" />

        {variant === 'desktop' && (
          <div className="px-3 py-2">
            <span className="text-label-xs text-muted-foreground">
              General
            </span>
          </div>
        )}

        {settingsCategories.slice(1).flatMap((cat) => cat.items).map(renderNavItem)}
      </nav>
    </div>
  )
}

export default SettingsNav
