/**
 * Internal DM eligibility check (server-only)
 * This file should NEVER be imported from client code or hooks.
 * Use the server function wrapper in dm-eligibility.ts for client calls.
 */

import { db } from '@/server/db'
import { users, posts, purchases, collections, dmThreads } from '@/server/db/schema'
import type { UserPreferencesJson } from '@/server/db/schema'
import { eq, and, count, sql } from 'drizzle-orm'

// Default DM preferences (applied when messaging key is missing)
const DM_DEFAULTS = {
  dmEnabled: true,
  allowBuyers: true,
  allowCollectors: true,
  collectorMinCount: 3,
  allowTippers: true,
  tipMinAmount: 50,
} as const

// Helper to get DM preferences with defaults applied
function getDmPrefsWithDefaults(preferences: UserPreferencesJson | null) {
  const messaging = preferences?.messaging
  return {
    dmEnabled: messaging?.dmEnabled ?? DM_DEFAULTS.dmEnabled,
    allowBuyers: messaging?.allowBuyers ?? DM_DEFAULTS.allowBuyers,
    allowCollectors: messaging?.allowCollectors ?? DM_DEFAULTS.allowCollectors,
    collectorMinCount: messaging?.collectorMinCount ?? DM_DEFAULTS.collectorMinCount,
    allowTippers: messaging?.allowTippers ?? DM_DEFAULTS.allowTippers,
    tipMinAmount: messaging?.tipMinAmount ?? DM_DEFAULTS.tipMinAmount,
  }
}

export type DmEligibilityResult = {
  allowed: boolean
  eligibleVia: string[]
  unlockPaths: { method: string; message: string }[]
  creatorDmsDisabled?: boolean
  /** Creator's minimum tip amount for tip_unlock (in SKR, human-readable) */
  tipMinAmount?: number
  /** Creator's user ID (for tip-to-message flow) */
  creatorId?: string
}

/**
 * Internal function to check if a viewer can message a creator
 * Can be called directly from other server functions
 */
