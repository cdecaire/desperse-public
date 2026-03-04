/**
 * Cleanup Orphaned Vercel Blob Files
 *
 * Finds and deletes Vercel Blob files that are not referenced by any database record.
 * This catches:
 *   - Images uploaded in the post form but never published
 *   - Old profile pictures/headers replaced by new ones
 *   - Feedback screenshots from deleted feedback
 *   - Media from posts that were hard-deleted (if any)
 *
 * IMPORTANT: Vercel Blob deletion is PERMANENT. There is no undo, recycle bin,
 * or versioning. This script runs in DRY-RUN mode by default.
 *
 * Usage:
 *   pnpm tsx scripts/cleanup-orphaned-blobs.ts                     # Dry run (list only)
 *   pnpm tsx scripts/cleanup-orphaned-blobs.ts --execute            # Actually delete
 *   pnpm tsx scripts/cleanup-orphaned-blobs.ts --min-age-days 30    # Only blobs older than 30 days (default: 7)
 *   pnpm tsx scripts/cleanup-orphaned-blobs.ts --prefix media       # Only scan media/ prefix (default: all)
 *   pnpm tsx scripts/cleanup-orphaned-blobs.ts --limit 100          # Limit deletions per run
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { list, del } from "@vercel/blob";
import {
	posts,
	postAssets,
	users,
	betaFeedback,
} from "../src/server/db/schema";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");

dotenv.config({ path: resolve(projectRoot, ".env.local") });
dotenv.config({ path: resolve(projectRoot, ".env") });

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface Config {
	execute: boolean;
	minAgeDays: number;
	prefix: string | undefined;
	limit: number;
}

function parseArgs(): Config {
	const args = process.argv.slice(2);
	const config: Config = {
		execute: false,
		minAgeDays: 7,
		prefix: undefined,
		limit: Infinity,
	};

	for (let i = 0; i < args.length; i++) {
		switch (args[i]) {
			case "--execute":
				config.execute = true;
				break;
			case "--min-age-days":
				config.minAgeDays = Number.parseInt(args[++i], 10);
				if (Number.isNaN(config.minAgeDays) || config.minAgeDays < 1) {
					console.error("--min-age-days must be a positive integer");
					process.exit(1);
				}
				break;
			case "--prefix":
				config.prefix = args[++i];
				break;
			case "--limit":
				config.limit = Number.parseInt(args[++i], 10);
				if (Number.isNaN(config.limit) || config.limit < 1) {
					console.error("--limit must be a positive integer");
					process.exit(1);
				}
				break;
			default:
				console.error(`Unknown argument: ${args[i]}`);
				process.exit(1);
		}
	}

	return config;
}

// ---------------------------------------------------------------------------
// Database helpers
// ---------------------------------------------------------------------------

function getDatabaseUrl(): string {
	const url = process.env.DATABASE_URL;
	if (!url) {
		throw new Error("DATABASE_URL is required");
	}
	return url;
}

/**
 * Build a Set of ALL blob URLs referenced anywhere in the database.
 *
 * Columns checked (exhaustive as of 2026-03):
 *   posts.mediaUrl         — Primary media (NOT NULL, always present)
 *   posts.coverUrl         — Cover image for audio/document/3D posts
 *   posts.metadataUrl      — NFT metadata JSON blob
 *   posts.mintedMetadataUri — Snapshot of metadata URL at first mint (may differ from metadataUrl)
 *   postAssets.storageKey  — Multi-asset files and gated downloads
 *   users.avatarUrl        — Profile avatar
 *   users.headerBgUrl      — Profile header background
 *   betaFeedback.imageUrl  — Feedback screenshots
 *
 * NOTE: posts with isDeleted=true are INCLUDED. Soft-deleted posts still
 * reference their blobs (and may have minted NFTs pointing to them).
 */
