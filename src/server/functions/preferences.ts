/**
 * User preferences server functions
 * Get and update user preferences stored as JSONB on users table
 */

import { createServerFn } from '@tanstack/react-start'
import { db } from '@/server/db'
import { users, type UserPreferencesJson } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { withAuth } from '@/server/auth'

// Explorer options
export const explorerOptions = ['orb', 'solscan', 'solana-explorer', 'solanafm'] as const
export type ExplorerOption = (typeof explorerOptions)[number]

// Theme options
export const themeOptions = ['light', 'dark', 'system'] as const
export type ThemeOption = (typeof themeOptions)[number]

// Schema for getting preferences (just needs auth)
const getPreferencesSchema = z.object({})

// Schema for preferences update (partial update)
const updatePreferencesSchema = z.object({
  theme: z.enum(themeOptions).optional(),
  explorer: z.enum(explorerOptions).optional(),
  notifications: z.object({
    follows: z.boolean().optional(),
    likes: z.boolean().optional(),
    comments: z.boolean().optional(),
    collects: z.boolean().optional(),
    purchases: z.boolean().optional(),
    mentions: z.boolean().optional(),
    messages: z.boolean().optional(),
  }).optional(),
})

// Default preferences
export const defaultPreferences: UserPreferencesJson = {
  theme: 'system',
  explorer: 'orb',
  notifications: {
    follows: true,
    likes: true,
    comments: true,
    collects: true,
    purchases: true,
    mentions: true,
    messages: true,
  },
}

// Merge preferences with defaults
function mergeWithDefaults(prefs: UserPreferencesJson | null | undefined): UserPreferencesJson {
  const stored = prefs || {}
  return {
    theme: stored.theme ?? defaultPreferences.theme,
    explorer: stored.explorer ?? defaultPreferences.explorer,
    notifications: {
      follows: stored.notifications?.follows ?? defaultPreferences.notifications?.follows,
      likes: stored.notifications?.likes ?? defaultPreferences.notifications?.likes,
      comments: stored.notifications?.comments ?? defaultPreferences.notifications?.comments,
      collects: stored.notifications?.collects ?? defaultPreferences.notifications?.collects,
      purchases: stored.notifications?.purchases ?? defaultPreferences.notifications?.purchases,
      mentions: stored.notifications?.mentions ?? defaultPreferences.notifications?.mentions,
      messages: stored.notifications?.messages ?? defaultPreferences.notifications?.messages,
    },
  }
}

/**
 * Get user preferences
 * Returns preferences for the authenticated user with defaults applied
 */
export const getUserPreferences = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate user
    const result = await withAuth(getPreferencesSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required', status: 401 }
    }

    const { auth } = result
    const userId = auth.userId

    // Fetch user with preferences
    const [user] = await db
      .select({ preferences: users.preferences })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user) {
      return { success: false, error: 'User not found', status: 404 }
    }

    // Merge with defaults and return
    const preferences = mergeWithDefaults(user.preferences as UserPreferencesJson)

    return {
      success: true,
      preferences,
    }
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return { success: false, error: 'Failed to fetch preferences', status: 500 }
  }
})

/**
 * Update user preferences
 * Performs a partial/merge update on the preferences JSONB
 */
export const updateUserPreferences = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    // Authenticate user
    const result = await withAuth(updatePreferencesSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required', status: 401 }
    }

    const { auth, input: updates } = result
    const userId = auth.userId

    // Fetch current preferences
    const [user] = await db
      .select({ preferences: users.preferences })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user) {
      return { success: false, error: 'User not found', status: 404 }
    }

    // Merge updates with current preferences
    const currentPrefs = (user.preferences as UserPreferencesJson) || {}
    const newPrefs: UserPreferencesJson = {
      ...currentPrefs,
    }

    // Apply top-level updates
    if (updates.theme !== undefined) {
      newPrefs.theme = updates.theme
    }
    if (updates.explorer !== undefined) {
      newPrefs.explorer = updates.explorer
    }

    // Merge notification preferences
    if (updates.notifications) {
      newPrefs.notifications = {
        ...currentPrefs.notifications,
        ...updates.notifications,
      }
    }

    // Update user record
    const [updated] = await db
      .update(users)
      .set({
        preferences: newPrefs,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({ preferences: users.preferences })

    // Return merged with defaults
    const preferences = mergeWithDefaults(updated.preferences as UserPreferencesJson)

    return {
      success: true,
      preferences,
    }
  } catch (error) {
    console.error('Error updating user preferences:', error)
    return { success: false, error: 'Failed to update preferences', status: 500 }
  }
})

/**
 * Get explorer URL for a transaction or address
 */
export function getExplorerUrl(
  type: 'tx' | 'address' | 'token',
  value: string,
  explorer: ExplorerOption = 'orb'
): string {
  switch (explorer) {
    case 'orb':
      if (type === 'tx') return `https://orbmarkets.io/tx/${value}`
      if (type === 'address') return `https://orbmarkets.io/address/${value}`
      if (type === 'token') return `https://orbmarkets.io/token/${value}`
      break
    case 'solscan':
      if (type === 'tx') return `https://solscan.io/tx/${value}`
      if (type === 'address') return `https://solscan.io/account/${value}`
      if (type === 'token') return `https://solscan.io/token/${value}`
      break
    case 'solana-explorer':
      if (type === 'tx') return `https://explorer.solana.com/tx/${value}`
      if (type === 'address') return `https://explorer.solana.com/address/${value}`
      if (type === 'token') return `https://explorer.solana.com/address/${value}`
      break
    case 'solanafm':
      if (type === 'tx') return `https://solana.fm/tx/${value}`
      if (type === 'address') return `https://solana.fm/address/${value}`
      if (type === 'token') return `https://solana.fm/address/${value}`
      break
  }
  // Fallback to Orb
  return `https://orbmarkets.io/${type}/${value}`
}
