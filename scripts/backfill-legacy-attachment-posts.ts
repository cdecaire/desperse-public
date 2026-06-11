/**
 * Backfill legacy attachment posts into the post_assets media/download model.
 *
 * Finds legacy posts that have no media assets, still point media_url at a
 * download-only attachment, and have cover_url available as the display image.
 * For each eligible post the script inserts one role='media' asset from cover_url,
 * keeps existing role='download' assets untouched, updates posts.media_url to
 * cover_url, and clears posts.cover_url.
 *
 * Safe to run multiple times — migrated posts are skipped because they now have
 * a role='media' asset. Do not run two copies in parallel: idempotency relies on
 * a WHERE NOT EXISTS guard, not a unique constraint on post_assets.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-legacy-attachment-posts.ts --dry-run
 *   pnpm tsx scripts/backfill-legacy-attachment-posts.ts --execute
 *   pnpm tsx scripts/backfill-legacy-attachment-posts.ts --post <postId> --execute
 *   pnpm tsx scripts/backfill-legacy-attachment-posts.ts --limit 25 --dry-run
 */

import dotenv from "dotenv"
import { dirname, resolve } from "path"
import postgres from "postgres"
import { fileURLToPath } from "url"
import {
	buildLegacyAttachmentMigrationPlan,
	type LegacyAttachmentDownloadAsset,
	type LegacyAttachmentMigrationPlan,
} from "../src/server/utils/legacy-attachment-backfill"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = resolve(__dirname, "..")

dotenv.config({ path: resolve(projectRoot, ".env.local") })
dotenv.config({ path: resolve(projectRoot, ".env") })

type RawLegacyAttachmentPost = {
	id: string
	mediaUrl: string
	coverUrl: string | null
	downloadAssets: LegacyAttachmentDownloadAsset[]
}

type ScriptOptions = {
	dryRun: boolean
	postId: string | null
	limit: number
}

function getDatabaseUrl(): string {
	const url = process.env.DATABASE_URL
	if (!url) {
		throw new Error("DATABASE_URL environment variable is not set")
	}
	return url
}

function readArgValue(args: string[], name: string): string | null {
	const index = args.indexOf(name)
	if (index === -1) return null
	const value = args[index + 1]
	if (!value || value.startsWith("--")) {
		throw new Error(`${name} requires a value`)
	}
	return value
}

function parseOptions(): ScriptOptions {
	const args = process.argv.slice(2)
	const dryRun = !args.includes("--execute")
	const postId = readArgValue(args, "--post")
	const limitArg = readArgValue(args, "--limit")
	const limit = limitArg ? Number.parseInt(limitArg, 10) : 10_000

	if (args.includes("--dry-run") && args.includes("--execute")) {
		throw new Error("Use either --dry-run or --execute, not both")
	}
	if (!Number.isInteger(limit) || limit <= 0) {
		throw new Error("--limit must be a positive integer")
	}

	return { dryRun, postId, limit }
}

async function loadPotentialLegacyPosts(
	client: postgres.Sql,
	options: Pick<ScriptOptions, "postId" | "limit">,
): Promise<RawLegacyAttachmentPost[]> {
	const rows = await client<RawLegacyAttachmentPost[]>`
		SELECT
			p.id::text AS "id",
			p.media_url AS "mediaUrl",
			p.cover_url AS "coverUrl",
			COALESCE(
				json_agg(
					json_build_object(
						'id', pa.id::text,
						'storageKey', pa.storage_key,
						'mimeType', pa.mime_type
					)
					ORDER BY pa.sort_order, pa.created_at
				) FILTER (WHERE pa.id IS NOT NULL),
				'[]'::json
			) AS "downloadAssets"
		FROM posts p
		LEFT JOIN post_assets pa
			ON pa.post_id = p.id
			AND pa.role = 'download'
		WHERE p.cover_url IS NOT NULL
			AND (${options.postId}::uuid IS NULL OR p.id = ${options.postId}::uuid)
			AND NOT EXISTS (
				SELECT 1
				FROM post_assets media_assets
				WHERE media_assets.post_id = p.id
					AND media_assets.role = 'media'
			)
		GROUP BY p.id, p.media_url, p.cover_url, p.created_at
		ORDER BY p.created_at ASC
		LIMIT ${options.limit}
	`

	return rows
}

