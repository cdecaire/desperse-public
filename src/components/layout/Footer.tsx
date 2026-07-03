/**
 * Site Footer
 * Shared footer for public/standalone pages (home gallery, about, static pages).
 * `fluid` spans the full page width (matching fluid pages' md:px-10 inset)
 * instead of the 80rem landing column.
 */

import { Link } from '@tanstack/react-router'
import { usePrivy } from '@privy-io/react-auth'
import { Center } from '@cdecaire/sable/layout'

export function Footer({ showCta = true, fluid = false }: { showCta?: boolean; fluid?: boolean }) {
  const { login, ready } = usePrivy()
  return (
    <footer className={`${showCta ? 'py-20' : 'py-12'} px-6 ${fluid ? 'md:px-10' : ''} bg-background relative overflow-hidden`}>
      <Center max={fluid ? '100%' : '80rem'} className="relative z-10">
        {showCta && (
          <>
            <div className="text-center mb-16">
              {/* Editorial lead — uses heading-2 size with light weight override */}
              <p className="text-heading-2 font-light text-zinc-600 dark:text-zinc-400 mb-8">
                Start creating and collecting today.
              </p>
              <button
                onClick={() => login()}
                disabled={!ready}
                className="px-10 py-4 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-label-lg rounded-full hover:scale-105 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-white"
              >
                Get Started — It's Free
              </button>
            </div>

            <p aria-hidden="true" className="text-display-4xl text-center whitespace-nowrap opacity-10 cursor-default select-none mt-8">
              DESPERSE
            </p>
          </>
        )}

        <div className={`flex flex-col md:flex-row justify-between items-start gap-12 md:items-end ${showCta ? 'mt-12 pt-12 border-t border-border' : ''}`}>
          <div className="flex flex-col sm:flex-row gap-12">
            <nav aria-label="Footer" className="space-y-4">
              <p className="text-label-xs text-zinc-500 dark:text-zinc-500">Legal</p>
              <Link to="/privacy" className="block text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 motion-interactive">
                Privacy Policy
              </Link>
              <Link to="/terms" className="block text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 motion-interactive">
                Terms of Service
              </Link>
              <Link to="/fees" className="block text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 motion-interactive">
                Fees
              </Link>
            </nav>
            <nav aria-label="Download" className="space-y-4">
              <p className="text-label-xs text-zinc-500 dark:text-zinc-500">Download</p>
              <Link to="/download" className="block text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 motion-interactive">
                All platforms
              </Link>
              <a href="https://testflight.apple.com/join/27uRZQ45" target="_blank" rel="noopener noreferrer" className="block text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 motion-interactive">
                iOS · TestFlight
              </a>
              <Link to="/download" className="block text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 motion-interactive">
                Solana dApp Store
              </Link>
              <Link to="/download" className="block text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 motion-interactive">
                Android APK
              </Link>
            </nav>
          </div>

          <div className="mt-8 md:mt-0 text-right">
            <div className="flex gap-6 mb-4 md:justify-end">
              <a href="https://x.com/DesperseApp" target="_blank" rel="noopener noreferrer" className="text-zinc-950 dark:text-zinc-50 hover:opacity-70">Twitter/X</a>
            </div>
            <p className="text-body-sm text-zinc-500 dark:text-zinc-500">© {new Date().getFullYear()} Desperse. All rights reserved.</p>
          </div>
        </div>
      </Center>
    </footer>
  )
}

export default Footer
