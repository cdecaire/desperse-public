/**
 * Blockchain read helpers for compressed collectibles.
 *
 * The active Bubblegum/Umi mint flow lives in
 * `src/server/services/blockchain/compressed/mintCollectible.ts`.
 * This module intentionally keeps only post-mint lookup/status helpers.
 */

import { getSolanaClient } from './solanaClient';

/**
 * Check if a transaction has been confirmed
 * Uses Solana RPC to check signature status
 */
export async function checkTransactionStatus(txSignature: string): Promise<{
  status: 'pending' | 'confirmed' | 'finalized' | 'failed';
  error?: string;
}> {
  console.log(`[checkTransactionStatus] Checking signature: ${txSignature.slice(0, 20)}...`);
  try {
    const client = getSolanaClient();
    // Cast signature to the expected type for Solana Kit
    const result = await client.getSignatureStatuses([txSignature as unknown as Parameters<typeof client.getSignatureStatuses>[0][0]]).send();
    
    const status = result.value[0];
    console.log(`[checkTransactionStatus] Status result:`, status ? { confirmationStatus: status.confirmationStatus, err: status.err } : 'null');
    
    if (!status) {
      return { status: 'pending' };
    }
    
    if (status.err) {
      return { 
        status: 'failed',
        error: JSON.stringify(status.err),
      };
    }
    
    if (status.confirmationStatus === 'finalized') {
      return { status: 'finalized' };
    }
    
    if (status.confirmationStatus === 'confirmed') {
      return { status: 'confirmed' };
    }
    
    return { status: 'pending' };
  } catch (error) {
    console.error('Error checking transaction status:', error);
    return { status: 'pending' };
  }
}

