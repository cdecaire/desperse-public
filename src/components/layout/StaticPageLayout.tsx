/**
 * Static Page Layout
 * Shared layout for standalone public pages (about, privacy, terms, fees,
 * changelog). Uses the same PublicHeader as the home gallery so nav is
 * consistent across every public/standalone route.
 */

import { Stack, Center } from '@cdecaire/sable/layout'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { Footer } from '@/components/layout/Footer'

interface StaticPageLayoutProps {
  children: React.ReactNode
}

const PUBLIC_NAV_ITEMS = [
  { label: 'Explore', href: '/explore' },
  { label: 'About', href: '/about' },
]

export function StaticPageLayout({ children }: StaticPageLayoutProps) {
  return (
    <Stack gap={0} className="min-h-screen bg-background text-foreground">
      <PublicHeader navItems={PUBLIC_NAV_ITEMS} />
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
