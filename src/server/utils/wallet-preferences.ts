/**
 * Wallet preferences utilities for REST API endpoints
 * CRUD operations for user_wallets table following the "Direct" pattern
 */

import { db } from '@/server/db'
import { userWallets } from '@/server/db/schema'
import { eq, and, count } from 'drizzle-orm'
import { authenticateWithToken } from '@/server/auth'

// Valid connector types
const VALID_CONNECTORS = ['mwa', 'privy', 'deeplink'] as const

// Types
export interface UserWallet {
  id: string
  address: string
  type: string
  connector: string | null
  label: string | null
  isPrimary: boolean
  createdAt: Date
}

export interface WalletResult {
  success: boolean
  error?: string
  wallets?: UserWallet[]
  wallet?: UserWallet
}

/**
 * Sanitize label: strip HTML, trim, max 50 chars
 */
function sanitizeLabel(label?: string | null): string | null {
  if (!label) return null
  // Strip HTML tags
  const stripped = label.replace(/<[^>]*>/g, '').trim()
  if (!stripped) return null
  return stripped.slice(0, 50)
}

/**
 * Get all wallets for the authenticated user
 */
export async function getUserWalletsDirect(
  token: string
): Promise<WalletResult> {
  try {
    const auth = await authenticateWithToken(token)
    if (!auth?.userId) {
      return { success: false, error: 'Authentication required' }
    }

    const wallets = await db
      .select({
        id: userWallets.id,
        address: userWallets.address,
        type: userWallets.type,
        connector: userWallets.connector,
        label: userWallets.label,
        isPrimary: userWallets.isPrimary,
        createdAt: userWallets.createdAt,
      })
      .from(userWallets)
      .where(eq(userWallets.userId, auth.userId))
      .orderBy(userWallets.createdAt)

    return { success: true, wallets }
  } catch (error) {
    console.error('[getUserWalletsDirect] Error:', error instanceof Error ? error.message : 'Unknown error')
    return { success: false, error: 'Failed to fetch wallets' }
  }
}

/**
 * Add a new wallet for the authenticated user
 */
export async function addWalletDirect(
  token: string,
  address: string,
  type: string,
  connector?: string,
  label?: string
): Promise<WalletResult> {
  try {
    const auth = await authenticateWithToken(token)
    if (!auth?.userId) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate address
    if (!address || typeof address !== 'string' || address.trim().length === 0) {
      return { success: false, error: 'Wallet address is required' }
    }

    // Validate type
    if (type !== 'embedded' && type !== 'external') {
      return { success: false, error: 'Invalid wallet type. Must be "embedded" or "external"' }
    }

    // Validate connector
    if (connector && !VALID_CONNECTORS.includes(connector as typeof VALID_CONNECTORS[number])) {
      return { success: false, error: `Invalid connector. Must be one of: ${VALID_CONNECTORS.join(', ')}` }
    }

    // Sanitize label
    const sanitizedLabel = sanitizeLabel(label)

    // Check if this is the first wallet (should be primary)
    const [{ value: walletCount }] = await db
      .select({ value: count() })
      .from(userWallets)
      .where(eq(userWallets.userId, auth.userId))

    const isFirstWallet = Number(walletCount) === 0

    // Insert the wallet
    const [inserted] = await db
      .insert(userWallets)
      .values({
        userId: auth.userId,
        address: address.trim(),
        type,
        connector: connector || null,
        label: sanitizedLabel || (type === 'embedded' ? 'Desperse Wallet' : 'External Wallet'),
        isPrimary: isFirstWallet,
      })
      .returning({
        id: userWallets.id,
        address: userWallets.address,
        type: userWallets.type,
        connector: userWallets.connector,
        label: userWallets.label,
        isPrimary: userWallets.isPrimary,
        createdAt: userWallets.createdAt,
      })

    return { success: true, wallet: inserted }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const errorCode = (error as any)?.code
    // Handle duplicate key error (Postgres code 23505 = unique_violation)
    if (errorCode === '23505' || errorMsg.includes('unique') || errorMsg.includes('duplicate')) {
      return { success: false, error: 'This wallet address is already added' }
    }
    console.error('[addWalletDirect] Error:', errorMsg)
    return { success: false, error: 'Failed to add wallet' }
  }
}

/**
 * Remove a wallet for the authenticated user
 * Rules:
 * - Cannot remove the last wallet
 * - Embedded wallets are non-removable
 * - If removed wallet was primary, auto-fallback to embedded
 */
