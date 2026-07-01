import { Link, useLocation } from '@tanstack/react-router'
import { SideNav, SideNavItem } from '@cdecaire/sable'
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

export function SettingsNav(_props: SettingsNavProps) {
  const location = useLocation()

  return (
    <SideNav aria-label="Settings" size="lg">
      {settingsCategories.map((category, index) => (
        <div key={category.title} className="flex flex-col gap-1">
          {index === 0 ? (
            // Primary section title — matches the Desperse PageHeader exactly:
            // text-heading-3 (the page's "Profile Info" title size — NOT Sable's
            // heading-2), top-aligned at pt-4 below the same row top, so the two
            // share an EXACT size + baseline across the divider. The h-16 zone
            // height mirrors the Sidebar's logo header and mb-4 reproduces
            // SidebarNav's py-4, so the first nav item lines up with "Home".
            <h2 className="h-16 px-3 pt-4 text-heading-3 mb-4">{category.title}</h2>
          ) : (
            <h2 className="px-3 pt-4 pb-1 text-label-xs text-muted-foreground">
              {category.title}
            </h2>
          )}
          {category.items.map((item) => {
            const isActive =
              location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)

            return (
              <SideNavItem
                key={item.path}
                label={item.label}
                icon={<Icon name={item.icon} variant={isActive ? "solid" : "regular"} />}
                active={isActive}
                render={<Link to={item.path} />}
              />
            )
          })}
        </div>
      ))}
    </SideNav>
  )
}

export default SettingsNav
