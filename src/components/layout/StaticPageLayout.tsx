/**
 * Static Page Layout
 * Shared layout for static pages (privacy, terms, fees)
 * Includes header (no nav) and footer, consistent with landing page
 */

import { Link } from '@tanstack/react-router'
import { usePrivy } from '@privy-io/react-auth'
import { Icon } from '@/components/ui/icon'
import { useTheme } from '@/components/providers/ThemeProvider'
import { Switch } from '@/components/ui/switch'
import { Logo } from '@/components/shared/Logo'
import { Footer } from '@/components/landing/LandingPage'

interface StaticPageLayoutProps {
  children: React.ReactNode
}

// Header Component (no nav links)
function Header() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { login, ready, authenticated } = usePrivy()
  const isSystemTheme = theme === 'system' || theme === undefined
  const activeTheme = isSystemTheme ? (resolvedTheme || 'dark') : theme

  const handleThemeToggle = () => {
    if (isSystemTheme) {
      setTheme(activeTheme === 'dark' ? 'light' : 'dark')
    } else {
      setTheme(theme === 'dark' ? 'light' : 'dark')
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center bg-background/80 backdrop-blur-md border-b border-border/50">
      <Link to="/" className="flex-1 flex items-center space-x-2 hover:opacity-80 transition-opacity">
        <Logo size={15} className="text-foreground" />
        <span className="text-xl font-extrabold">Desperse</span>
      </Link>
      <div className="flex-1 flex items-center justify-end gap-4">
        <div className="flex items-center gap-2">
          <Icon name={activeTheme === 'light' ? 'sun-bright' : 'moon'} variant="regular" className="text-sm" />
          <Switch
            checked={activeTheme === 'dark'}
            onCheckedChange={handleThemeToggle}
            aria-label={`Switch to ${activeTheme === 'dark' ? 'light' : 'dark'} theme`}
            className="scale-75"
          />
        </div>
        {!authenticated && (
          <button
            onClick={() => login()}
            disabled={!ready}
            className="border border-zinc-300 dark:border-zinc-700 px-5 py-2 rounded-full text-sm font-medium hover:bg-zinc-950 hover:text-white dark:hover:bg-white dark:hover:text-zinc-950 transition-all duration-300 disabled:opacity-50"
          >
            Log in or Sign up
          </button>
        )}
      </div>
    </header>
  )
}

export function StaticPageLayout({ children }: StaticPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-zinc-950 dark:text-zinc-50 flex flex-col">
      <Header />
      <main className="flex-1 pt-32 pb-20 md:pt-40 md:pb-24">
        <div className="max-w-3xl mx-auto px-4">
          {children}
        </div>
      </main>
      <Footer showCta={false} />
    </div>
  )
}

export default StaticPageLayout