export async function removeWalletDirect(
  token: string,
  walletId: string
): Promise<WalletResult> {
  try {
    const auth = await authenticateWithToken(token)
    if (!auth?.userId) {
      return { success: false, error: 'Authentication required' }
    }

    // Fetch the wallet to remove
    const [wallet] = await db
      .select()
      .from(userWallets)
      .where(
        and(
          eq(userWallets.id, walletId),
          eq(userWallets.userId, auth.userId)
        )
      )
      .limit(1)

    if (!wallet) {
      return { success: false, error: 'Wallet not found' }
    }

    // Cannot remove embedded wallets
    if (wallet.type === 'embedded') {
      return { success: false, error: 'Cannot remove embedded wallet' }
    }

    // Check total wallet count
    const [{ value: walletCount }] = await db
      .select({ value: count() })
      .from(userWallets)
      .where(eq(userWallets.userId, auth.userId))

    if (Number(walletCount) <= 1) {
      return { success: false, error: 'Cannot remove your last wallet' }
    }

    const wasPrimary = wallet.isPrimary

    // Delete the wallet
    await db
      .delete(userWallets)
      .where(eq(userWallets.id, walletId))

    // If removed wallet was primary, fall back to embedded wallet
    if (wasPrimary) {
      const [embedded] = await db
        .select({ id: userWallets.id })
        .from(userWallets)
        .where(
          and(
            eq(userWallets.userId, auth.userId),
            eq(userWallets.type, 'embedded')
          )
        )
        .limit(1)

      if (embedded) {
        await db
          .update(userWallets)
          .set({ isPrimary: true })
          .where(eq(userWallets.id, embedded.id))
      } else {
        // No embedded wallet - set the first remaining wallet as primary
        const [firstWallet] = await db
          .select({ id: userWallets.id })
          .from(userWallets)
          .where(eq(userWallets.userId, auth.userId))
          .limit(1)

        if (firstWallet) {
          await db
            .update(userWallets)
            .set({ isPrimary: true })
            .where(eq(userWallets.id, firstWallet.id))
        }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[removeWalletDirect] Error:', error instanceof Error ? error.message : 'Unknown error')
    return { success: false, error: 'Failed to remove wallet' }
  }
}

/**
 * Set a wallet as the primary (default) wallet for the authenticated user
 */
export async function setDefaultWalletDirect(
  token: string,
  walletId: string
): Promise<WalletResult> {
  try {
    const auth = await authenticateWithToken(token)
    if (!auth?.userId) {
      return { success: false, error: 'Authentication required' }
    }

    // Verify the wallet belongs to this user
    const [wallet] = await db
      .select({ id: userWallets.id })
      .from(userWallets)
      .where(
        and(
          eq(userWallets.id, walletId),
          eq(userWallets.userId, auth.userId)
        )
      )
      .limit(1)

    if (!wallet) {
      return { success: false, error: 'Wallet not found' }
    }

    // Unset all primary flags for this user
    await db
      .update(userWallets)
      .set({ isPrimary: false })
      .where(eq(userWallets.userId, auth.userId))

    // Set the requested wallet as primary
    await db
      .update(userWallets)
      .set({ isPrimary: true })
      .where(eq(userWallets.id, walletId))

    return { success: true }
  } catch (error) {
    console.error('[setDefaultWalletDirect] Error:', error instanceof Error ? error.message : 'Unknown error')
    return { success: false, error: 'Failed to set default wallet' }
  }
}

/**
 * Update the label of a wallet by address for the authenticated user.
 * Used when the Android app identifies the wallet app (e.g., "External Wallet" → "Phantom").
 */
export async function updateWalletLabelDirect(
  token: string,
  address: string,
  label: string
): Promise<WalletResult> {
  try {
    const auth = await authenticateWithToken(token)
    if (!auth?.userId) {
      return { success: false, error: 'Authentication required' }
    }

    const sanitized = sanitizeLabel(label)
    if (!sanitized) {
      return { success: false, error: 'Label is required' }
    }

    const [updated] = await db
      .update(userWallets)
      .set({ label: sanitized })
      .where(
        and(
          eq(userWallets.userId, auth.userId),
          eq(userWallets.address, address.trim())
        )
      )
      .returning({
        id: userWallets.id,
        address: userWallets.address,
        type: userWallets.type,
        connector: userWallets.connector,
        label: userWallets.label,
        isPrimary: userWallets.isPrimary,
        createdAt: userWallets.createdAt,
      })

    if (!updated) {
      return { success: false, error: 'Wallet not found' }
    }

    return { success: true, wallet: updated }
  } catch (error) {
    console.error('[updateWalletLabelDirect] Error:', error instanceof Error ? error.message : 'Unknown error')
    return { success: false, error: 'Failed to update wallet label' }
  }
}

/**
 * Ensure a wallet row exists in userWallets for a given userId + address.
 * Uses INSERT ... ON CONFLICT DO NOTHING so it's safe to call repeatedly.
 * Called server-side (no token auth needed — caller must already have userId).
 */
export async function ensureWalletExists(
  userId: string,
  address: string,
  type: 'embedded' | 'external',
  options?: { connector?: string; label?: string }
): Promise<void> {
  try {
    // Check if ANY wallets exist for this user (to decide isPrimary)
    const [{ value: walletCount }] = await db
      .select({ value: count() })
      .from(userWallets)
      .where(eq(userWallets.userId, userId))

    const isFirstWallet = Number(walletCount) === 0

    await db
      .insert(userWallets)
      .values({
        userId,
        address: address.trim(),
        type,
        connector: options?.connector || null,
        label: sanitizeLabel(options?.label) || (type === 'embedded' ? 'Desperse Wallet' : 'External Wallet'),
        isPrimary: isFirstWallet,
      })
      .onConflictDoNothing()
  } catch (error) {
    // Non-critical — log and swallow
    console.warn('[ensureWalletExists] Failed:', error instanceof Error ? error.message : 'Unknown error')
  }
}
