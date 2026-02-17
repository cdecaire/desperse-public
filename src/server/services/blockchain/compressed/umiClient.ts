/**
 * Umi client configured for Bubblegum compressed NFT mints.
 * Server-only: uses server-held fee payer / authority keypair and shared Merkle tree.
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplBubblegum } from '@metaplex-foundation/mpl-bubblegum';
import { signerIdentity, publicKey as umiPublicKey, createSignerFromKeypair } from '@metaplex-foundation/umi';
import bs58 from 'bs58';
import { getHeliusRpcUrl, env } from '@/config/env';

let umiInstance: ReturnType<typeof createUmi> | null = null;

/**
 * Parse a private key from env.
 * Supports base58 string or JSON array of numbers.
 */
function parsePrivateKey(raw: string): Uint8Array {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('COMPRESSED_MINT_FEE_PAYER_PRIVATE_KEY is missing');
  }

  // JSON array form
  if (trimmed.startsWith('[')) {
    try {
      const arr = JSON.parse(trimmed);
      if (!Array.isArray(arr)) {
        throw new Error('Invalid key format: expected array');
      }
      return new Uint8Array(arr);
    } catch (error) {
      throw new Error('Invalid JSON array for COMPRESSED_MINT_FEE_PAYER_PRIVATE_KEY');
    }
  }

  // Base58 form
  try {
    return bs58.decode(trimmed);
  } catch (error) {
    throw new Error('Invalid base58 for COMPRESSED_MINT_FEE_PAYER_PRIVATE_KEY');
  }
}

export function getUmi() {
  if (umiInstance) return umiInstance;

  const rpcUrl = getHeliusRpcUrl();
  const secretKey = parsePrivateKey(env.COMPRESSED_MINT_FEE_PAYER_PRIVATE_KEY);

  // Initialize Umi
  const umi = createUmi(rpcUrl).use(mplBubblegum());

  const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
  const signer = createSignerFromKeypair(umi, keypair);

  umi.use(signerIdentity(signer));

  umiInstance = umi;
  
  // Log RPC endpoint for debugging cluster mismatches
  console.info('[umi] Initialized with RPC:', rpcUrl);
  console.info('[umi] Cluster detection:', {
    isMainnet: rpcUrl.includes('mainnet'),
    isDevnet: rpcUrl.includes('devnet'),
    isTestnet: rpcUrl.includes('testnet'),
    isHelius: rpcUrl.includes('helius'),
  });
  
  return umiInstance;
}

/**
 * Get the RPC endpoint URL from the Umi instance
 * Useful for debugging cluster mismatches
 */
export function getUmiRpcEndpoint(): string {
  const umi = getUmi();
  // Try multiple ways to get the endpoint
  const rpc = (umi.rpc as any);
  return rpc.getEndpoint?.() || rpc.endpoint || rpc.url || 'unknown';
}

/**
 * Validate Merkle tree address from env; returns Umi public key
 */
export function getMerkleTreePublicKey() {
  const { BUBBLEGUM_TREE_ADDRESS } = env;
  if (!BUBBLEGUM_TREE_ADDRESS || !BUBBLEGUM_TREE_ADDRESS.trim()) {
    throw new Error('BUBBLEGUM_TREE_ADDRESS env is missing');
  }

  try {
    return umiPublicKey(BUBBLEGUM_TREE_ADDRESS.trim());
  } catch (error) {
    throw new Error('Invalid BUBBLEGUM_TREE_ADDRESS');
  }
}

