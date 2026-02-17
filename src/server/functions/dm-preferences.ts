/**
 * DM Preferences server functions
 * Manages creator DM settings stored in users.preferences.messaging JSONB
 */

import { createServerFn } from '@tanstack/react-start'
import { db } from '@/server/db'
import { users } from '@/server/db/schema'
import type { UserPreferencesJson } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { withAuth } from '@/server/auth'

// Default DM preferences (applied when messaging key is missing)
const DM_DEFAULTS = {
  dmEnabled: true,
  allowBuyers: true,
  allowCollectors: true,
  collectorMinCount: 3,
  allowTippers: true,
  tipMinAmount: 50, // 50 SKR default
} as const

export type DmPreferences = {
  dmEnabled: boolean
  allowBuyers: boolean
  allowCollectors: boolean
  collectorMinCount: number
  allowTippers: boolean
  tipMinAmount: number
}

/**
 * Get current user's DM preferences
 * Returns defaults if messaging key is missing
 */
export const getDmPreferences = createServerFn({
  method: 'POST',
}).handler(async (input: unknown): Promise<{ success: boolean; data?: DmPreferences; error?: string }> => {
  try {
    // Authenticate user
    const result = await withAuth(z.object({}), input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }

    const { auth } = result

    const [user] = await db
      .select({ preferences: users.preferences })
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1)

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    const messaging = user.preferences?.messaging

    return {
      success: true,
      data: {
        dmEnabled: messaging?.dmEnabled ?? DM_DEFAULTS.dmEnabled,
        allowBuyers: messaging?.allowBuyers ?? DM_DEFAULTS.allowBuyers,
        allowCollectors: messaging?.allowCollectors ?? DM_DEFAULTS.allowCollectors,
        collectorMinCount: messaging?.collectorMinCount ?? DM_DEFAULTS.collectorMinCount,
        allowTippers: messaging?.allowTippers ?? DM_DEFAULTS.allowTippers,
        tipMinAmount: messaging?.tipMinAmount ?? DM_DEFAULTS.tipMinAmount,
      },
    }
  } catch (error) {
    console.error('Error in getDmPreferences:', error instanceof Error ? error.message : 'Unknown error')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get DM preferences',
    }
  }
})

const updatePreferencesSchema = z.object({
  dmEnabled: z.boolean().optional(),
  allowBuyers: z.boolean().optional(),
  allowCollectors: z.boolean().optional(),
  collectorMinCount: z.number().int().min(1).max(100).optional(),
  allowTippers: z.boolean().optional(),
  tipMinAmount: z.number().positive().max(10000).optional(),
})

/**
 * Update current user's DM preferences
 * Merges with existing preferences (partial update)
 */
export const updateDmPreferences = createServerFn({
  method: 'POST',
}).handler(async (input: unknown): Promise<{ success: boolean; data?: DmPreferences; error?: string }> => {
  try {
    // Authenticate user
    const result = await withAuth(updatePreferencesSchema, input)
    if (!result) {
      return { success: false, error: 'Authentication required' }
    }

    const { auth, input: updates } = result

    // Get current preferences
    const [user] = await db
      .select({ preferences: users.preferences })
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1)

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // Merge with existing preferences
    const currentPrefs = user.preferences ?? {}
    const currentMessaging = currentPrefs.messaging ?? {}

    const newMessaging = {
      ...currentMessaging,
      ...(updates.dmEnabled !== undefined && { dmEnabled: updates.dmEnabled }),
      ...(updates.allowBuyers !== undefined && { allowBuyers: updates.allowBuyers }),
      ...(updates.allowCollectors !== undefined && { allowCollectors: updates.allowCollectors }),
      ...(updates.collectorMinCount !== undefined && { collectorMinCount: updates.collectorMinCount }),
      ...(updates.allowTippers !== undefined && { allowTippers: updates.allowTippers }),
      ...(updates.tipMinAmount !== undefined && { tipMinAmount: updates.tipMinAmount }),
    }

    const newPrefs: UserPreferencesJson = {
      ...currentPrefs,
      messaging: newMessaging,
    }

    // Update user preferences
    await db
      .update(users)
      .set({
        preferences: newPrefs,
        updatedAt: new Date(),
      })
      .where(eq(users.id, auth.userId))

    return {
      success: true,
      data: {
        dmEnabled: newMessaging.dmEnabled ?? DM_DEFAULTS.dmEnabled,
        allowBuyers: newMessaging.allowBuyers ?? DM_DEFAULTS.allowBuyers,
        allowCollectors: newMessaging.allowCollectors ?? DM_DEFAULTS.allowCollectors,
        collectorMinCount: newMessaging.collectorMinCount ?? DM_DEFAULTS.collectorMinCount,
        allowTippers: newMessaging.allowTippers ?? DM_DEFAULTS.allowTippers,
        tipMinAmount: newMessaging.tipMinAmount ?? DM_DEFAULTS.tipMinAmount,
      },
    }
  } catch (error) {
    console.error('Error in updateDmPreferences:', error instanceof Error ? error.message : 'Unknown error')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update DM preferences',
    }
  }
})
