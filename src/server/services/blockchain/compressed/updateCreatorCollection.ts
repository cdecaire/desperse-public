/**
 * Edit a creator's LIVE per-creator collectibles collection (server-only).
 *
 * The collection is created lazily on first collect (see ensureCreatorCollection),
 * after which its name/artwork can still be changed: the server holds the update
 * authority (the compressed umi identity), so we regenerate the off-chain metadata
 * and repoint the on-chain Core `uri` via updateCollection — no re-mint, and every
 * cNFT already verified into the collection picks up the new group metadata.
 *
 * Guards:
 *  - Requires an existing collection (collectionMint). Draft edits (no collection
 *    yet) are just profile overrides and never reach here.
 *  - Fee-subsidy circuit breaker: refuses while DISABLE_FEE_SUBSIDY is set (an edit
 *    spends fee-payer SOL).
 *  - Rate limit: at most one edit per COLLECTION_EDIT_LIMIT_DAYS, measured from the
 *    last edit (collectionUpdatedAt). The first edit is always allowed (null).
 *  - Verifies the fee-payer really is the collection's update authority before writing.
 *
 * Versioned metadata: uploads to a fresh URL each edit so the on-chain uri actually
 * changes and DAS/wallets re-index (an in-place overwrite would keep the stale URI).
 */

import { eq } from 'drizzle-orm';
import { publicKey } from '@metaplex-foundation/umi';
import { updateCollection, fetchCollection } from '@metaplex-foundation/mpl-core';

import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { env } from '@/config/env';
import { generateCreatorCollectionMetadata } from '@/server/utils/nft-metadata';
import { uploadCollectionMetadataJson } from '@/server/storage/blob';
import { getUmi } from './umiClient';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export type UpdateCreatorCollectionResult =
  | { success: true; url: string; txSignature: string; collectionMint: string }
  | {
      success: false;
      error: string;
      /** Present when the rejection is the rate-limit cooldown. */
      code?: 'rate_limited' | 'no_collection' | 'subsidy_disabled' | 'not_authority' | 'failed';
      /** Whole days remaining until the next edit is allowed (rate_limited only). */
      remainingDays?: number;
    };

interface UpdateCreatorCollectionInput {
  collectionName?: string | null;
  collectionImageUrl?: string | null;
}

/**
 * Persist the creator's collection name/image overrides and repoint the on-chain
 * collection metadata. Throws only on truly unexpected errors; expected rejections
 * (no collection, cooldown, subsidy off) return a structured failure.
 */
export async function updateCreatorCollection(
  creatorUserId: string,
  input: UpdateCreatorCollectionInput,
): Promise<UpdateCreatorCollectionResult> {
  // 1) Load the creator + current collection state.
  const [creator] = await db
    .select({
      id: users.id,
      collectionMint: users.collectionMint,
      collectionUpdatedAt: users.collectionUpdatedAt,
      displayName: users.displayName,
      usernameSlug: users.usernameSlug,
      avatarUrl: users.avatarUrl,
      collectionName: users.collectionName,
      collectionImageUrl: users.collectionImageUrl,
    })
    .from(users)
    .where(eq(users.id, creatorUserId))
    .limit(1);

  if (!creator) {
    return { success: false, code: 'failed', error: 'Creator not found' };
  }

  // 2) Must have a live collection — draft edits don't come through here.
  if (!creator.collectionMint) {
    return {
      success: false,
      code: 'no_collection',
      error: 'No collection exists yet. It is created the first time your work is collected.',
    };
  }

  // 3) Circuit breaker — never spend fee-payer SOL while subsidy is disabled.
  if (env.DISABLE_FEE_SUBSIDY) {
    return {
      success: false,
      code: 'subsidy_disabled',
      error: 'Collection editing is temporarily unavailable. Please try again later.',
    };
  }

  // 4) Rate limit: one edit per COLLECTION_EDIT_LIMIT_DAYS from the last edit.
  const limitDays = env.COLLECTION_EDIT_LIMIT_DAYS;
  if (creator.collectionUpdatedAt) {
    const elapsedDays = (Date.now() - creator.collectionUpdatedAt.getTime()) / MS_PER_DAY;
    if (elapsedDays < limitDays) {
      const remainingDays = Math.max(1, Math.ceil(limitDays - elapsedDays));
      return {
        success: false,
        code: 'rate_limited',
        error: `You can edit your collection again in ${remainingDays} day${remainingDays === 1 ? '' : 's'}.`,
        remainingDays,
      };
    }
  }

  try {
    const umi = getUmi();
    const collectionPk = publicKey(creator.collectionMint);

    // 5) Confirm the collection is readable AND the fee-payer holds update authority.
    const onchain = await fetchCollection(umi, collectionPk);
    const feePayer = umi.identity.publicKey.toString();
    if (onchain.updateAuthority.toString() !== feePayer) {
      console.error('[updateCreatorCollection] Fee-payer is not the update authority', {
        creatorUserId,
        collectionMint: creator.collectionMint,
        updateAuthority: onchain.updateAuthority.toString(),
      });
      return {
        success: false,
        code: 'not_authority',
        error: 'This collection cannot be edited (authority mismatch).',
      };
    }

    // 6) Regenerate metadata from the requested values. DB is written only AFTER
    //    the on-chain update succeeds (step 9), so a failed write never leaves the
    //    stored overrides out of sync with what's actually on-chain.
    const nextName = input.collectionName?.trim() || null;
    const nextImage = input.collectionImageUrl?.trim() || null;

    const metadata = generateCreatorCollectionMetadata({
      displayName: creator.displayName,
      usernameSlug: creator.usernameSlug,
      avatarUrl: creator.avatarUrl,
      collectionName: nextName,
      collectionImageUrl: nextImage,
    });

    // 7) Upload a VERSIONED JSON so the uri changes and DAS re-indexes.
    const version = Date.now();
    const upload = await uploadCollectionMetadataJson(
      metadata as unknown as Record<string, unknown>,
      creator.id,
      false,
      version,
    );
    if (!upload.success) {
      return { success: false, code: 'failed', error: upload.error };
    }

    // 8) Repoint the on-chain collection (name + uri). Authority defaults to the
    //    umi identity, which we just verified is the update authority.
    const { retryWithBackoff } = await import('@/lib/retryUtils');
    const { signature } = await retryWithBackoff(
      () =>
        updateCollection(umi, {
          collection: collectionPk,
          name: metadata.name,
          uri: upload.url,
        }).sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } }),
      { maxRetries: 3, baseDelayMs: 1000 },
    );

    const bs58 = (await import('bs58')).default;
    const txSignature = bs58.encode(signature);

    // 9) On-chain update committed → persist the overrides and stamp the edit time
    //    (starts the next cooldown window). Kept until now so DB mirrors chain.
    await db
      .update(users)
      .set({
        collectionName: nextName,
        collectionImageUrl: nextImage,
        collectionUpdatedAt: new Date(),
      })
      .where(eq(users.id, creator.id));

    console.info('[updateCreatorCollection] Repointed collection', {
      creatorUserId,
      collectionMint: creator.collectionMint,
      uri: upload.url,
      txSignature: txSignature.slice(0, 20) + '...',
    });

    return {
      success: true,
      url: upload.url,
      txSignature,
      collectionMint: creator.collectionMint,
    };
  } catch (err) {
    console.error('[updateCreatorCollection] On-chain update failed', {
      creatorUserId,
      collectionMint: creator.collectionMint,
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return {
      success: false,
      code: 'failed',
      error: 'Failed to update collection on-chain. Please try again.',
    };
  }
}
