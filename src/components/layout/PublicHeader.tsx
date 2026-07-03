import { Link } from '@tanstack/react-router'
import { usePrivy } from '@privy-io/react-auth'
import { Row } from '@cdecaire/sable/layout'
import { useTheme } from '@/components/providers/ThemeProvider'
import { Switch } from '@/components/ui/switch'
import { Logo } from '@/components/shared/Logo'
import { Icon } from '@/components/ui/icon'
import { useAuthRecoveryMessage } from '@/hooks/useAuthRecoveryMessage'

interface PublicHeaderProps {
  /** Optional nav links rendered between the logo and the right-side controls. */
  navItems?: Array<{ label: string; href: string; external?: boolean }>
  /**
   * `fixed` overlays the viewport (standalone pages that pad their own top).
   * `sticky` sits in normal flow — for the AppShell header slot, where content
   * flows below it without a spacer.
   */
  position?: 'fixed' | 'sticky'
}

/**
 * Canonical nav for public/standalone pages (home gallery, about, static
 * pages). One shared list so the header doesn't jump between pages — the
 * current page renders in the active style.
 */
export const PUBLIC_NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Explore', href: '/explore' },
  { label: 'About', href: '/about' },
]

/**
 * Header for standalone public pages (/preservation, etc.).
 *
 * Provides logo + theme toggle + Privy login. Authenticated users get a
 * "Go to Feed" link instead of the login button. Distinct from the landing
 * page Header which carries marketing-specific anchor nav.
 */
export function PublicHeader({ navItems, position = 'fixed' }: PublicHeaderProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { login, ready, authenticated } = usePrivy()
  const recoveryMessage = useAuthRecoveryMessage(authenticated)
  const isSystemTheme = theme === 'system' || theme === undefined
  const activeTheme = isSystemTheme ? resolvedTheme || 'dark' : theme

  const handleThemeToggle = () => {
    if (isSystemTheme) {
      setTheme(activeTheme === 'dark' ? 'light' : 'dark')
    } else {
      setTheme(theme === 'dark' ? 'light' : 'dark')
    }
  }

  return (
    <header
      className={`${
        position === 'fixed' ? 'fixed left-0 right-0' : 'sticky'
      } top-0 z-(--z-nav) px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border/50`}
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
    >
      <Row align="center">
      <Link to="/" className="flex-1 flex items-center space-x-2 hover:opacity-80 transition-opacity">
        <Logo size={15} className="text-foreground" />
        {/* Wordmark yields below md so the nav links fit beside the controls. */}
        <span className="hidden md:inline text-xl font-extrabold">Desperse</span>
      </Link>

      {navItems && navItems.length > 0 && (
        <nav className="flex gap-4 md:gap-8 text-sm font-medium">
          {navItems.map((item) =>
            item.external ? (
              <a
                key={item.href}
                href={item.href}
                className="text-muted-foreground hover:text-foreground motion-interactive"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.href}
                to={item.href}
                className="text-muted-foreground hover:text-foreground motion-interactive"
                activeOptions={{ exact: item.href === '/' }}
                activeProps={{ className: 'text-foreground font-semibold' }}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>
      )}

      <div className="flex-1 flex items-center justify-end gap-2 md:gap-4">
        {recoveryMessage && !authenticated && (
          <p className="hidden max-w-xs text-right text-body-sm text-(--tone-warning) md:block">
            {recoveryMessage}
          </p>
        )}
        <label className="flex items-center gap-2 min-h-10 cursor-pointer">
          <Icon name={activeTheme === 'light' ? 'sun-bright' : 'moon'} variant="regular" className="text-sm" />
          <Switch
            checked={activeTheme === 'dark'}
            onCheckedChange={handleThemeToggle}
            aria-label={`Switch to ${activeTheme === 'dark' ? 'light' : 'dark'} theme`}
          />
        </label>
        {authenticated ? (
          <Link
            to="/"
            className="border border-zinc-300 dark:border-zinc-700 px-5 py-2 rounded-full text-sm font-medium hover:bg-zinc-950 hover:text-white dark:hover:bg-white dark:hover:text-zinc-950 motion-interactive"
          >
            Go to Feed
          </Link>
        ) : (
          <button
            onClick={() => login()}
            disabled={!ready}
            className="border border-zinc-300 dark:border-zinc-700 px-5 py-2 rounded-full text-sm font-medium hover:bg-zinc-950 hover:text-white dark:hover:bg-white dark:hover:text-zinc-950 motion-interactive disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-white"
          >
            {recoveryMessage ? 'Retry sign in' : 'Log in'}
          </button>
        )}
      </div>
      </Row>
    </header>
  )
}
