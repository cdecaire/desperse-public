/**
 * Metaplex Core client setup for edition minting.
 * Uses Umi framework with platform authority as signer.
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  createSignerFromKeypair,
  signerIdentity,
  publicKey as umiPublicKey,
  type Umi,
  type Signer,
  type PublicKey as UmiPublicKey,
} from '@metaplex-foundation/umi';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { getHeliusRpcUrl } from '@/config/env';
import { getPlatformAuthorityKeypair } from './platformAuthority';

let umiInstance: Umi | null = null;

/**
 * Get a configured Umi instance with platform authority as the identity/payer.
 * Caches the instance for performance.
 */
export function getUmi(): Umi {
  if (!umiInstance) {
    const rpcUrl = getHeliusRpcUrl();
    const platformKeypair = getPlatformAuthorityKeypair();

    // Create Umi instance
    const umi = createUmi(rpcUrl);

    // Convert web3.js Keypair to Umi Keypair
    const umiKeypair = umi.eddsa.createKeypairFromSecretKey(platformKeypair.secretKey);

    // Create signer and set as identity (also default payer)
    const signer = createSignerFromKeypair(umi, umiKeypair);
    umi.use(signerIdentity(signer));

    // Register Core client
    umi.use(mplCore());

    umiInstance = umi;
  }

  return umiInstance;
}

/**
 * Get the platform authority as a Umi signer.
 */
export function getPlatformSigner(): Signer {
  const umi = getUmi();
  const platformKeypair = getPlatformAuthorityKeypair();
  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(platformKeypair.secretKey);
  return createSignerFromKeypair(umi, umiKeypair);
}

/**
 * Convert a string public key to Umi PublicKey format.
 */
export function toUmiPublicKey(address: string): UmiPublicKey {
  return umiPublicKey(address);
}

/**
 * Reset the cached Umi instance (useful for testing or config changes).
 */
export function resetUmiInstance(): void {
  umiInstance = null;
}
