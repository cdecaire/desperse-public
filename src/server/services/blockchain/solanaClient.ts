/**
 * Solana Client Service
 * Provides a configured Solana client using Helius RPC
 * 
 * Uses @solana/kit (Solana Kit) as the primary client library
 * per project requirements (not @solana/web3.js)
 */

import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';
import { getHeliusRpcUrl, isBlockchainEnabled } from '@/config/env';

// Solana network configuration
export const SOLANA_NETWORK = 'mainnet-beta' as const;

// Lamports per SOL (for conversions)
export const LAMPORTS_PER_SOL = 1_000_000_000;

// USDC decimals (6 decimals)
export const USDC_DECIMALS = 6;
export const USDC_BASE_UNITS = 1_000_000;

/**
 * Create a Solana RPC client configured with Helius
 * This is the main entry point for Solana blockchain interactions
 */
export function createSolanaClient() {
  if (!isBlockchainEnabled()) {
    throw new Error('Blockchain features are not enabled. Please set HELIUS_API_KEY.');
  }
  
  const rpcUrl = getHeliusRpcUrl();
  
  return createSolanaRpc(rpcUrl);
}

/**
 * Create a Solana RPC subscriptions client for WebSocket connections
 * Used for real-time transaction monitoring (optional)
 */
export function createSolanaSubscriptionsClient() {
  if (!isBlockchainEnabled()) {
    throw new Error('Blockchain features are not enabled. Please set HELIUS_API_KEY.');
  }
  
  // Convert HTTP URL to WebSocket URL
  const rpcUrl = getHeliusRpcUrl();
  const wsUrl = rpcUrl.replace('https://', 'wss://').replace('http://', 'ws://');
  
  return createSolanaRpcSubscriptions(wsUrl);
}

/**
 * Get a singleton RPC client instance
 * Use this for most operations to avoid creating multiple connections
 */
let rpcClientInstance: ReturnType<typeof createSolanaRpc> | null = null;

export function getSolanaClient() {
  if (!rpcClientInstance) {
    rpcClientInstance = createSolanaClient();
  }
  return rpcClientInstance;
}

/**
 * Check if a wallet has sufficient SOL balance for a transaction
 * @param walletAddress - The wallet address to check
 * @param requiredLamports - The minimum required balance in lamports
 */
export async function checkSolBalance(
  walletAddress: string,
  requiredLamports: bigint = BigInt(10_000) // ~0.00001 SOL minimum for fees
): Promise<{ sufficient: boolean; balance: bigint }> {
  try {
    const client = getSolanaClient();
    // Cast to the expected Address type
    const balanceResult = await client.getBalance(walletAddress as unknown as Parameters<typeof client.getBalance>[0]).send();
    const balance = balanceResult.value;
    
    return {
      sufficient: balance >= requiredLamports,
      balance,
    };
  } catch (error) {
    console.error('Error checking SOL balance:', error);
    throw new Error('Failed to check wallet balance');
  }
}

/**
 * Get the current slot for transaction confirmation
 */
export async function getCurrentSlot(): Promise<bigint> {
  const client = getSolanaClient();
  const slot = await client.getSlot().send();
  return slot;
}

/**
 * Get transaction status by signature
 * @param signature - The transaction signature to check
 */
export async function getTransactionStatus(
  signature: string
): Promise<'confirmed' | 'finalized' | 'pending' | 'failed'> {
  try {
    const client = getSolanaClient();
    // Cast signature to the expected type
    const result = await client.getSignatureStatuses([signature as unknown as Parameters<typeof client.getSignatureStatuses>[0][0]]).send();
    
    const status = result.value[0];
    
    if (!status) {
      return 'pending';
    }
    
    if (status.err) {
      return 'failed';
    }
    
    if (status.confirmationStatus === 'finalized') {
      return 'finalized';
    }
    
    if (status.confirmationStatus === 'confirmed') {
      return 'confirmed';
    }
    
    return 'pending';
  } catch (error) {
    console.error('Error getting transaction status:', error);
    return 'pending';
  }
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports: number | bigint): number {
  return Number(lamports) / LAMPORTS_PER_SOL;
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): bigint {
  return BigInt(Math.round(sol * LAMPORTS_PER_SOL));
}

/**
 * Convert base units to USDC
 */
export function baseUnitsToUsdc(baseUnits: number | bigint): number {
  return Number(baseUnits) / USDC_BASE_UNITS;
}

/**
 * Convert USDC to base units
 */
export function usdcToBaseUnits(usdc: number): bigint {
  return BigInt(Math.round(usdc * USDC_BASE_UNITS));
}

/**
 * Format a Solana address for display (truncated)
 */
export function formatAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2 + 3) {
    return address;
  }
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Get Solana explorer URL for a transaction or address
 */
export function getExplorerUrl(signature: string, type: 'tx' | 'address' = 'tx'): string {
  const baseUrl = 'https://www.orbmarkets.io';
  if (type === 'address') {
    // For addresses/tokens, use the token history page
    return `${baseUrl}/token/${signature}/history?hideSpam=true`;
  }
  // For transactions, use the tx endpoint
  return `${baseUrl}/tx/${signature}`;
}