async function buildReferencedUrlSet(
	db: ReturnType<typeof drizzle>,
): Promise<Set<string>> {
	const urls = new Set<string>();

	console.log("[buildReferencedUrlSet] Querying all referenced blob URLs...");

	// 1. posts — 4 URL columns. Query ALL posts (including soft-deleted).
	const postRows = await db
		.select({
			mediaUrl: posts.mediaUrl,
			coverUrl: posts.coverUrl,
			metadataUrl: posts.metadataUrl,
			mintedMetadataUri: posts.mintedMetadataUri,
		})
		.from(posts);

	for (const row of postRows) {
		if (row.mediaUrl) urls.add(row.mediaUrl);
		if (row.coverUrl) urls.add(row.coverUrl);
		if (row.metadataUrl) urls.add(row.metadataUrl);
		if (row.mintedMetadataUri) urls.add(row.mintedMetadataUri);
	}
	console.log(
		`  posts: ${postRows.length} rows → ${urls.size} unique URLs so far`,
	);

	// 2. postAssets — storageKey (includes gated downloads and carousel items)
	const assetRows = await db
		.select({ storageKey: postAssets.storageKey })
		.from(postAssets);

	const beforeAssets = urls.size;
	for (const row of assetRows) {
		if (row.storageKey) urls.add(row.storageKey);
	}
	console.log(
		`  postAssets: ${assetRows.length} rows → +${urls.size - beforeAssets} new URLs`,
	);

	// 3. users — avatarUrl, headerBgUrl
	const userRows = await db
		.select({ avatarUrl: users.avatarUrl, headerBgUrl: users.headerBgUrl })
		.from(users);

	const beforeUsers = urls.size;
	for (const row of userRows) {
		if (row.avatarUrl) urls.add(row.avatarUrl);
		if (row.headerBgUrl) urls.add(row.headerBgUrl);
	}
	console.log(
		`  users: ${userRows.length} rows → +${urls.size - beforeUsers} new URLs`,
	);

	// 4. betaFeedback — imageUrl
	const feedbackRows = await db
		.select({ imageUrl: betaFeedback.imageUrl })
		.from(betaFeedback);

	const beforeFeedback = urls.size;
	for (const row of feedbackRows) {
		if (row.imageUrl) urls.add(row.imageUrl);
	}
	console.log(
		`  betaFeedback: ${feedbackRows.length} rows → +${urls.size - beforeFeedback} new URLs`,
	);

	console.log(`\n  Total referenced URLs: ${urls.size}`);
	return urls;
}

// ---------------------------------------------------------------------------
// Blob listing
// ---------------------------------------------------------------------------

interface BlobEntry {
	url: string;
	pathname: string;
	uploadedAt: Date;
	size: number;
}

/**
 * List ALL blobs in the store, paginating through the full list.
 */
