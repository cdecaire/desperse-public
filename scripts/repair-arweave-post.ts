/**
 * Repair script for an Arweave edition post that was minted with Blob URLs.
 *
 * Steps:
 * 1. Run finalizeArweaveAssets to upload media + metadata to Arweave
 * 2. Update on-chain metadata URI for the Core collection
 * 3. Update on-chain metadata URI for the Core edition asset
 * 4. Update DB minted_metadata_uri
 *
 * Usage:
 *   npx tsx scripts/repair-arweave-post.ts <postId> [--force] [--yes]
 */

import dotenv from 'dotenv';
import * as readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { posts, purchases } from '../src/server/db/schema';

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

function confirm(message: string): Promise<boolean> {
	return new Promise((resolve) => {
		const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
		rl.question(`${message} [y/N] `, (answer) => {
			rl.close();
			resolve(answer.trim().toLowerCase() === 'y');
		});
	});
}

const skipConfirm = process.argv.includes('--yes') || process.argv.includes('-y');
const postId = process.argv[2];
if (!postId) {
	console.error('Usage: npx tsx scripts/repair-arweave-post.ts <postId> [--force] [--yes]');
	process.exit(1);
}

async function main() {
	console.log(`[repair-arweave] Starting repair for post ${postId}`);

	// Connect to DB
	const databaseUrl = getEnvVar('DATABASE_URL');
	const client = postgres(databaseUrl);
	const db = drizzle(client);

	// Step 1: Get post data
	const [post] = await db
		.select()
		.from(posts)
		.where(eq(posts.id, postId))
		.limit(1);

	if (!post) {
		console.error(`Post ${postId} not found`);
		process.exit(1);
	}

	console.log(`[repair-arweave] Post found:`, {
		storageType: post.storageType,
		arweaveStatus: post.arweaveStatus,
		arweaveMediaTxId: post.arweaveMediaTxId,
		arweaveMetadataTxId: post.arweaveMetadataTxId,
		masterMint: post.masterMint,
		creatorWallet: post.creatorWallet,
		currentSupply: post.currentSupply,
	});

	if (post.storageType !== 'arweave') {
		console.error('Post is not an Arweave edition');
		process.exit(1);
	}

	if (!post.creatorWallet) {
		console.error('Post has no creator wallet');
		process.exit(1);
	}

	if (!skipConfirm) {
		const ok = await confirm(
			`\nThis will update on-chain metadata and production DB for post ${postId}.\n` +
			`Collection: ${post.masterMint || 'none'}, supply: ${post.currentSupply}\n` +
			`Proceed?`
		);
		if (!ok) {
			console.log('Aborted.');
			await client.end();
			process.exit(0);
		}
	}

	// Step 2: Upload to Arweave if not already done
	let arweaveMetadataUrl: string;

	const forceReupload = process.argv.includes('--force');

	if (post.arweaveStatus === 'uploaded' && post.arweaveMetadataTxId && !forceReupload) {
		console.log(`[repair-arweave] Already uploaded to Arweave, metadata tx: ${post.arweaveMetadataTxId}`);
		console.log(`[repair-arweave] Use --force to re-upload metadata`);
		arweaveMetadataUrl = `https://arweave.net/${post.arweaveMetadataTxId}`;
	} else {
		// Reset status to 'funded' and clear metadata tx ID so finalizeArweaveAssets re-runs
		// (media tx ID is preserved — only metadata gets re-generated and re-uploaded)
		console.log(`[repair-arweave] Resetting arweaveStatus to 'funded', clearing metadata tx ID`);
		await db
			.update(posts)
			.set({
				arweaveStatus: 'funded',
				arweaveMetadataTxId: null,
				arweaveError: null,
			})
			.where(eq(posts.id, postId));

		console.log(`[repair-arweave] Running Arweave finalization...`);

		// Import and run finalization (this uses the server-side Turbo client)
		const { finalizeArweaveAssets } = await import(
			'../src/server/services/arweave/first-mint-finalization'
		);

		const result = await finalizeArweaveAssets(postId, post.creatorWallet);

		if (!result.success || !result.metadataUrl) {
			console.error(`[repair-arweave] Finalization failed:`, result);
			process.exit(1);
		}

		arweaveMetadataUrl = result.metadataUrl;
		console.log(`[repair-arweave] Arweave upload complete: ${arweaveMetadataUrl}`);
	}

	// Step 3: Update on-chain metadata if collection exists
	if (post.masterMint) {
		console.log(`[repair-arweave] Updating on-chain metadata for collection ${post.masterMint}...`);

		const { createUmi } = await import('@metaplex-foundation/umi-bundle-defaults');
		const {
			createSignerFromKeypair,
			signerIdentity,
			publicKey: umiPublicKey,
		} = await import('@metaplex-foundation/umi');
		const { mplCore, updateCollectionV1, fetchCollectionV1, updateV1, fetchAssetV1 } = await import(
			'@metaplex-foundation/mpl-core'
		);

		const heliusApiKey = getEnvVar('HELIUS_API_KEY');
		const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;
		const platformKeyStr = getEnvVar('PLATFORM_AUTHORITY_PRIVATE_KEY');

		// Parse platform keypair
		const { Keypair } = await import('@solana/web3.js');
		let platformKeypair: InstanceType<typeof Keypair>;
		try {
			// Try JSON array format
			const keyArray = JSON.parse(platformKeyStr);
			platformKeypair = Keypair.fromSecretKey(new Uint8Array(keyArray));
		} catch {
			// Try base58 format
			const bs58 = await import('bs58');
			platformKeypair = Keypair.fromSecretKey(bs58.default.decode(platformKeyStr));
		}

		const umi = createUmi(rpcUrl);
		const umiKeypair = umi.eddsa.createKeypairFromSecretKey(platformKeypair.secretKey);
		const signer = createSignerFromKeypair(umi, umiKeypair);
		umi.use(signerIdentity(signer));
		umi.use(mplCore());

		// Update collection metadata URI
		try {
			const collectionPubkey = umiPublicKey(post.masterMint);
			const collection = await fetchCollectionV1(umi, collectionPubkey);

			console.log(`[repair-arweave] Current collection URI: ${collection.uri}`);
			console.log(`[repair-arweave] New URI: ${arweaveMetadataUrl}`);

			if (collection.uri !== arweaveMetadataUrl) {
				await updateCollectionV1(umi, {
					collection: collectionPubkey,
					newUri: arweaveMetadataUrl,
				}).sendAndConfirm(umi);

				console.log(`[repair-arweave] Collection metadata URI updated on-chain`);
			} else {
				console.log(`[repair-arweave] Collection URI already correct`);
			}
		} catch (err) {
			console.error(`[repair-arweave] Failed to update collection:`, err instanceof Error ? err.message : err);
		}

		// Step 4: Update edition assets
		const editionPurchases = await db
			.select({ nftMint: purchases.nftMint })
			.from(purchases)
			.where(eq(purchases.postId, postId));

		for (const purchase of editionPurchases) {
			if (!purchase.nftMint) continue;

			try {
				const assetPubkey = umiPublicKey(purchase.nftMint);
				const asset = await fetchAssetV1(umi, assetPubkey);

				console.log(`[repair-arweave] Edition ${purchase.nftMint}: current URI = ${asset.uri}`);

				if (asset.uri !== arweaveMetadataUrl) {
					await updateV1(umi, {
						asset: assetPubkey,
						collection: umiPublicKey(post.masterMint!),
						newUri: arweaveMetadataUrl,
					}).sendAndConfirm(umi);

					console.log(`[repair-arweave] Edition ${purchase.nftMint} metadata URI updated on-chain`);
				} else {
					console.log(`[repair-arweave] Edition URI already correct`);
				}
			} catch (err) {
				console.error(`[repair-arweave] Failed to update edition ${purchase.nftMint}:`, err instanceof Error ? err.message : err);
			}
		}
	}

	// Step 5: Fetch the new Arweave metadata and update DB
	console.log(`[repair-arweave] Fetching new metadata from Arweave...`);
	let newMetadataJson: Record<string, unknown> | null = null;
	try {
		// Arweave gateway may take a moment — try a few times
		for (let attempt = 0; attempt < 3; attempt++) {
			const resp = await fetch(arweaveMetadataUrl, { redirect: 'follow' });
			if (resp.ok) {
				newMetadataJson = await resp.json() as Record<string, unknown>;
				break;
			}
			console.log(`[repair-arweave] Metadata not ready yet (${resp.status}), retrying in 5s...`);
			await new Promise(r => setTimeout(r, 5000));
		}
	} catch (err) {
		console.warn(`[repair-arweave] Could not fetch metadata from Arweave:`, err instanceof Error ? err.message : err);
	}

	console.log(`[repair-arweave] Updating DB minted_metadata_uri and minted_metadata_json...`);
	const updateData: Record<string, unknown> = {
		mintedMetadataUri: arweaveMetadataUrl,
		updatedAt: new Date(),
	};
	if (newMetadataJson) {
		updateData.mintedMetadataJson = newMetadataJson;
		console.log(`[repair-arweave] New metadata:`, JSON.stringify(newMetadataJson, null, 2));
	}
	await db
		.update(posts)
		.set(updateData)
		.where(eq(posts.id, postId));

	console.log(`[repair-arweave] Repair complete for post ${postId}`);
	console.log(`[repair-arweave] Arweave metadata URL: ${arweaveMetadataUrl}`);

	await client.end();
}

main().catch((err) => {
	console.error('[repair-arweave] Fatal error:', err);
	process.exit(1);
});
