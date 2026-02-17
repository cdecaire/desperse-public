/**
 * Compressed NFT (cNFT) Minting Service
 * 
 * This service provides a clean abstraction for minting compressed NFTs.
 * 
 * Implementation: Uses Metaplex Bubblegum SDK with UMI to mint compressed NFTs.
 * Requires a Merkle tree to be set up (can use Helius's managed trees or self-managed).
 * 
 * Design principles:
 * - No Helius-specific IDs leak into business logic
 * - Only chain-agnostic fields stored in DB (nft_mint, tx_signature, status)
 * - Clean interface that can be swapped for different implementations
 */

import { env, getHeliusRpcUrl, getHeliusApiUrl } from '@/config/env';
import { getSolanaClient } from './solanaClient';

// Types for the mint service

export interface MintCnftInput {
  /** The recipient wallet address */
  recipientAddress: string;
  /** Metadata for the NFT */
  metadata: CnftMetadata;
  /** Creator wallet address (for royalties) */
  creatorAddress: string;
  /** Optional: post ID for reference (not stored on chain) */
  postId?: string;
}

export interface CnftMetadata {
  /** Name of the NFT */
  name: string;
  /** Symbol (short identifier) */
  symbol: string;
  /** Description */
  description: string;
  /** Image URL (must be publicly accessible) */
  image: string;
  /** Animation URL for video/audio (optional) */
  animationUrl?: string;
  /** External URL to the content */
  externalUrl?: string;
  /** NFT attributes */
  attributes?: Array<{
    traitType: string;
    value: string | number;
  }>;
  /** Seller fee basis points (royalties, e.g., 500 = 5%) */
  sellerFeeBasisPoints?: number;
}

export interface MintCnftResult {
  success: boolean;
  /** The transaction signature (if successful) */
  txSignature?: string;
  /** The NFT mint address (may be available after confirmation) */
  nftMint?: string;
  /** The asset ID (Helius DAS format, for lookups) */
  assetId?: string;
  /** Error message if failed */
  error?: string;
  /** Whether the transaction was submitted (vs preparation failed) */
  submitted?: boolean;
}

/**
 * Helius Mint API response types
 */
interface HeliusMintApiResponse {
  jsonrpc: string;
  id: string;
  result?: {
    signature: string;
    assetId?: string;
  };
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Mint a compressed NFT using Helius's REST API
 * 
 * Note: Helius doesn't provide a direct RPC method for minting cNFTs.
 * This implementation uses Helius's REST API endpoint for minting compressed NFTs.
 * 
 * @param input - The mint parameters
 * @returns The mint result with transaction signature
 */
export async function mintCompressedNft(input: MintCnftInput): Promise<MintCnftResult> {
  const { recipientAddress, metadata, creatorAddress } = input;
  
  // Validate inputs
  if (!recipientAddress || !creatorAddress) {
    return {
      success: false,
      error: 'Recipient and creator addresses are required',
    };
  }
  
  if (!metadata.name || !metadata.image) {
    return {
      success: false,
      error: 'NFT name and image are required',
    };
  }
  
  // Check if Helius API key is configured
  if (!env.HELIUS_API_KEY) {
    return {
      success: false,
      error: 'Blockchain features are not configured. Please contact support.',
    };
  }
  
  try {
    // NOTE: Helius doesn't provide a direct RPC method for minting compressed NFTs.
    // The `mintCompressedNft` RPC method doesn't exist, which is why we're getting
    // "Invalid request params" error.
    // 
    // For MVP, we need to either:
    // 1. Use Bubblegum SDK to build the transaction and have user sign it client-side
    // 2. Use a Helius managed tree service (if available)
    // 3. Find the correct Helius API endpoint for minting
    //
    // For now, return a clear error explaining the issue.
    console.error('mintCompressedNft called but Helius RPC method does not exist');
    console.error('Need to implement Bubblegum SDK flow or find correct Helius endpoint');
    
    return {
      success: false,
      error: 'Compressed NFT minting is not yet fully implemented. The Helius RPC method "mintCompressedNft" does not exist. We need to implement the Bubblegum SDK flow or use a different Helius endpoint.',
      submitted: false,
    };
    
    // TODO: Implement proper Bubblegum SDK flow:
    // 1. Set up UMI with Helius RPC
    // 2. Create or use existing Merkle tree
    // 3. Build mint transaction using mintV1 from @metaplex-foundation/mpl-bubblegum
    // 4. Return transaction for user to sign client-side via Privy
    // 5. Submit signed transaction
    
  } catch (error) {
    console.error('Error minting cNFT:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      submitted: false,
    };
  }
}

/**
 * Prepare a cNFT mint transaction without submitting
 * Returns a serialized transaction for the user to sign via their wallet
 * 
 * This is an alternative approach where the user signs the transaction
 * client-side using Privy, giving them full control.
 * 
 * Note: This requires a different Helius endpoint or direct Bubblegum usage
 * For MVP, we use the simpler mintCompressedNft which handles everything
 */
export async function prepareMintTransaction(_input: MintCnftInput): Promise<{
  success: boolean;
  /** Base64-encoded serialized transaction */
  transaction?: string;
  /** Message to sign */
  message?: string;
  error?: string;
}> {
  // For MVP, we use the direct mint approach via Helius
  // This method is a placeholder for future implementation
  // where we might want user-signed transactions
  
  return {
    success: false,
    error: 'User-signed minting not yet implemented. Use mintCompressedNft instead.',
  };
}

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

