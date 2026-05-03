/**
 * Quarantine Orphaned Vercel Blob Files
 *
 * Finds Vercel Blob files that are not referenced by any database record and
 * MOVES them under the `_quarantine/` prefix instead of deleting them outright.
 * This catches:
 *   - Images uploaded in the post form but never published
 *   - Old profile pictures/headers replaced by new ones
 *   - Feedback screenshots from deleted feedback
 *   - Media from posts that were hard-deleted (if any)
 *
 * SAFETY MODEL:
 *   1. Run this script with --execute → orphans are copied to `_quarantine/<original-pathname>`
 *      and then the originals are deleted. Original URLs stop working.
 *   2. Wait some days. If users report missing images, restore from quarantine
 *      (the original pathname is preserved, so restoration is straightforward).
 *   3. When confident nothing is missing, delete the entire `_quarantine/` folder
 *      (e.g. via the Vercel dashboard, or a small one-shot script).
 *
 * Each run also writes a manifest at `_quarantine/_manifest-<timestamp>.json`
 * listing every (originalPathname, quarantinePathname) pair. Use this to map
 * a missing original URL back to its quarantined copy.
 *
 * Protected paths (NEVER quarantined, even when scanning all prefixes):
 *   echoes/*       — PFP collection images, metadata, allowlists (separate project area)
 *   app-release*   — Android APK distribution (referenced from client code, not DB)
 *   _quarantine/  — already-quarantined blobs (don't re-process)
 * See PROTECTED_PREFIXES below to add more.
 *
 * Usage:
 *   pnpm tsx scripts/cleanup-orphaned-blobs.ts                     # Dry run (list only)
 *   pnpm tsx scripts/cleanup-orphaned-blobs.ts --execute           # Actually quarantine
 *   pnpm tsx scripts/cleanup-orphaned-blobs.ts --min-age-days 30   # Only blobs older than 30 days (default: 7)
 *   pnpm tsx scripts/cleanup-orphaned-blobs.ts --prefix media      # Only scan media/ prefix (default: all)
 *   pnpm tsx scripts/cleanup-orphaned-blobs.ts --limit 100         # Limit moves per run
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { list, del, copy, put } from "@vercel/blob";
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
// Protected paths — NEVER deleted, even if not referenced in the database.
//
// These blobs belong to other project areas (Echoes PFP collection, Android
// APK distribution) and are referenced by candy-machine config, server env
// vars, or hardcoded client constants — not by any DB column.
//
// A blob is protected if its `pathname` starts with any prefix in this list.
// ---------------------------------------------------------------------------
const QUARANTINE_PREFIX = "_quarantine/";

const PROTECTED_PREFIXES = [
	"echoes/",          // Echoes PFP collection images, metadata, collection cover, OG/WL allowlists
	"app-release",      // Android APK (app-release.apk) — referenced from DownloadBadges.tsx
	QUARANTINE_PREFIX,  // Already-quarantined blobs — never re-process
] as const;

function isProtectedPath(pathname: string): boolean {
	return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

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

	// Step 3: Find orphans (not referenced + not protected + older than cutoff)
	const orphans: BlobEntry[] = [];
	let skippedTooNew = 0;
	let skippedReferenced = 0;
	let skippedProtected = 0;

	for (const blob of allBlobs) {
		if (isProtectedPath(blob.pathname)) {
			skippedProtected++;
			continue;
		}
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
	console.log(`  Protected prefix:     ${skippedProtected}  (${PROTECTED_PREFIXES.join(", ")})`);
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

	// Limit moves if configured
	const toQuarantine = orphans.slice(0, config.limit);
	if (toQuarantine.length < orphans.length) {
		console.log(
			`\n  (Limiting to ${config.limit} moves out of ${orphans.length} orphans)`,
		);
	}

	// Print orphan details (first 50)
	const previewCount = Math.min(toQuarantine.length, 50);
	console.log(`\n--- Orphaned blobs (showing ${previewCount} of ${toQuarantine.length}) ---`);
	for (let i = 0; i < previewCount; i++) {
		const b = toQuarantine[i];
		const ageDays = Math.floor(
			(Date.now() - b.uploadedAt.getTime()) / (1000 * 60 * 60 * 24),
		);
		const sizeMB = (b.size / 1024 / 1024).toFixed(2);
		console.log(
			`  ${b.pathname} (${sizeMB} MB, ${ageDays} days old)`,
		);
	}
	if (toQuarantine.length > previewCount) {
		console.log(`  ... and ${toQuarantine.length - previewCount} more`);
	}

	// Step 4: Quarantine orphans (or just report in dry-run mode)
	if (!config.execute) {
		console.log(
			`\n🟢 DRY RUN complete. To quarantine these ${toQuarantine.length} blobs, re-run with --execute`,
		);
		console.log(
			`   They will be moved to "${QUARANTINE_PREFIX}<original-pathname>" and the originals deleted.`,
		);
		return;
	}

	console.log(`\n🟡 QUARANTINING ${toQuarantine.length} orphaned blobs → ${QUARANTINE_PREFIX}...`);

	interface ManifestEntry {
		originalPathname: string;
		originalUrl: string;
		quarantinePathname: string;
		quarantineUrl: string;
		size: number;
		uploadedAt: string;
	}

	const manifest: ManifestEntry[] = [];
	let moved = 0;
	let failed = 0;
	const failures: { pathname: string; error: string }[] = [];

	for (let i = 0; i < toQuarantine.length; i++) {
		const b = toQuarantine[i];
		const quarantinePathname = `${QUARANTINE_PREFIX}${b.pathname}`;

		try {
			// 1. Copy original → quarantine path (preserve pathname, no random suffix)
			const copied = await copy(b.url, quarantinePathname, {
				access: "public",
				addRandomSuffix: false,
				allowOverwrite: true,
			});

			// 2. Delete original only after copy succeeded
			await del(b.url);

			manifest.push({
				originalPathname: b.pathname,
				originalUrl: b.url,
				quarantinePathname: copied.pathname,
				quarantineUrl: copied.url,
				size: b.size,
				uploadedAt: b.uploadedAt.toISOString(),
			});
			moved++;
		} catch (err) {
			failed++;
			const msg = err instanceof Error ? err.message : String(err);
			failures.push({ pathname: b.pathname, error: msg });
			console.error(`  Failed to quarantine ${b.pathname}: ${msg}`);
		}

		if ((i + 1) % 50 === 0 || i + 1 === toQuarantine.length) {
			console.log(
				`  Progress: ${moved} moved, ${failed} failed (${i + 1}/${toQuarantine.length})`,
			);
		}
	}

	// Write manifest to quarantine folder so we can map original → quarantined later
	if (manifest.length > 0) {
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const manifestPathname = `${QUARANTINE_PREFIX}_manifest-${timestamp}.json`;
		try {
			const manifestBlob = await put(
				manifestPathname,
				JSON.stringify(
					{
						runAt: new Date().toISOString(),
						totalMoved: moved,
						totalFailed: failed,
						minAgeDays: config.minAgeDays,
						prefix: config.prefix ?? null,
						entries: manifest,
						failures,
					},
					null,
					2,
				),
				{
					access: "public",
					contentType: "application/json",
					addRandomSuffix: false,
					allowOverwrite: false,
				},
			);
			console.log(`\n  Manifest written: ${manifestBlob.url}`);
		} catch (err) {
			console.error(
				`\n  ⚠️  FAILED to write manifest:`,
				err instanceof Error ? err.message : err,
			);
			console.error(`     Dumping manifest to stdout instead:`);
			console.error(JSON.stringify(manifest, null, 2));
		}
	}

	console.log(`\n=== Quarantine Complete ===`);
	console.log(`  Moved:  ${moved}`);
	console.log(`  Failed: ${failed}`);

	const movedMB = (
		manifest.reduce((sum, e) => sum + e.size, 0) / 1024 / 1024
	).toFixed(2);
	console.log(`  Size:   ~${movedMB} MB now under ${QUARANTINE_PREFIX}`);
	console.log(
		`\n  When you're confident nothing is missing, delete the entire ${QUARANTINE_PREFIX} folder`,
	);
	console.log(
		`  (via the Vercel dashboard, or list+del all blobs with that prefix).`,
	);
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
