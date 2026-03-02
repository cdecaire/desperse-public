/**
 * Backfill NFT metadata for existing posts.
 *
 * Regenerates off-chain JSON metadata with the updated fields
 * (seller_fee_basis_points, collection, properties.creators) and re-uploads
 * to Vercel Blob, overwriting the existing metadata URL.
 *
 * Modes:
 *   --dry-run       Print what would change without uploading (default)
 *   --execute       Actually upload and update DB
 *   --post <id>     Process a single post (for testing)
 *   --type <type>   Filter by post type: 'collectible' or 'edition' (default: both)
 *
 * Usage:
 *   npx tsx scripts/backfill-nft-metadata.ts --post <postId> --dry-run
 *   npx tsx scripts/backfill-nft-metadata.ts --post <postId> --execute
 *   npx tsx scripts/backfill-nft-metadata.ts --type collectible --execute
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, isNotNull, inArray } from 'drizzle-orm';
import { posts, users, postAssets } from '../src/server/db/schema';
import { generateNftMetadata } from '../src/server/utils/nft-metadata';
import { stringsToCategories } from '../src/constants/categories';

// Load environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
dotenv.config({ path: resolve(projectRoot, '.env.local') });
dotenv.config({ path: resolve(projectRoot, '.env') });

function getEnvVar(key: string, defaultValue?: string): string {
	const value = process.env[key] || defaultValue;
	if (!value && defaultValue === undefined) {
		throw new Error(`Missing required environment variable: ${key}`);
	}
	return value || '';
}

// Parse args
const args = process.argv.slice(2);
const isDryRun = !args.includes('--execute');
const postIdArg = args.includes('--post') ? args[args.indexOf('--post') + 1] : null;
const typeArg = args.includes('--type') ? args[args.indexOf('--type') + 1] : null;

if (typeArg && typeArg !== 'collectible' && typeArg !== 'edition') {
	console.error('--type must be "collectible" or "edition"');
	process.exit(1);
}

async function main() {
	console.log(`[backfill-metadata] Mode: ${isDryRun ? 'DRY RUN' : 'EXECUTE'}`);
	if (postIdArg) console.log(`[backfill-metadata] Single post: ${postIdArg}`);
	if (typeArg) console.log(`[backfill-metadata] Type filter: ${typeArg}`);

	const databaseUrl = getEnvVar('DATABASE_URL');
	const client = postgres(databaseUrl);
	const db = drizzle(client);

	// Build query conditions
	const conditions = [isNotNull(posts.metadataUrl)];
	if (postIdArg) {
		conditions.push(eq(posts.id, postIdArg));
	}
	if (typeArg) {
		conditions.push(eq(posts.type, typeArg));
	}
	// Only include minted posts (have at least been collected/purchased once)
	conditions.push(isNotNull(posts.mintedAt));

	const postsToUpdate = await db
		.select({
			id: posts.id,
			caption: posts.caption,
			mediaUrl: posts.mediaUrl,
			coverUrl: posts.coverUrl,
			type: posts.type,
			maxSupply: posts.maxSupply,
			price: posts.price,
			currency: posts.currency,
			nftName: posts.nftName,
			nftSymbol: posts.nftSymbol,
			nftDescription: posts.nftDescription,
			sellerFeeBasisPoints: posts.sellerFeeBasisPoints,
			isMutable: posts.isMutable,
			categories: posts.categories,
			metadataUrl: posts.metadataUrl,
			mintedMetadataUri: posts.mintedMetadataUri,
			mintedMetadataJson: posts.mintedMetadataJson,
			userId: posts.userId,
		})
		.from(posts)
		.where(and(...conditions));

	console.log(`[backfill-metadata] Found ${postsToUpdate.length} post(s) to process`);

	if (postsToUpdate.length === 0) {
		console.log('[backfill-metadata] Nothing to do');
		await client.end();
		return;
	}

	// Collect unique user IDs
	const userIds = [...new Set(postsToUpdate.map(p => p.userId))];
	const creatorsResult = await db
		.select({
			id: users.id,
			displayName: users.displayName,
			usernameSlug: users.usernameSlug,
			walletAddress: users.walletAddress,
		})
		.from(users)
		.where(inArray(users.id, userIds));

	const creatorMap = new Map(creatorsResult.map(c => [c.id, c]));

	let updated = 0;
	let skipped = 0;
	let errors = 0;

	for (const post of postsToUpdate) {
		const creator = creatorMap.get(post.userId);
		if (!creator || !creator.walletAddress) {
			console.warn(`[backfill-metadata] Skipping post ${post.id}: creator wallet missing`);
			skipped++;
			continue;
		}

		// Fetch assets for multi-asset posts
		const assets = await db
			.select({
				id: postAssets.id,
				storageKey: postAssets.storageKey,
				mimeType: postAssets.mimeType,
				isPreviewable: postAssets.isPreviewable,
				isGated: postAssets.isGated,
			})
			.from(postAssets)
			.where(eq(postAssets.postId, post.id));

		// Generate new metadata
		const newMetadata = generateNftMetadata(
			{
				id: post.id,
				caption: post.caption,
				mediaUrl: post.mediaUrl,
				coverUrl: post.coverUrl,
				type: post.type as 'collectible' | 'edition',
				maxSupply: post.maxSupply,
				price: post.price,
				currency: post.currency,
				nftName: post.nftName,
				nftSymbol: post.nftSymbol,
				nftDescription: post.nftDescription,
				sellerFeeBasisPoints: post.sellerFeeBasisPoints,
				isMutable: post.isMutable,
				categories: post.categories ? stringsToCategories(post.categories) : null,
				protectDownload: assets.some(a => a.isGated),
				assetId: assets[0]?.id,
				assets: assets.length > 0
					? assets.map(a => ({
						id: a.id,
						url: a.storageKey,
						mimeType: a.mimeType,
						isPreviewable: a.isPreviewable,
					}))
					: undefined,
			},
			creator,
		);

		// Show diff of new fields
		const oldJson = post.mintedMetadataJson as Record<string, unknown> | null;
		console.log(`\n[backfill-metadata] Post ${post.id} (${post.type}):`);
		console.log(`  Name: ${newMetadata.name}`);
		console.log(`  Symbol: ${newMetadata.symbol}`);
		console.log(`  NEW seller_fee_basis_points: ${newMetadata.seller_fee_basis_points}`);
		console.log(`  NEW collection: ${JSON.stringify(newMetadata.collection)}`);
		console.log(`  NEW properties.creators: ${JSON.stringify((newMetadata.properties as any).creators)}`);
		if (oldJson) {
			console.log(`  OLD seller_fee_basis_points: ${(oldJson as any).seller_fee_basis_points ?? '(missing)'}`);
			console.log(`  OLD collection: ${JSON.stringify((oldJson as any).collection) ?? '(missing)'}`);
			console.log(`  OLD properties.creators: ${JSON.stringify((oldJson as any).properties?.creators) ?? '(missing)'}`);
		}
		console.log(`  Metadata URL: ${post.metadataUrl}`);

		if (isDryRun) {
			console.log(`  [DRY RUN] Would re-upload metadata`);
			updated++;
			continue;
		}

		// Execute: re-upload metadata to Vercel Blob
		try {
			const { uploadMetadataJson } = await import('../src/server/storage/blob');
			const result = await uploadMetadataJson(newMetadata, post.id, true); // allowOverwrite=true

			if (!('success' in result) || !result.success) {
				console.error(`  ERROR uploading metadata: ${(result as any).error}`);
				errors++;
				continue;
			}

			console.log(`  Uploaded: ${result.url}`);

			// Also update mintedMetadataJson snapshot so it reflects the backfill
			await db
				.update(posts)
				.set({
					mintedMetadataJson: newMetadata,
					updatedAt: new Date(),
				})
				.where(eq(posts.id, post.id));

			console.log(`  DB snapshot updated`);
			updated++;
		} catch (err) {
			console.error(`  ERROR: ${err instanceof Error ? err.message : err}`);
			errors++;
		}
	}

	console.log(`\n[backfill-metadata] Done: ${updated} updated, ${skipped} skipped, ${errors} errors`);
	await client.end();
}

main().catch((err) => {
	console.error('[backfill-metadata] Fatal error:', err);
	process.exit(1);
});
