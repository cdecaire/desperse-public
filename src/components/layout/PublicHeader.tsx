import { Link } from '@tanstack/react-router'
import { usePrivy } from '@privy-io/react-auth'
import { useTheme } from '@/components/providers/ThemeProvider'
import { Switch } from '@/components/ui/switch'
import { Logo } from '@/components/shared/Logo'
import { Icon } from '@/components/ui/icon'
import { useAuthRecoveryMessage } from '@/hooks/useAuthRecoveryMessage'

interface PublicHeaderProps {
  /** Optional nav links rendered between the logo and the right-side controls. */
  navItems?: Array<{ label: string; href: string; external?: boolean }>
}

/**
 * Header for standalone public pages (/preservation, etc.).
 *
 * Provides logo + theme toggle + Privy login. Authenticated users get a
 * "Go to Feed" link instead of the login button. Distinct from the landing
 * page Header which carries marketing-specific anchor nav.
 */
export function PublicHeader({ navItems }: PublicHeaderProps) {
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
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center bg-background/80 backdrop-blur-md border-b border-border/50"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
    >
      <Link to="/" className="flex-1 flex items-center space-x-2 hover:opacity-80 transition-opacity">
        <Logo size={15} className="text-foreground" />
        <span className="text-xl font-extrabold">Desperse</span>
      </Link>

      {navItems && navItems.length > 0 && (
        <nav className="hidden md:flex gap-8 text-sm font-medium">
          {navItems.map((item) =>
            item.external ? (
              <a
                key={item.href}
                href={item.href}
                className="hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.href}
                to={item.href}
                className="hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors"
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>
      )}

      <div className="flex-1 flex items-center justify-end gap-4">
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
            className="border border-zinc-300 dark:border-zinc-700 px-5 py-2 rounded-full text-sm font-medium hover:bg-zinc-950 hover:text-white dark:hover:bg-white dark:hover:text-zinc-950 transition-colors duration-200"
          >
            Go to Feed
          </Link>
        ) : (
          <button
            onClick={() => login()}
            disabled={!ready}
            className="border border-zinc-300 dark:border-zinc-700 px-5 py-2 rounded-full text-sm font-medium hover:bg-zinc-950 hover:text-white dark:hover:bg-white dark:hover:text-zinc-950 transition-colors duration-200 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-white"
          >
            {recoveryMessage ? 'Retry sign in' : 'Log in'}
          </button>
        )}
      </div>
    </header>
  )
}
