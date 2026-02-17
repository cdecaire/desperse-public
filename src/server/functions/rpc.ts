/**
 * RPC health check server function
 * Checks if RPC endpoint is available and responding
 * 
 * IMPORTANT: Uses free public RPC endpoint to avoid consuming Helius API credits
 * This is a lightweight health check - actual transactions still use Helius
 */

import { createServerFn } from '@tanstack/react-start'
import { createSolanaRpc } from '@solana/kit'

const HEALTH_CHECK_TIMEOUT_MS = 5_000 // 5 second timeout

// Use free public RPC for health checks to avoid consuming Helius API credits
// This endpoint is rate-limited but sufficient for periodic health checks
const PUBLIC_RPC_URL = 'https://api.mainnet-beta.solana.com'

/**
 * Check RPC health by making a simple RPC call to a free public endpoint
 * Returns true if RPC is healthy, false otherwise
 * 
 * Note: This uses the free public RPC, not Helius, to avoid consuming API credits
 */
export const checkRpcHealth = createServerFn({
  method: 'GET',
}).handler(async (): Promise<{ healthy: boolean; error?: string }> => {
  try {
    // Create a client using free public RPC (not Helius) to avoid consuming credits
    const publicClient = createSolanaRpc(PUBLIC_RPC_URL)
    
    // Use a cheap RPC call: getSlot() with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('RPC health check timeout')), HEALTH_CHECK_TIMEOUT_MS)
    })

    const healthCheckPromise = publicClient.getSlot().send()
    
    await Promise.race([healthCheckPromise, timeoutPromise])
    
    // If we get here, RPC is healthy
    return { healthy: true }
  } catch (error) {
    console.warn('RPC health check failed:', error)
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
})

