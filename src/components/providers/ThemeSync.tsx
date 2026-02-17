/**
 * Theme Sync Component
 * Syncs theme preference between next-themes (localStorage) and database
 * Must be rendered inside PrivyProvider and ThemeProvider contexts
 */

import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { usePrivy } from '@privy-io/react-auth'
import { usePreferences } from '@/hooks/usePreferences'

// Theme color values matching CSS custom properties
const THEME_COLORS = {
  light: '#ffffff',
  dark: '#09090b',
} as const

/**
 * Updates the theme-color meta tag to match the current theme
 */
function updateThemeColorMeta(resolvedTheme: string | undefined) {
  if (typeof document === 'undefined' || !resolvedTheme) return

  const color = resolvedTheme === 'dark' ? THEME_COLORS.dark : THEME_COLORS.light

  // Find and update all theme-color meta tags
  const metaTags = document.querySelectorAll('meta[name="theme-color"]')
  metaTags.forEach((meta) => {
    meta.setAttribute('content', color)
  })
}

/**
 * Inner component that performs the actual sync
 * Uses Privy directly to avoid useWallets issues
 */
function ThemeSyncInner() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { authenticated: isAuthenticated } = usePrivy()
  const { preferences, setTheme: saveThemeToDb, isLoading } = usePreferences()

  const hasInitialized = useRef(false)
  const lastSyncedTheme = useRef<string | undefined>(undefined)

  // Sync theme-color meta tag with resolved theme
  useEffect(() => {
    updateThemeColorMeta(resolvedTheme)
  }, [resolvedTheme])

  // On mount (for authenticated users): sync database theme to local
  useEffect(() => {
    if (!isAuthenticated || isLoading || hasInitialized.current) return

    // Only sync from DB on initial load
    const dbTheme = preferences.theme
    if (dbTheme && dbTheme !== theme) {
      setTheme(dbTheme)
    }
    hasInitialized.current = true
    lastSyncedTheme.current = theme
  }, [isAuthenticated, isLoading, preferences.theme, theme, setTheme])

  // When local theme changes (user clicks toggle), save to database
  useEffect(() => {
    if (!isAuthenticated || !hasInitialized.current) return
    if (!theme || theme === lastSyncedTheme.current) return

    // Theme changed locally, save to DB
    const validTheme = theme as 'light' | 'dark' | 'system'
    if (validTheme === 'light' || validTheme === 'dark' || validTheme === 'system') {
      saveThemeToDb(validTheme)
      lastSyncedTheme.current = theme
    }
  }, [theme, isAuthenticated, saveThemeToDb])

  return null
}

/**
 * Theme Sync wrapper component
 * Only renders sync logic on client-side to avoid SSR issues
 */
export function ThemeSync() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Only render on client to avoid SSR issues
  if (!isMounted) return null

  return <ThemeSyncInner />
}
