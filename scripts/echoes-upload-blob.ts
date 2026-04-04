/**
 * Upload Echoes PFP images to Vercel Blob storage and sync metadata.
 *
 * Uploads from echoes-dev/assets/ (post-prepare layout: 0.png, 1.png, ...)
 * into the `echoes/` prefix in Vercel Blob, isolated from app uploads.
 *
 * Usage:
 *   pnpm echoes:upload-blob                  # Upload images + sync metadata
 *   pnpm echoes:upload-blob --clean          # Remove old echoes/ blobs first
 *   pnpm echoes:upload-blob --clean-only     # Just remove old blobs, don't upload
 *   pnpm echoes:upload-blob --dry-run        # Preview what would be uploaded/cleaned
 */

import { put, list, del } from "@vercel/blob"
import fs from "node:fs"
import path from "node:path"

const ASSETS_DIR = path.resolve("echoes-dev/assets")
const METADATA_SRC = path.resolve("echoes-dev/echoes-metadata.ts")
const METADATA_DEST = path.resolve("src/data/echoes-metadata-generated.ts")
const BLOB_PREFIX = "echoes/"
const CONCURRENCY = 10

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const cleanFirst = args.includes("--clean")
const cleanOnly = args.includes("--clean-only")
const dryRun = args.includes("--dry-run")

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function cleanEchoesBlobs(): Promise<number> {
	let deleted = 0
	let cursor: string | undefined

	console.log(`[echoes:upload-blob] Listing blobs with prefix "${BLOB_PREFIX}"...`)

	do {
		const result = await list({ prefix: BLOB_PREFIX, cursor, limit: 100 })
		cursor = result.cursor

		if (result.blobs.length === 0) break

		if (dryRun) {
			for (const blob of result.blobs) {
				console.log(`  [dry-run] Would delete: ${blob.pathname} (${(blob.size / 1024).toFixed(1)} KB)`)
			}
			deleted += result.blobs.length
		} else {
			// Delete in parallel
			await Promise.all(result.blobs.map((blob) => del(blob.url)))
			deleted += result.blobs.length
			console.log(`  Deleted ${result.blobs.length} blobs`)
		}
	} while (cursor)

	return deleted
}

async function uploadFile(filePath: string, blobPath: string): Promise<string> {
	const content = fs.readFileSync(filePath)
	const contentType = filePath.endsWith(".png") ? "image/png" : "application/json"

	const blob = await put(blobPath, content, {
		access: "public",
		contentType,
		addRandomSuffix: false,
	})

	return blob.url
}

async function uploadBatch(
	files: { localPath: string; blobPath: string }[],
): Promise<{ uploaded: number; failed: number; baseUrl: string | null }> {
	let uploaded = 0
	let failed = 0
	let baseUrl: string | null = null

	// Process in chunks
	for (let i = 0; i < files.length; i += CONCURRENCY) {
		const chunk = files.slice(i, i + CONCURRENCY)
		const results = await Promise.allSettled(
			chunk.map(async ({ localPath, blobPath }) => {
				const url = await uploadFile(localPath, blobPath)
				return { blobPath, url }
			}),
		)

		for (const result of results) {
			if (result.status === "fulfilled") {
				uploaded++
				// Extract base URL from first successful upload
				if (!baseUrl && result.value.blobPath.endsWith(".png")) {
					// URL: https://xxx.public.blob.vercel-storage.com/echoes/0.png
					// Base: https://xxx.public.blob.vercel-storage.com/echoes
					baseUrl = result.value.url.replace(`/${result.value.blobPath}`, `/${BLOB_PREFIX.slice(0, -1)}`)
				}
			} else {
				failed++
				console.error(`  Failed: ${chunk[results.indexOf(result)]?.blobPath}:`, result.reason)
			}
		}

		const total = Math.min(i + CONCURRENCY, files.length)
		process.stdout.write(`\r  Uploaded ${total}/${files.length}`)
	}
	console.log()

	return { uploaded, failed, baseUrl }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	if (!process.env.BLOB_READ_WRITE_TOKEN) {
		console.error("[echoes:upload-blob] BLOB_READ_WRITE_TOKEN not set")
		process.exit(1)
	}

	// Clean old blobs
	if (cleanFirst || cleanOnly) {
		const deleted = await cleanEchoesBlobs()
		console.log(`[echoes:upload-blob] ${dryRun ? "Would delete" : "Deleted"} ${deleted} old blobs`)
		if (cleanOnly) return
	}

	// Check assets exist
	if (!fs.existsSync(ASSETS_DIR)) {
		console.error(`[echoes:upload-blob] Assets directory not found: ${ASSETS_DIR}`)
		console.error("Run prepare_assets.py first to generate the assets/ layout.")
		process.exit(1)
	}

	// Gather files to upload
	const files: { localPath: string; blobPath: string }[] = []
	const entries = fs.readdirSync(ASSETS_DIR)

	for (const entry of entries) {
		if (entry.endsWith(".png") || entry.endsWith(".json")) {
			files.push({
				localPath: path.join(ASSETS_DIR, entry),
				blobPath: `${BLOB_PREFIX}${entry}`,
			})
		}
	}

	// Also upload collection image if present
	const collectionPng = path.join(ASSETS_DIR, "..", "collection.png")
	if (fs.existsSync(collectionPng)) {
		files.push({
			localPath: collectionPng,
			blobPath: `${BLOB_PREFIX}collection.png`,
		})
	}

	if (files.length === 0) {
		console.error("[echoes:upload-blob] No .png or .json files found in assets/")
		process.exit(1)
	}

	const pngCount = files.filter((f) => f.localPath.endsWith(".png")).length
	const jsonCount = files.filter((f) => f.localPath.endsWith(".json")).length
	console.log(`[echoes:upload-blob] Found ${pngCount} PNGs + ${jsonCount} JSONs to upload`)

	if (dryRun) {
		for (const f of files.slice(0, 10)) {
			console.log(`  [dry-run] Would upload: ${f.blobPath}`)
		}
		if (files.length > 10) console.log(`  ... and ${files.length - 10} more`)
		return
	}

	// Upload
	console.log("[echoes:upload-blob] Uploading to Vercel Blob...")
	const { uploaded, failed, baseUrl } = await uploadBatch(files)

	console.log(`[echoes:upload-blob] Done: ${uploaded} uploaded, ${failed} failed`)

	if (baseUrl) {
		console.log(`\n[echoes:upload-blob] Set this env var on Vercel:`)
		console.log(`  ECHOES_IMAGE_BASE_URL=${baseUrl}`)
	}

	// Sync metadata
	if (fs.existsSync(METADATA_SRC)) {
		fs.copyFileSync(METADATA_SRC, METADATA_DEST)
		console.log(`[echoes:upload-blob] Synced metadata → ${METADATA_DEST}`)
	} else {
		console.warn("[echoes:upload-blob] Metadata source not found, skipping sync")
	}
}

main().catch((err) => {
	console.error("[echoes:upload-blob] Fatal:", err)
	process.exit(1)
})
