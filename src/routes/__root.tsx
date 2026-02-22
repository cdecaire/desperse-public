import { HeadContent, Scripts, createRootRoute, useRouterState } from '@tanstack/react-router'
import { useEffect, useState, useRef } from 'react'
import { Analytics } from '@vercel/analytics/react'

import AppShell from '../components/layout/AppShell'

// Routes that should not be wrapped in the AppShell (standalone pages)
// Note: '/' is conditionally standalone based on auth state (see RpcHealthProviderWrapper)
const STANDALONE_ROUTES = ['/about', '/privacy', '/terms', '/fees', '/changelog']
import { PrivyProvider } from '../components/providers/PrivyProvider'
import { QueryProvider } from '../components/providers/QueryProvider'
import { RpcHealthProvider } from '../components/providers/RpcHealthProvider'
import { ThemeProvider } from '../components/providers/ThemeProvider'
import { ThemeSync } from '../components/providers/ThemeSync'
import { ErrorBoundary } from '../components/shared/ErrorBoundary'
import { SplashScreen } from '../components/shared/SplashScreen'
import { NotFoundPage } from './$'
import { useAuth } from '../hooks/useAuth'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  notFoundComponent: NotFoundPage,
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      {
        title: 'Desperse',
      },
      // PWA iOS meta tags
      {
        name: 'mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'black-translucent',
      },
      {
        name: 'apple-mobile-web-app-title',
        content: 'Desperse',
      },
      // Theme color - light mode
      {
        name: 'theme-color',
        content: '#ffffff',
        media: '(prefers-color-scheme: light)',
      },
      // Theme color - dark mode
      {
        name: 'theme-color',
        content: '#09090b',
        media: '(prefers-color-scheme: dark)',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      // PWA manifest
      {
        rel: 'manifest',
        href: '/manifest.webmanifest',
      },
      // Favicons
      {
        rel: 'icon',
        type: 'image/x-icon',
        href: '/favicon.ico',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-16x16.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32x32.png',
      },
      // Apple Touch Icons
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '57x57',
        href: '/apple-touch-icon-57x57.png',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '57x57',
        href: '/apple-touch-icon-57x57-precomposed.png',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '76x76',
        href: '/apple-touch-icon-76x76.png',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '76x76',
        href: '/apple-touch-icon-76x76-precomposed.png',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '120x120',
        href: '/apple-touch-icon-120x120.png',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '120x120',
        href: '/apple-touch-icon-120x120-precomposed.png',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '152x152',
        href: '/apple-touch-icon-152x152.png',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '152x152',
        href: '/apple-touch-icon-152x152-precomposed.png',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '167x167',
        href: '/apple-touch-icon-167x167.png',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '167x167',
        href: '/apple-touch-icon-167x167-precomposed.png',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon-180x180.png',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon-180x180-precomposed.png',
      },
      // Safari Pinned Tab
      {
        rel: 'mask-icon',
        href: '/safari-pinned-tab.svg',
        color: '#09090b', // zinc-950
      },
    ],
    scripts: [
      // Script to prevent flash of wrong theme
      {
        children: `
          (function() {
            try {
              var theme = localStorage.getItem('theme');
              if (theme === 'light' || (theme === 'system' && !window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.remove('dark');
              } else {
                document.documentElement.classList.add('dark');
              }
            } catch (e) {}
          })();
        `,
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  // Load Buffer polyfill on client side only (not during SSR)
  // Note: This runs after initial render, so modules that need Buffer synchronously
  // should use the Vite alias which maps 'buffer' to 'buffer-es' in the browser
  useEffect(() => {
    if (typeof window === 'undefined') return
    if ((window as typeof window & { Buffer?: typeof Buffer }).Buffer) return
    
    // Import buffer-es only on client (Vite will handle the alias)
    import('buffer-es')
      .then(({ Buffer }) => {
        // Make Buffer available globally on client
        ;(window as typeof window & { Buffer: typeof Buffer }).Buffer = Buffer
        
        if (typeof globalThis !== 'undefined') {
          ;(globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer
        }
        
        // For Node.js-style code that checks global
        if (typeof global !== 'undefined') {
          ;(global as typeof global & { Buffer: typeof Buffer }).Buffer = Buffer
        }
      })
      .catch((err) => {
        console.error('Failed to load Buffer polyfill:', err)
      })
  }, [])

  // Temporary: Figma capture script for html-to-design
  useEffect(() => {
    const el = document.createElement('script')
    el.src = 'https://mcp.figma.com/mcp/html-to-design/capture.js'
    el.async = true
    document.head.appendChild(el)
    return () => { el.remove() }
  }, [])

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ErrorBoundary>
          <ThemeProvider>
            <QueryProvider>
              <PrivyProvider>
                <RpcHealthProviderWrapper>
                  {children}
                </RpcHealthProviderWrapper>
              </PrivyProvider>
            </QueryProvider>
          </ThemeProvider>
        </ErrorBoundary>
        <Analytics />
        <Scripts />
      </body>
    </html>
  )
}

// Wrapper component to access auth state for RpcHealthProvider, sync theme, and show splash
function RpcHealthProviderWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isReady } = useAuth()
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

  // Check if this is a standalone route (no AppShell)
  // Also treat home page as standalone for unauthenticated users (shows landing page)
  const isStandaloneRoute = STANDALONE_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))
  const isHomePageUnauthenticated = pathname === '/' && isReady && !isAuthenticated
  const shouldBeStandalone = isStandaloneRoute || isHomePageUnauthenticated

  // Track committed layout mode to prevent flash during route transitions
  // When pathname updates, the children (route outlet) may briefly still render the previous route
  // We defer the layout switch until after a microtask to let the route component settle
  const [committedStandalone, setCommittedStandalone] = useState(shouldBeStandalone)
  const previousPathnameRef = useRef(pathname)

  useEffect(() => {
    if (pathname !== previousPathnameRef.current) {
      previousPathnameRef.current = pathname
      // Defer layout mode change to next tick to let route outlet update first
      // This prevents briefly showing wrong content with wrong layout during navigation
      const timeout = setTimeout(() => {
        setCommittedStandalone(shouldBeStandalone)
      }, 0)
      return () => clearTimeout(timeout)
    } else {
      // Same pathname, update immediately (e.g., auth state changed)
      setCommittedStandalone(shouldBeStandalone)
    }
  }, [pathname, shouldBeStandalone])

  return (
    <RpcHealthProvider isAuthenticated={isAuthenticated}>
      <ThemeSync />
      {/* Standalone routes skip splash and AppShell */}
      {committedStandalone ? (
        children
      ) : (
        <>
          {/* Splash renders first and blocks interaction until auth ready */}
          <SplashScreen isReady={isReady} />
          {/* Don't render app content until auth is initialized to prevent skeleton flash */}
          {isReady ? <AppShell>{children}</AppShell> : null}
        </>
      )}
    </RpcHealthProvider>
  )
}