async function migratePost(client: postgres.Sql, plan: LegacyAttachmentMigrationPlan) {
	const [result] = await client<[{ insertedAssetId: string | null; updatedPostId: string | null }]>`
		WITH inserted AS (
			INSERT INTO post_assets (
				post_id,
				storage_provider,
				storage_key,
				mime_type,
				file_size,
				sha256,
				download_name,
				is_gated,
				sort_order,
				role,
				is_previewable
			)
			SELECT
				${plan.postId}::uuid,
				${plan.storageProvider},
				${plan.coverUrl},
				${plan.coverMimeType},
				NULL,
				NULL,
				NULL,
				false,
				0,
				'media',
				true
			WHERE NOT EXISTS (
				SELECT 1
				FROM post_assets
				WHERE post_id = ${plan.postId}::uuid
					AND role = 'media'
			)
			RETURNING id
		), updated AS (
			UPDATE posts
			SET
				media_url = ${plan.coverUrl},
				cover_url = NULL,
				updated_at = NOW()
			WHERE id = ${plan.postId}::uuid
				AND EXISTS (SELECT 1 FROM inserted)
			RETURNING id
		)
		SELECT
			(SELECT id::text FROM inserted) AS "insertedAssetId",
			(SELECT id::text FROM updated) AS "updatedPostId"
	`

	return result
}

async function main() {
	const options = parseOptions()
	console.log(`[backfill-legacy-attachments] Mode: ${options.dryRun ? "DRY RUN" : "EXECUTE"}`)
	if (options.postId) console.log(`[backfill-legacy-attachments] Post filter: ${options.postId}`)
	console.log(`[backfill-legacy-attachments] Limit: ${options.limit}`)

	const client = postgres(getDatabaseUrl())
	try {
		const potentialPosts = await loadPotentialLegacyPosts(client, options)
		const plans = potentialPosts
			.map((post) => buildLegacyAttachmentMigrationPlan(post))
			.filter((plan): plan is LegacyAttachmentMigrationPlan => plan !== null)

		console.log(`[backfill-legacy-attachments] Potential legacy posts without media assets: ${potentialPosts.length}`)
		console.log(`[backfill-legacy-attachments] Eligible posts to migrate: ${plans.length}`)

		let migrated = 0
		let skipped = 0
		let errors = 0

		for (const plan of plans) {
			console.log(`\n[backfill-legacy-attachments] Post ${plan.postId}`)
			console.log(`  reason: ${plan.reason}`)
			console.log(`  current mediaUrl: ${plan.mediaUrl}`)
			console.log(`  new display mediaUrl: ${plan.coverUrl}`)
			console.log(`  cover mimeType: ${plan.coverMimeType}`)
			if (plan.matchedDownloadAssetIds.length > 0) {
				console.log(`  matched download asset IDs: ${plan.matchedDownloadAssetIds.join(", ")}`)
			}

			if (options.dryRun) {
				console.log("  [DRY RUN] Would insert role=media asset, update posts.media_url, and clear posts.cover_url")
				migrated++
				continue
			}

			try {
				const result = await migratePost(client, plan)
				if (!result?.insertedAssetId || !result?.updatedPostId) {
					console.warn("  skipped: media asset already exists or post was not updated")
					skipped++
					continue
				}
				console.log(`  inserted media asset: ${result.insertedAssetId}`)
				console.log("  updated post media_url and cleared cover_url")
				migrated++
			} catch (error) {
				console.error(`  ERROR: ${error instanceof Error ? error.message : String(error)}`)
				errors++
			}
		}

		console.log(
			`\n[backfill-legacy-attachments] Done: ${migrated} ${options.dryRun ? "would migrate" : "migrated"}, ${skipped} skipped, ${errors} errors`,
		)

		if (!options.dryRun && plans.length > 0) {
			console.log("[backfill-legacy-attachments] Re-run with --dry-run to confirm migrated posts are now skipped")
		}
	} finally {
		await client.end()
	}
}

main().catch((error) => {
	console.error("[backfill-legacy-attachments] Fatal error:", error)
	process.exit(1)
})