export async function checkDmEligibility(
  creatorId: string,
  viewerId: string
): Promise<{ success: boolean; data?: DmEligibilityResult; error?: string }> {
  try {
    // Self-messaging is always allowed
    if (creatorId === viewerId) {
      return {
        success: true,
        data: {
          allowed: true,
          eligibleVia: ['self'],
          unlockPaths: [],
        },
      }
    }

    // Check if an existing thread exists between these users
    // If so, always allow messaging (conversation already established)
    const [userA, userB] = creatorId < viewerId ? [creatorId, viewerId] : [viewerId, creatorId]
    const [existingThread] = await db
      .select({ id: dmThreads.id })
      .from(dmThreads)
      .where(
        and(
          eq(dmThreads.userAId, userA),
          eq(dmThreads.userBId, userB)
        )
      )
      .limit(1)

    if (existingThread) {
      return {
        success: true,
        data: {
          allowed: true,
          eligibleVia: ['existing_thread'],
          unlockPaths: [],
        },
      }
    }

    // Get creator's DM preferences
    const [creator] = await db
      .select({ preferences: users.preferences })
      .from(users)
      .where(eq(users.id, creatorId))
      .limit(1)

    if (!creator) {
      return { success: false, error: 'Creator not found' }
    }

    const prefs = getDmPrefsWithDefaults(creator.preferences)

    // If DMs are disabled, return early
    if (!prefs.dmEnabled) {
      return {
        success: true,
        data: {
          allowed: false,
          eligibleVia: [],
          unlockPaths: [],
          creatorDmsDisabled: true,
        },
      }
    }

    const eligibleVia: string[] = []
    const unlockPaths: { method: string; message: string }[] = []

    // Check edition_purchase eligibility (if allowed)
    if (prefs.allowBuyers) {
      const [purchaseResult] = await db
        .select({ count: count() })
        .from(purchases)
        .innerJoin(posts, eq(purchases.postId, posts.id))
        .where(
          and(
            eq(purchases.userId, viewerId),
            eq(posts.userId, creatorId),
            eq(purchases.status, 'confirmed')
          )
        )

      if (purchaseResult && purchaseResult.count > 0) {
        eligibleVia.push('edition_purchase')
      } else {
        unlockPaths.push({
          method: 'edition_purchase',
          message: 'Purchase any edition from this creator',
        })
      }
    }

    // Check collectible_count eligibility (if allowed)
    if (prefs.allowCollectors) {
      const [collectResult] = await db
        .select({ count: sql<number>`count(distinct ${collections.postId})` })
        .from(collections)
        .innerJoin(posts, eq(collections.postId, posts.id))
        .where(
          and(
            eq(collections.userId, viewerId),
            eq(posts.userId, creatorId),
            eq(collections.status, 'confirmed')
          )
        )

      const collectCount = collectResult?.count ?? 0

      if (collectCount >= prefs.collectorMinCount) {
        eligibleVia.push('collectible_count')
      } else {
        const remaining = prefs.collectorMinCount - collectCount
        unlockPaths.push({
          method: 'collectible_count',
          message: `Collect ${remaining} more collectible${remaining === 1 ? '' : 's'} from this creator`,
        })
      }
    }

    // Check tip eligibility (if allowed) - non-critical, wrapped in try/catch
    // so a failure here never breaks the core eligibility check
    if (prefs.allowTippers && prefs.tipMinAmount > 0) {
      try {
        const { getTotalTipsFromTo } = await import('./tips-internal')
        const totalTipped = await getTotalTipsFromTo(viewerId, creatorId)

        if (totalTipped >= prefs.tipMinAmount) {
          eligibleVia.push('tip_unlock')
        } else {
          const remaining = Math.max(0, prefs.tipMinAmount - totalTipped)
          unlockPaths.push({
            method: 'tip_unlock',
            message: totalTipped > 0
              ? `Tip ${remaining.toLocaleString()} more SKR to unlock messaging`
              : `Tip ${prefs.tipMinAmount.toLocaleString()} SKR to unlock messaging`,
          })
        }
      } catch (tipError) {
        console.warn('[checkDmEligibility] Tip eligibility check failed, skipping:',
          tipError instanceof Error ? tipError.message : 'Unknown error')
        // Still show the tip unlock path as an option, even if we can't verify
        unlockPaths.push({
          method: 'tip_unlock',
          message: `Tip ${prefs.tipMinAmount.toLocaleString()} SKR to unlock messaging`,
        })
      }
    }

    // If viewer is already eligible via their own purchases/collects/tips, allow
    if (eligibleVia.length > 0) {
      return {
        success: true,
        data: {
          allowed: true,
          eligibleVia,
          unlockPaths: [],
        },
      }
    }

    // Check reciprocal eligibility: if the creator has purchased from or collected from the viewer,
    // then the viewer should be able to message them back (they earned the right to contact you)

    // Check if creator bought any edition from viewer
    const [reciprocalPurchase] = await db
      .select({ count: count() })
      .from(purchases)
      .innerJoin(posts, eq(purchases.postId, posts.id))
      .where(
        and(
          eq(purchases.userId, creatorId),  // creator bought
          eq(posts.userId, viewerId),        // from viewer
          eq(purchases.status, 'confirmed')
        )
      )

    if (reciprocalPurchase && reciprocalPurchase.count > 0) {
      return {
        success: true,
        data: {
          allowed: true,
          eligibleVia: ['reciprocal_purchase'],
          unlockPaths: [],
        },
      }
    }

    // Check if creator collected enough from viewer
    const [reciprocalCollect] = await db
      .select({ count: sql<number>`count(distinct ${collections.postId})` })
      .from(collections)
      .innerJoin(posts, eq(collections.postId, posts.id))
      .where(
        and(
          eq(collections.userId, creatorId),  // creator collected
          eq(posts.userId, viewerId),          // from viewer
          eq(collections.status, 'confirmed')
        )
      )

    // Use viewer's collector threshold for reciprocal check
    const [viewer] = await db
      .select({ preferences: users.preferences })
      .from(users)
      .where(eq(users.id, viewerId))
      .limit(1)

    const viewerPrefs = getDmPrefsWithDefaults(viewer?.preferences ?? null)
    const reciprocalCollectCount = reciprocalCollect?.count ?? 0

    if (reciprocalCollectCount >= viewerPrefs.collectorMinCount) {
      return {
        success: true,
        data: {
          allowed: true,
          eligibleVia: ['reciprocal_collect'],
          unlockPaths: [],
        },
      }
    }

    // Not eligible - return unlock paths with tip info
    return {
      success: true,
      data: {
        allowed: false,
        eligibleVia,
        unlockPaths,
        ...(prefs.allowTippers && prefs.tipMinAmount > 0 && {
          tipMinAmount: prefs.tipMinAmount,
          creatorId,
        }),
      },
    }
  } catch (error) {
    console.error('Error in checkDmEligibility:', error instanceof Error ? error.message : 'Unknown error')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check eligibility',
    }
  }
}
