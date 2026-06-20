/**
 * Static Page Layout
 * Shared layout for static pages (privacy, terms, fees)
 * Includes header (no nav) and footer, consistent with landing page
 */

import { Link } from '@tanstack/react-router'
import { usePrivy } from '@privy-io/react-auth'
import { Center, Row, Stack } from '@cdecaire/sable/layout'
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
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border/50">
      <Row align="center">
        <Link to="/" className="flex-1 flex items-center space-x-2 hover:opacity-80 transition-opacity">
          <Logo size={15} className="text-foreground" />
          <span className="text-xl font-extrabold">Desperse</span>
        </Link>
        <Row align="center" justify="end" gap={2} className="flex-1">
          <Row align="center" gap={1}>
            <Icon name={activeTheme === 'light' ? 'sun-bright' : 'moon'} variant="regular" className="text-sm" />
            <Switch
              checked={activeTheme === 'dark'}
              onCheckedChange={handleThemeToggle}
              aria-label={`Switch to ${activeTheme === 'dark' ? 'light' : 'dark'} theme`}
              className="scale-75"
            />
          </Row>
          {!authenticated && (
            <button
              onClick={() => login()}
              disabled={!ready}
              className="border border-zinc-300 dark:border-zinc-700 px-5 py-2 rounded-full text-sm font-medium hover:bg-zinc-950 hover:text-white dark:hover:bg-white dark:hover:text-zinc-950 transition-all duration-300 disabled:opacity-50"
            >
              Log in or Sign up
            </button>
          )}
        </Row>
      </Row>
    </header>
  )
}

export function StaticPageLayout({ children }: StaticPageLayoutProps) {
  return (
    <Stack gap={0} className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-1 pt-32 pb-20 md:pt-40 md:pb-24">
        <Center max="prose" className="px-4">
          {children}
        </Center>
      </main>
      <Footer showCta={false} />
    </Stack>
  )
}

export default StaticPageLayout
