/**
 * Metaplex Core fulfillment builder for edition purchases.
 *
 * Uses Core's simpler, cheaper model:
 * - First purchase: Create a Collection with MasterEdition plugin (~0.025 SOL)
 * - Each purchase: Create an Asset with Edition plugin linked to the collection (~0.003 SOL)
 *
 * Cost comparison:
 * - Token Metadata: ~0.022 SOL per mint
 * - Core Collection (first): ~0.025 SOL
 * - Core Asset (each): ~0.003 SOL
 *
 * Minting fee collected from buyers: 0.01 SOL (covers average cost)
 */

import { generateSigner } from '@metaplex-foundation/umi';
import {
  createCollection,
  create as createAsset,
  fetchCollection,
  type CollectionV1,
} from '@metaplex-foundation/mpl-core';
import { getUmi, getPlatformSigner, toUmiPublicKey } from './coreClient';

// ============================================================================
// Types
// ============================================================================

export interface CoreCollectionParams {
  creator: string;
  metadataUri: string;
  name: string;
  maxSupply?: number | null; // null = unlimited (open edition)
  sellerFeeBasisPoints?: number | null; // Creator royalties (0-10000), defaults to 0
}

export interface CoreCollectionResult {
  collectionAddress: string;
  signature: string;
}

export interface CoreEditionParams {
  buyer: string;
  creator: string;
  collectionAddress: string;
  metadataUri: string;
  name: string;
  editionNumber: number;
}

export interface CoreEditionResult {
  assetAddress: string;
  signature: string;
}

// ============================================================================
// Collection Creation (First Purchase)
// ============================================================================

/**
 * Create a Core Collection with the MasterEdition plugin.
 * This is called on the first purchase for a post.
 *
 * The collection serves as the "master" that groups all editions.
 * Platform is the update authority (required to create edition assets).
 * Creator is added as an Update Delegate so they can update metadata if mutability is enabled.
 */
export async function createCoreCollection(
  params: CoreCollectionParams
): Promise<CoreCollectionResult> {
  const { creator, metadataUri, name, maxSupply, sellerFeeBasisPoints } = params;

  // Convert basis points to percentage for display (500 = 5%)
  const royaltyPercent = sellerFeeBasisPoints ? (sellerFeeBasisPoints / 100).toFixed(2) : '0';

  console.log('[createCoreCollection] Creating collection:', {
    creator,
    name,
    maxSupply: maxSupply ?? 'unlimited',
    royaltyPercent: `${royaltyPercent}%`,
    metadataUri: metadataUri.slice(0, 50) + '...',
  });

  const umi = getUmi();
  const collectionSigner = generateSigner(umi);
  const creatorPubkey = toUmiPublicKey(creator);

  // Build the collection with MasterEdition and UpdateDelegate plugins
  // Platform remains as update authority so it can create edition assets
  // Creator is added as an additional delegate so they can update metadata
  // Use 'finalized' commitment to ensure collection is fully confirmed before returning
  // This prevents race conditions where the collection isn't queryable yet
  const result = await createCollection(umi, {
    collection: collectionSigner,
    name,
    uri: metadataUri,
    plugins: [
      {
        type: 'MasterEdition',
        maxSupply: maxSupply !== null && maxSupply !== undefined ? maxSupply : undefined,
        name: name,
        uri: metadataUri,
      },
      {
        type: 'UpdateDelegate',
        additionalDelegates: [creatorPubkey],
      },
      // Add Royalties plugin - creator receives royalties on secondary sales
      // basisPoints is 0-10000 (0-100%), ruleSet: None means royalties are optional/not enforced
      {
        type: 'Royalties',
        basisPoints: sellerFeeBasisPoints ?? 0,
        creators: [
          {
            address: creatorPubkey,
            percentage: 100,
          },
        ],
        ruleSet: { __kind: 'None' },
      },
    ],
  }).sendAndConfirm(umi, { confirm: { commitment: 'finalized' } });

  const signature = Buffer.from(result.signature).toString('base64');
  const collectionAddress = collectionSigner.publicKey.toString();

  console.log('[createCoreCollection] Collection created:', {
    collectionAddress,
    signature: signature.slice(0, 20) + '...',
  });

  return {
    collectionAddress,
    signature,
  };
}

// ============================================================================
// Edition Creation (Each Purchase)
// ============================================================================

/**
 * Create a Core Asset with the Edition plugin.
 * This is called for each purchase after the collection exists.
 *
 * The asset is linked to the collection and has an edition number.
 */
export async function createCoreEdition(
  params: CoreEditionParams
): Promise<CoreEditionResult> {
  const { buyer, creator, collectionAddress, metadataUri, name, editionNumber } = params;

  console.log('[createCoreEdition] Creating edition:', {
    buyer,
    creator,
    collectionAddress,
    editionNumber,
    name,
  });

  const umi = getUmi();
  const assetSigner = generateSigner(umi);
  const buyerPubkey = toUmiPublicKey(buyer);
  const collectionPubkey = toUmiPublicKey(collectionAddress);

  // Fetch the collection with retry and exponential backoff
  // May not be immediately available after creation due to RPC propagation delays
  let collection: Awaited<ReturnType<typeof fetchCollection>> | null = null;
  const maxRetries = 10;
  const baseDelayMs = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      collection = await fetchCollection(umi, collectionPubkey);
      break;
    } catch (error) {
      const isNotFound = error instanceof Error && error.message.includes('not found');
      if (isNotFound && attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, 8s, 8s, 8s... (capped at 8s)
        const delayMs = Math.min(baseDelayMs * Math.pow(2, attempt - 1), 8000);
        console.log(`[createCoreEdition] Collection not found yet, retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        throw error;
      }
    }
  }

  if (!collection) {
    throw new Error(`Collection not found at ${collectionAddress} after ${maxRetries} attempts`);
  }

  // Create the edition asset
  // Owner is the buyer, platform signs as collection authority
  const result = await createAsset(umi, {
    asset: assetSigner,
    collection: collection,
    name: `${name} #${editionNumber}`,
    uri: metadataUri,
    owner: buyerPubkey,
    authority: getPlatformSigner(),
    plugins: [
      {
        type: 'Edition',
        number: editionNumber,
      },
    ],
  }).sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } });

  const signature = Buffer.from(result.signature).toString('base64');
  const assetAddress = assetSigner.publicKey.toString();

  console.log('[createCoreEdition] Edition created:', {
    assetAddress,
    editionNumber,
    signature: signature.slice(0, 20) + '...',
  });

  return {
    assetAddress,
    signature,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a collection exists on-chain.
 */
export async function collectionExists(collectionAddress: string): Promise<boolean> {
  try {
    const umi = getUmi();
    const collectionPubkey = toUmiPublicKey(collectionAddress);
    await fetchCollection(umi, collectionPubkey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get collection details if it exists.
 */
export async function getCollectionDetails(
  collectionAddress: string
): Promise<CollectionV1 | null> {
  try {
    const umi = getUmi();
    const collectionPubkey = toUmiPublicKey(collectionAddress);
    return await fetchCollection(umi, collectionPubkey);
  } catch {
    return null;
  }
}
