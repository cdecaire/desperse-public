/**
 * HomeCtaBand Component
 * Full-bleed marketing callout that punctuates the gallery rows — sign up
 * or jump into Explore. Tinted band breaks the flat canvas between grids.
 */

import { Link } from '@tanstack/react-router'
import { usePrivy } from '@privy-io/react-auth'
import { Reveal } from '@cdecaire/sable'
import { Region } from '@cdecaire/sable/layout'
import { Button } from '@/components/ui/button'

export function HomeCtaBand() {
  const { login, ready, authenticated } = usePrivy()

  return (
    <section className="bg-card border-y border-border">
      <Region as="div" inset={false} className="px-6 md:px-10 py-16 md:py-20 text-center">
        <Reveal>
          <h2 className="text-display-lg max-w-3xl mx-auto">
            Own the work you love.
          </h2>
          <p className="mt-4 text-body-lg text-muted-foreground max-w-xl mx-auto">
            Sign up in seconds — we create a wallet for you. Collect directly from
            creators, or start publishing your own work.
          </p>
          <div className="mt-8 flex items-center justify-center gap-6">
            {authenticated ? (
              <Button size="cta" className="hover:scale-105 active:scale-[0.98]" asChild>
                <Link to="/">Go to Feed</Link>
              </Button>
            ) : (
              <Button
                size="cta"
                className="hover:scale-105 active:scale-[0.98]"
                onClick={() => login()}
                disabled={!ready}
              >
                Get Started
              </Button>
            )}
            <Link
              to="/explore"
              className="text-label-lg text-muted-foreground hover:text-foreground motion-interactive"
            >
              Browse the gallery <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </Reveal>
      </Region>
    </section>
  )
}
