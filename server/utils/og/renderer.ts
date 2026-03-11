/** Core OG image rendering pipeline: JSX → SVG (satori) → PNG (resvg-wasm) → JPEG (sharp) */

import satori from "satori"
import { Resvg, initWasm } from "@resvg/resvg-wasm"
import sharp from "sharp"
import { OG_WIDTH, OG_HEIGHT } from "./constants"
import { loadFonts } from "./fonts"

import { useStorage } from "nitro/storage"

let wasmInitialized = false

async function ensureWasm() {
	if (wasmInitialized) return

	// Load WASM from Nitro server assets (works on Vercel serverless)
	const storage = useStorage("assets")
	const wasmBinary = await storage.getItemRaw<ArrayBuffer>("wasm:resvg.wasm.bin")

	if (!wasmBinary) {
		throw new Error("[OG] resvg WASM file not found in server assets")
	}

	// Ensure we have a proper Uint8Array for WASM init
	const bytes =
		wasmBinary instanceof Uint8Array
			? wasmBinary
			: new Uint8Array(
					wasmBinary instanceof ArrayBuffer
						? wasmBinary
						: (wasmBinary as Buffer),
				)

	// Validate WASM magic bytes: \0asm
	if (bytes[0] !== 0x00 || bytes[1] !== 0x61 || bytes[2] !== 0x73 || bytes[3] !== 0x6d) {
		throw new Error(
			`[OG] resvg WASM has invalid magic bytes: ${bytes.slice(0, 4).join(" ")} (type: ${typeof wasmBinary}, constructor: ${wasmBinary?.constructor?.name}, length: ${bytes.length})`,
		)
	}

	await initWasm(bytes.buffer)
	wasmInitialized = true
}

export async function renderOgImage(
	element: React.ReactNode,
): Promise<Uint8Array> {
	const [, fonts] = await Promise.all([ensureWasm(), loadFonts()])

	const svg = await satori(element, {
		width: OG_WIDTH,
		height: OG_HEIGHT,
		fonts,
	})

	const resvg = new Resvg(svg, {
		fitTo: { mode: "width", value: OG_WIDTH },
	})

	const pngData = resvg.render()
	const png = pngData.asPng()

	// Convert PNG → JPEG for ~10x smaller file size (critical for WhatsApp, iMessage, etc.)
	const jpeg = await sharp(png).jpeg({ quality: 80 }).toBuffer()
	return new Uint8Array(jpeg)
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
