import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * localStorage helper for "last seen" timestamps per feed
 * Centralizes storage so moving from localStorage to server later is trivial
 * 
 * Key format: feed:lastSeen:forYou, feed:lastSeen:following
 */
const LAST_SEEN_KEY_MAP = {
  forYou: 'feed:lastSeen:forYou',
  following: 'feed:lastSeen:following',
} as const

// Old key format for migration
const OLD_LAST_SEEN_PREFIX = 'desperse_lastSeen_'

/**
 * Migrate from old localStorage key format to new format
 * Called once on getLastSeen, migrates and deletes old key
 */
function migrateOldKey(feedKey: 'forYou' | 'following'): string | null {
  if (typeof window === 'undefined') return null
  
  try {
    const oldKey = `${OLD_LAST_SEEN_PREFIX}${feedKey}`
    const newKey = LAST_SEEN_KEY_MAP[feedKey]
    
    const oldValue = localStorage.getItem(oldKey)
    if (oldValue) {
      // Migrate to new key
      localStorage.setItem(newKey, oldValue)
      // Delete old key
      localStorage.removeItem(oldKey)
      return oldValue
    }
    return null
  } catch {
    return null
  }
}

export function getLastSeen(feedKey: 'forYou' | 'following'): string | null {
  if (typeof window === 'undefined') return null
  try {
    const key = LAST_SEEN_KEY_MAP[feedKey]
    let value = localStorage.getItem(key)
    
    // If no value in new key, try migrating from old key
    if (!value) {
      value = migrateOldKey(feedKey)
    }
    
    return value
  } catch {
    return null
  }
}

export function setLastSeen(feedKey: 'forYou' | 'following', timestamp: string): void {
  if (typeof window === 'undefined') return
  try {
    const key = LAST_SEEN_KEY_MAP[feedKey]
    localStorage.setItem(key, timestamp)
  } catch {
    // Ignore localStorage errors (e.g., quota exceeded)
  }
}