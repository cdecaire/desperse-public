/**
 * Upload OG allowlist JSON to Vercel Blob at echoes/whitelist-wallets.json
 * Referenced by PFP_OG_ALLOWLIST_JSON env var.
 *
 * Usage: npx tsx --env-file=.env.local scripts/echoes-upload-whitelist.ts
 */

import { put } from "@vercel/blob"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BLOB_PATH = "echoes/whitelist-wallets.json"

async function main() {
	if (!process.env.BLOB_READ_WRITE_TOKEN) {
		console.error("BLOB_READ_WRITE_TOKEN not set")
		process.exit(1)
	}

	const filePath = path.resolve(__dirname, "allowlists/og-wallets.json")

	if (!fs.existsSync(filePath)) {
		console.error(`Not found: ${filePath}`)
		process.exit(1)
	}

	const content = fs.readFileSync(filePath)
	console.log(`Uploading ${filePath} → ${BLOB_PATH}...`)

	const blob = await put(BLOB_PATH, content, {
		access: "public",
		contentType: "application/json",
		addRandomSuffix: false,
	})

	console.log(`Done: ${blob.url}`)
}

main().catch((err) => {
	console.error("Fatal:", err)
	process.exit(1)
})
