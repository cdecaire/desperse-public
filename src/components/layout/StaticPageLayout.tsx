/**
 * Static Page Layout
 * Shared layout for standalone public pages (about, privacy, terms, fees,
 * changelog). Uses the same PublicHeader as the home gallery so nav is
 * consistent across every public/standalone route.
 */

import { Stack, Center } from '@cdecaire/sable/layout'
import { PublicHeader, PUBLIC_NAV_ITEMS } from '@/components/layout/PublicHeader'
import { Footer } from '@/components/layout/Footer'

interface StaticPageLayoutProps {
  children: React.ReactNode
  /** Cap width for the content region. Defaults to "prose" (long-form pages). */
  maxWidth?: string
}

export function StaticPageLayout({ children, maxWidth = 'prose' }: StaticPageLayoutProps) {
  return (
    <Stack gap={0} className="min-h-screen bg-background text-foreground">
      <PublicHeader navItems={PUBLIC_NAV_ITEMS} />
      <main className="flex-1 pt-32 pb-20 md:pt-40 md:pb-24">
        <Center max={maxWidth} className="px-4">
          {children}
        </Center>
      </main>
      <Footer showCta={false} />
    </Stack>
  )
}

export default StaticPageLayout
