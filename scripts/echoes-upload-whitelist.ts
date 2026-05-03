/**
 * Upload an Echoes allowlist JSON to Vercel Blob.
 * Referenced by PFP_OG_ALLOWLIST_JSON / PFP_WL_ALLOWLIST_JSON env vars.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/echoes-upload-whitelist.ts og
 *   npx tsx --env-file=.env.local scripts/echoes-upload-whitelist.ts wl
 *   npx tsx --env-file=.env.local scripts/echoes-upload-whitelist.ts        # uploads both
 */

import { put } from "@vercel/blob"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const TARGETS = {
	og: { file: "allowlists/og-wallets.json", blob: "echoes/whitelist-wallets.json" },
	wl: { file: "allowlists/wl-wallets.json", blob: "echoes/wl-wallets.json" },
} as const

type ListKey = keyof typeof TARGETS

async function uploadOne(key: ListKey) {
	const { file, blob: blobPath } = TARGETS[key]
	const filePath = path.resolve(__dirname, file)

	if (!fs.existsSync(filePath)) {
		console.error(`Not found: ${filePath}`)
		process.exit(1)
	}

	const content = fs.readFileSync(filePath)
	console.log(`Uploading ${filePath} → ${blobPath}...`)

	const blob = await put(blobPath, content, {
		access: "public",
		contentType: "application/json",
		addRandomSuffix: false,
		allowOverwrite: true,
	})

	console.log(`Done: ${blob.url}`)
}

async function main() {
	if (!process.env.BLOB_READ_WRITE_TOKEN) {
		console.error("BLOB_READ_WRITE_TOKEN not set")
		process.exit(1)
	}

	const arg = process.argv[2]
	const keys: ListKey[] = arg
		? [arg as ListKey]
		: (Object.keys(TARGETS) as ListKey[])

	for (const key of keys) {
		if (!(key in TARGETS)) {
			console.error(`Unknown list: ${key} (expected: og | wl)`)
			process.exit(1)
		}
		await uploadOne(key)
	}
}

main().catch((err) => {
	console.error("Fatal:", err)
	process.exit(1)
})
