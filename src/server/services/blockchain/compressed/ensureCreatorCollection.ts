/**
 * Per-creator MPL Core collection for free collectibles (server-only).
 *
 * A creator's collectibles are verified into a single Core collection so wallets
 * and marketplaces group them under the creator's name. The collection is created
 * lazily on the creator's first collectible mint, its address stored on
 * `users.collection_mint`, and reused by every later collectible (and every copy
 * any collector mints).
 *
 * Authority: the collection's update authority is the same server fee-payer key
 * that signs the cNFT mint (the compressed umi identity), so attaching a verified
 * collection on `mintV2` needs no extra signer. Update authority stays server-side,
 * which also enables a future "edit collection name/art" feature without re-minting.
 *
 * Failure is non-fatal: any error (or the fee-subsidy circuit breaker) returns
 * null and the caller mints the collectible ungrouped, retrying on the next collect.
 */

import { generateSigner } from '@metaplex-foundation/umi';
import { createCollection, fetchCollection } from '@metaplex-foundation/mpl-core';
import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { env } from '@/config/env';
import { generateCreatorCollectionMetadata } from '@/server/utils/nft-metadata';
import { uploadCollectionMetadataJson } from '@/server/storage/blob';
import { getUmi } from './umiClient';

/**
 * Ensure the creator has a collectibles collection and return its mint address,
 * or null if one can't be established right now (caller mints ungrouped).
 */
export async function ensureCreatorCollection(creatorUserId: string): Promise<string | null> {
	try {
		// 1) Reuse an already-created collection.
		const [creator] = await db
			.select({
				id: users.id,
				collectionMint: users.collectionMint,
				displayName: users.displayName,
				usernameSlug: users.usernameSlug,
				avatarUrl: users.avatarUrl,
				collectionName: users.collectionName,
				collectionImageUrl: users.collectionImageUrl,
			})
			.from(users)
			.where(eq(users.id, creatorUserId))
			.limit(1);

		if (!creator) return null;
		if (creator.collectionMint) return creator.collectionMint;

		// 2) Circuit breaker: never spend on new collections while subsidy is off.
		if (env.DISABLE_FEE_SUBSIDY) {
			console.warn('[ensureCreatorCollection] Fee subsidy disabled — minting ungrouped', {
				creatorUserId,
			});
			return null;
		}

		// 3) Generate + upload the collection metadata (name/image from the profile).
		const metadata = generateCreatorCollectionMetadata(creator);
		const upload = await uploadCollectionMetadataJson(
			metadata as unknown as Record<string, unknown>,
			creator.id,
		);
		if (!upload.success) {
			console.error('[ensureCreatorCollection] Metadata upload failed', {
				creatorUserId,
				error: upload.error,
			});
			return null;
		}

		// 4) Create the Core collection. Update authority defaults to the umi identity
		//    (the server fee-payer key) — the same signer used for the cNFT mint.
		//    'finalized' so the collection is queryable before any mint verifies into it.
		const umi = getUmi();
		const collectionSigner = generateSigner(umi);
		await createCollection(umi, {
			collection: collectionSigner,
			name: metadata.name,
			uri: upload.url,
			// REQUIRED for compressed NFTs: the BubblegumV2 plugin authorizes the
			// Bubblegum program to verify cNFTs into this Core collection. Without it
			// every mintV2 into the collection fails (CollectionMustHaveBubblegumPlugin,
			// 6049) — which would fail the collect itself. Verified on devnet.
			plugins: [{ type: 'BubblegumV2' }],
		}).sendAndConfirm(umi, { confirm: { commitment: 'finalized' } });

		const collectionAddress = collectionSigner.publicKey.toString();

		// Wait until the freshly-created collection is actually readable before the
		// caller mints into it — even at 'finalized' the account can lag on the node
		// running the mint's preflight, which would fail the first collect. Best-effort
		// (mirrors editions createCoreEdition); persist regardless so it's reused after.
		for (let attempt = 1; attempt <= 12; attempt++) {
			try {
				await fetchCollection(umi, collectionSigner.publicKey);
				break;
			} catch {
				await new Promise((r) => setTimeout(r, 2000));
			}
		}

		// 5) Atomically claim the slot — only the first writer wins. A concurrent
		//    first-mint that also created a collection loses here; its on-chain
		//    collection is orphaned (rare, accepted — mirrors editions masterMint).
		const persisted = await db
			.update(users)
			.set({ collectionMint: collectionAddress })
			.where(and(eq(users.id, creator.id), isNull(users.collectionMint)))
			.returning({ collectionMint: users.collectionMint });

		if (persisted.length > 0) {
			console.info('[ensureCreatorCollection] Created collection', {
				creatorUserId,
				collectionAddress,
			});
			return collectionAddress;
		}

		// Lost the race — reuse the winner's collection.
		const [winner] = await db
			.select({ collectionMint: users.collectionMint })
			.from(users)
			.where(eq(users.id, creator.id))
			.limit(1);
		console.info('[ensureCreatorCollection] Lost creation race, reusing existing', {
			creatorUserId,
			collectionAddress: winner?.collectionMint,
		});
		return winner?.collectionMint ?? collectionAddress;
	} catch (err) {
		// Non-fatal: mint ungrouped and retry on the next collect.
		console.error('[ensureCreatorCollection] Failed — minting ungrouped', {
			creatorUserId,
			error: err instanceof Error ? err.message : 'Unknown',
		});
		return null;
	}
}
