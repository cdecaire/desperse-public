/**
 * Recent Searches
 * localStorage-based storage for recent search queries
 */

const STORAGE_KEY = 'desperse:recent-searches'
const MAX_RECENT_SEARCHES = 5

/**
 * Get recent searches from localStorage
 */
export function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []

    return parsed.filter((item): item is string => typeof item === 'string')
  } catch {
    return []
  }
}

/**
 * Add a search query to recent searches
 * - Moves to front if already exists
 * - Trims to max limit
 */
export function addRecentSearch(query: string): void {
  if (typeof window === 'undefined') return
  if (!query.trim()) return

  const trimmed = query.trim()
  const current = getRecentSearches()

  // Remove if already exists (will be added to front)
  const filtered = current.filter(
    (item) => item.toLowerCase() !== trimmed.toLowerCase()
  )

  // Add to front and limit
  const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // Storage full or unavailable, ignore
  }
}

/**
 * Remove a specific search from recent searches
 */
export function removeRecentSearch(query: string): void {
  if (typeof window === 'undefined') return

  const current = getRecentSearches()
  const filtered = current.filter(
    (item) => item.toLowerCase() !== query.toLowerCase()
  )

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch {
    // Storage unavailable, ignore
  }
}

/**
 * Clear all recent searches
 */
export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable, ignore
  }
}
