import { Link } from '@tanstack/react-router'

import { Logo } from '@/components/shared/Logo'

/**
 * Minimal, self-contained shell for the first-run flow.
 *
 * Unlike StaticPageLayout (which brings the full PublicHeader nav + Footer),
 * onboarding is a focused, chrome-free surface: just a small brand mark over a
 * plain background so the contained panel is the whole experience. The route is
 * listed in STANDALONE_ROUTES so the authed AppShell never wraps it either.
 */
export function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:py-12">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 self-start transition-opacity hover:opacity-80"
          aria-label="Desperse home"
        >
          <Logo size={18} className="text-foreground" />
          <span className="text-lg font-extrabold">Desperse</span>
        </Link>
        <div className="flex w-full flex-1 items-start">{children}</div>
      </div>
    </main>
  )
}

export default OnboardingLayout
