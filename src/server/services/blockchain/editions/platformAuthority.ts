/**
 * Platform authority keypair for edition minting.
 * Server-only: uses server-held platform authority keypair for signing mint and edition instructions.
 */

import { Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { env } from '@/config/env';

/**
 * Parse a private key from env.
 * Supports base58 string or JSON array of numbers.
 */
function parsePrivateKey(raw: string): Uint8Array {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('PLATFORM_AUTHORITY_PRIVATE_KEY is missing');
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
      throw new Error('Invalid JSON array for PLATFORM_AUTHORITY_PRIVATE_KEY');
    }
  }

  // Base58 form
  try {
    return bs58.decode(trimmed);
  } catch (error) {
    throw new Error('Invalid base58 for PLATFORM_AUTHORITY_PRIVATE_KEY');
  }
}

let platformAuthorityKeypair: Keypair | null = null;

/**
 * Get the platform authority keypair from environment variable.
 * Caches the keypair for performance.
 */
export function getPlatformAuthorityKeypair(): Keypair {
  if (!platformAuthorityKeypair) {
    const secret = env.PLATFORM_AUTHORITY_PRIVATE_KEY;
    if (!secret) {
      throw new Error(
        'PLATFORM_AUTHORITY_PRIVATE_KEY is not configured. Please set PLATFORM_AUTHORITY_PRIVATE_KEY environment variable.'
      );
    }
    const secretKey = parsePrivateKey(secret);
    platformAuthorityKeypair = Keypair.fromSecretKey(secretKey);
  }
  return platformAuthorityKeypair;
}

/**
 * Get the platform authority public key.
 */
export function getPlatformAuthorityPublicKey(): PublicKey {
  return getPlatformAuthorityKeypair().publicKey;
}

/**
 * Verify that the platform authority public key matches the configured platform wallet address.
 * This is useful for ensuring consistency when using the same wallet for both.
 * 
 * @param expectedPlatformWalletAddress - The expected platform wallet address (from env)
 * @returns true if they match, false otherwise
 */
export function verifyPlatformAuthorityMatches(expectedPlatformWalletAddress: string): boolean {
  const authorityPublicKey = getPlatformAuthorityPublicKey();
  const expectedPublicKey = new PublicKey(expectedPlatformWalletAddress);
  return authorityPublicKey.equals(expectedPublicKey);
}

