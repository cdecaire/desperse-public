/**
 * Copy echoes-metadata.ts from ComfyUI output (symlinked at echoes-dev/)
 * into the tracked source tree so Vercel can build without the symlink.
 *
 * Run after each ComfyUI generation or prepare-assets cycle:
 *   pnpm echoes:sync-metadata
 */

import fs from "node:fs"
import path from "node:path"

const SOURCE = path.resolve("echoes-dev/echoes-metadata.ts")
const DEST = path.resolve("src/data/echoes-metadata-generated.ts")

if (!fs.existsSync(SOURCE)) {
	console.error(`[echoes:sync-metadata] Source not found: ${SOURCE}`)
	console.error("Make sure the echoes-dev symlink points to ComfyUI output.")
	process.exit(1)
}

fs.copyFileSync(SOURCE, DEST)

const lines = fs.readFileSync(DEST, "utf-8").split("\n").length
console.log(`[echoes:sync-metadata] Copied ${lines} lines → ${DEST}`)
