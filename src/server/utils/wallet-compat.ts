/**
 * Wallet compatibility utilities for multi-wallet support
 * Provides backward-compatible helpers that query user_wallets with fallback to users.walletAddress
 */

import { db } from '@/server/db'
import { users, userWallets } from '@/server/db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * Get the primary wallet address for a user.
 * Queries user_wallets for is_primary=true, falls back to users.walletAddress.
 */
export async function getPrimaryWalletAddress(userId: string): Promise<string | null> {
  try {
    // First try user_wallets table
    const [primaryWallet] = await db
      .select({ address: userWallets.address })
      .from(userWallets)
      .where(
        and(
          eq(userWallets.userId, userId),
          eq(userWallets.isPrimary, true)
        )
      )
      .limit(1)

    if (primaryWallet?.address) {
      return primaryWallet.address
    }

    // Fallback to users.walletAddress
    const [user] = await db
      .select({ walletAddress: users.walletAddress })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    return user?.walletAddress ?? null
  } catch (error) {
    console.error('[getPrimaryWalletAddress] Error:', error instanceof Error ? error.message : 'Unknown error')
    return null
  }
}

/**
 * Get wallet address for a transaction.
 * If requestedAddress is provided, verifies it belongs to the user in user_wallets.
 * If not found in user_wallets, REJECTS (does not fallback).
 * If no address provided, returns the primary wallet.
 */
export async function getWalletAddressForTransaction(
  userId: string,
  requestedAddress?: string
): Promise<string | null> {
  try {
    if (requestedAddress) {
      // Verify the requested address belongs to this user
      const [wallet] = await db
        .select({ address: userWallets.address })
        .from(userWallets)
        .where(
          and(
            eq(userWallets.userId, userId),
            eq(userWallets.address, requestedAddress)
          )
        )
        .limit(1)

      if (!wallet) {
        // REJECT: the requested address is not registered for this user
        console.warn(`[getWalletAddressForTransaction] Address ${requestedAddress.slice(0, 8)}... not found for user ${userId}`)
        return null
      }

      return wallet.address
    }

    // No address provided - return primary
    return await getPrimaryWalletAddress(userId)
  } catch (error) {
    console.error('[getWalletAddressForTransaction] Error:', error instanceof Error ? error.message : 'Unknown error')
    return null
  }
}
