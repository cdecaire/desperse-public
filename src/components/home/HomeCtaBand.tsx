/**
 * HomeCtaBand Component
 * Full-bleed marketing callout that punctuates the gallery rows — sign up
 * or jump into Explore. Tinted band breaks the flat canvas between grids.
 */

import { Link } from '@tanstack/react-router'
import { usePrivy } from '@privy-io/react-auth'

export function HomeCtaBand() {
  const { login, ready, authenticated } = usePrivy()

  return (
    <section className="bg-card border-y border-border">
      <div className="px-6 md:px-10 py-16 md:py-20 text-center">
        <h2 className="text-display-lg max-w-3xl mx-auto">
          Own the work you love.
        </h2>
        <p className="mt-4 text-body-lg text-muted-foreground max-w-xl mx-auto">
          Sign up in seconds — we create a wallet for you. Collect directly from
          creators, or start publishing your own work.
        </p>
        <div className="mt-8 flex items-center justify-center gap-6">
          {authenticated ? (
            <Link
              to="/"
              className="px-8 py-4 bg-primary text-primary-foreground text-label-lg rounded-full hover:scale-105 active:scale-[0.98] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
            >
              Go to Feed
            </Link>
          ) : (
            <button
              onClick={() => login()}
              disabled={!ready}
              className="px-8 py-4 bg-primary text-primary-foreground text-label-lg rounded-full hover:scale-105 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
            >
              Get Started
            </button>
          )}
          <Link
            to="/explore"
            className="text-label-lg text-muted-foreground hover:text-foreground motion-interactive"
          >
            Browse the gallery <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