async function listAllBlobs(prefix?: string): Promise<BlobEntry[]> {
	const allBlobs: BlobEntry[] = [];
	let cursor: string | undefined;
	let page = 0;

	console.log(
		`[listAllBlobs] Listing blobs${prefix ? ` with prefix "${prefix}"` : ""}...`,
	);

	do {
		const result = await list({
			cursor,
			limit: 1000,
			...(prefix && { prefix }),
		});

		for (const blob of result.blobs) {
			allBlobs.push({
				url: blob.url,
				pathname: blob.pathname,
				uploadedAt: new Date(blob.uploadedAt),
				size: blob.size,
			});
		}

		cursor = result.hasMore ? result.cursor : undefined;
		page++;
		if (page % 5 === 0) {
			console.log(`  ...listed ${allBlobs.length} blobs so far (page ${page})`);
		}
	} while (cursor);

	console.log(`  Total blobs in store: ${allBlobs.length}`);
	return allBlobs;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	const config = parseArgs();
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - config.minAgeDays);

	console.log("=== Orphaned Blob Cleanup ===");
	console.log(`  Mode:         ${config.execute ? "🔴 EXECUTE (will delete!)" : "🟢 DRY RUN (safe)"}`);
	console.log(`  Min age:      ${config.minAgeDays} days (before ${cutoffDate.toISOString()})`);
	console.log(`  Prefix:       ${config.prefix || "(all)"}`);
	console.log(`  Delete limit: ${config.limit === Infinity ? "unlimited" : config.limit}`);
	console.log("");

	// Step 1: Build whitelist from database
	const dbUrl = getDatabaseUrl();
	const client = postgres(dbUrl);
	const db = drizzle(client);

	let referencedUrls: Set<string>;
	try {
		referencedUrls = await buildReferencedUrlSet(db);
	} finally {
		await client.end();
	}

	// Step 2: List all blobs in Vercel Blob storage
	const allBlobs = await listAllBlobs(config.prefix);

	// Step 3: Find orphans (not referenced + older than cutoff)
	const orphans: BlobEntry[] = [];
	let skippedTooNew = 0;
	let skippedReferenced = 0;

	for (const blob of allBlobs) {
		if (referencedUrls.has(blob.url)) {
			skippedReferenced++;
			continue;
		}
		if (blob.uploadedAt > cutoffDate) {
			skippedTooNew++;
			continue;
		}
		orphans.push(blob);
	}

	console.log("\n=== Results ===");
	console.log(`  Total blobs:          ${allBlobs.length}`);
	console.log(`  Referenced (safe):    ${skippedReferenced}`);
	console.log(`  Too new (< ${config.minAgeDays} days): ${skippedTooNew}`);
	console.log(`  Orphaned:             ${orphans.length}`);

	if (orphans.length === 0) {
		console.log("\nNo orphaned blobs found. Nothing to do.");
		return;
	}

	// Calculate total size
	const totalBytes = orphans.reduce((sum, b) => sum + b.size, 0);
	const totalMB = (totalBytes / 1024 / 1024).toFixed(2);
	console.log(`  Orphaned size:        ${totalMB} MB`);

	// Limit deletions if configured
	const toDelete = orphans.slice(0, config.limit);
	if (toDelete.length < orphans.length) {
		console.log(
			`\n  (Limiting to ${config.limit} deletions out of ${orphans.length} orphans)`,
		);
	}

	// Print orphan details (first 50)
	const previewCount = Math.min(toDelete.length, 50);
	console.log(`\n--- Orphaned blobs (showing ${previewCount} of ${toDelete.length}) ---`);
	for (let i = 0; i < previewCount; i++) {
		const b = toDelete[i];
		const ageDays = Math.floor(
			(Date.now() - b.uploadedAt.getTime()) / (1000 * 60 * 60 * 24),
		);
		const sizeMB = (b.size / 1024 / 1024).toFixed(2);
		console.log(
			`  ${b.pathname} (${sizeMB} MB, ${ageDays} days old)`,
		);
	}
	if (toDelete.length > previewCount) {
		console.log(`  ... and ${toDelete.length - previewCount} more`);
	}

	// Step 4: Delete orphans (or just report in dry-run mode)
	if (!config.execute) {
		console.log(
			`\n🟢 DRY RUN complete. To delete these ${toDelete.length} blobs, re-run with --execute`,
		);
		return;
	}

	console.log(`\n🔴 DELETING ${toDelete.length} orphaned blobs...`);

	let deleted = 0;
	let failed = 0;
	const batchSize = 100;

	for (let i = 0; i < toDelete.length; i += batchSize) {
		const batch = toDelete.slice(i, i + batchSize);
		const urls = batch.map((b) => b.url);

		try {
			await del(urls);
			deleted += batch.length;
		} catch (error) {
			// Fall back to individual deletes on batch failure
			console.warn(
				`  Batch delete failed, falling back to individual deletes:`,
				error instanceof Error ? error.message : error,
			);
			for (const url of urls) {
				try {
					await del(url);
					deleted++;
				} catch (delError) {
					failed++;
					console.error(
						`  Failed to delete ${url}:`,
						delError instanceof Error ? delError.message : delError,
					);
				}
			}
		}

		if ((i + batchSize) % 500 === 0 || i + batchSize >= toDelete.length) {
			console.log(
				`  Progress: ${deleted} deleted, ${failed} failed (${Math.min(i + batchSize, toDelete.length)}/${toDelete.length})`,
			);
		}
	}

	console.log(`\n=== Cleanup Complete ===`);
	console.log(`  Deleted: ${deleted}`);
	console.log(`  Failed:  ${failed}`);

	const deletedMB = (
		toDelete
			.slice(0, deleted)
			.reduce((sum, b) => sum + b.size, 0) / 1024 / 1024
	).toFixed(2);
	console.log(`  Freed:   ~${deletedMB} MB`);
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
