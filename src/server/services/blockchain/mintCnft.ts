/**
 * Blockchain read helpers for compressed collectibles.
 *
 * The active Bubblegum/Umi mint flow lives in
 * `src/server/services/blockchain/compressed/mintCollectible.ts`.
 * This module intentionally keeps only post-mint lookup/status helpers.
 */

import { env, getHeliusRpcUrl } from '@/config/env';
import { getSolanaClient } from './solanaClient';

/**
 * Get asset details from Helius DAS API by asset ID
 * Useful for fetching NFT details after minting
 */
export async function getAssetDetails(assetId: string): Promise<{
  success: boolean;
  asset?: {
    id: string;
    content: {
      json_uri: string;
      metadata: {
        name: string;
        symbol: string;
        description: string;
      };
    };
    ownership: {
      owner: string;
    };
    compression?: {
      compressed: boolean;
      tree: string;
      leaf_index: number;
    };
  };
  error?: string;
}> {
  if (!env.HELIUS_API_KEY) {
    return {
      success: false,
      error: 'Helius API key not configured',
    };
  }
  
  try {
    const rpcUrl = getHeliusRpcUrl();
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `asset-${Date.now()}`,
        method: 'getAsset',
        params: {
          id: assetId,
        },
      }),
    });
    
    if (!response.ok) {
      return {
        success: false,
        error: 'Failed to fetch asset details',
      };
    }
    
    const data = await response.json();
    
    if (data.error) {
      return {
        success: false,
        error: data.error.message || 'Failed to fetch asset',
      };
    }
    
    return {
      success: true,
      asset: data.result,
    };
  } catch (error) {
    console.error('Error fetching asset details:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

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

