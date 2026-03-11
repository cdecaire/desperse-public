/** Core OG image rendering pipeline: JSX → SVG (satori) → PNG (resvg-wasm) */

import satori from "satori"
import { Resvg, initWasm } from "@resvg/resvg-wasm"
import { OG_WIDTH, OG_HEIGHT } from "./constants"
import { loadFonts } from "./fonts"

let wasmInitialized = false

async function ensureWasm() {
	if (wasmInitialized) return
	// Load WASM from node_modules via fs — works in Node serverless runtime
	const { readFileSync } = await import("node:fs")
	const { createRequire } = await import("node:module")
	try {
		const require = createRequire(import.meta.url)
		const wasmPath = require.resolve("@resvg/resvg-wasm/index_bg.wasm")
		const wasmBinary = readFileSync(wasmPath)
		await initWasm(wasmBinary)
	} catch (e) {
		// Fallback: try process.cwd()
		const { join } = await import("node:path")
		const wasmPath = join(
			process.cwd(),
			"node_modules/@resvg/resvg-wasm/index_bg.wasm",
		)
		const wasmBinary = readFileSync(wasmPath)
		await initWasm(wasmBinary)
	}
	wasmInitialized = true
}

export async function renderOgImage(
	element: React.ReactNode,
): Promise<Uint8Array> {
	await ensureWasm()
	const fonts = await loadFonts()

	const svg = await satori(element, {
		width: OG_WIDTH,
		height: OG_HEIGHT,
		fonts,
	})

	const resvg = new Resvg(svg, {
		fitTo: { mode: "width", value: OG_WIDTH },
	})

	const pngData = resvg.render()
	return pngData.asPng()
}

/**
 * Fetch an external image and convert to data URI for embedding in satori.
 * Returns null on failure (timeout, network error, etc.)
 */
export async function fetchImageAsDataUri(
	url: string,
	timeoutMs = 3000,
): Promise<string | null> {
	try {
		const controller = new AbortController()
		const timer = setTimeout(() => controller.abort(), timeoutMs)
		const res = await fetch(url, { signal: controller.signal })
		clearTimeout(timer)
		if (!res.ok) return null
		const buf = await res.arrayBuffer()
		const contentType = res.headers.get("content-type") || "image/png"
		return `data:${contentType};base64,${Buffer.from(buf).toString("base64")}`
	} catch {
		return null
	}
}
