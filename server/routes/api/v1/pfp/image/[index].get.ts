/**
 * GET /api/v1/pfp/image/:index?t=<token>
 *
 * Server image proxy for echo PFP images.
 * - Validates HMAC token (prevents URL enumeration)
 * - Minted items: serve the real image (streamed from Blob, long-lived cache)
 * - Unminted items: stream unresolved placeholder
 *
 * The actual image storage location (ECHOES_IMAGE_BASE_URL) is server-only.
 */

import {
	defineEventHandler,
	getRouterParam,
	getQuery,
	setHeaders,
	setResponseStatus,
	sendStream,
} from "h3"
import { getEchoesUmi, getCandyMachinePublicKey } from "@/server/services/blockchain/echoes/echoesUmiClient"
import { fetchCandyMachine } from "@metaplex-foundation/mpl-core-candy-machine"
import { validateImageToken } from "@/server/utils/echoes/image-tokens"
import { echoesEnv } from "@/config/echoes-env"
import fs from "node:fs"
import path from "node:path"

// ---------------------------------------------------------------------------
// In-memory cache for CM minted state — avoids RPC call per image request
// ---------------------------------------------------------------------------

let cachedMintedSet: Set<number> | null = null
let cacheTimestamp = 0
let cachePromise: Promise<Set<number>> | null = null
const CACHE_TTL = 30_000 // 30 seconds

async function getMintedSet(): Promise<Set<number>> {
	if (cachedMintedSet && Date.now() - cacheTimestamp < CACHE_TTL) {
		return cachedMintedSet
	}

	// Deduplicate concurrent requests — share the same in-flight promise
	if (cachePromise) return cachePromise

	cachePromise = (async () => {
		try {
			const umi = getEchoesUmi()
			const cmPublicKey = getCandyMachinePublicKey()
			const cm = await fetchCandyMachine(umi, cmPublicKey)

			const minted = new Set<number>()
			for (let i = 0; i < cm.items.length; i++) {
				if (cm.items[i].minted) minted.add(i)
			}

			cachedMintedSet = minted
			cacheTimestamp = Date.now()
			console.log(`[pfp-image-proxy] CM cache refreshed: ${minted.size} minted — [${[...minted].sort((a, b) => a - b).join(', ')}]`)
			return minted
		} catch (err) {
			// No CM configured / pre-mint — return empty set, cache it to avoid spamming
			console.warn(`[pfp-image-proxy] CM not available, all images gated`)
			cachedMintedSet = new Set()
			cacheTimestamp = Date.now()
			return cachedMintedSet
		} finally {
			cachePromise = null
		}
	})()

	return cachePromise
}

// ---------------------------------------------------------------------------
// Placeholder paths (served from public/ — deployed as static assets on CDN)
// ---------------------------------------------------------------------------

const PLACEHOLDER_MASC = "echoes-unresolved.jpg"
const PLACEHOLDER_FEM = "echoes-unresolved-fem.jpg"

function getPlaceholderFilename(index: number): string {
	return index % 2 === 0 ? PLACEHOLDER_MASC : PLACEHOLDER_FEM
}

async function streamPlaceholder(event: any, index: number) {
	const filename = getPlaceholderFilename(index)

	// In dev, read from public/ on disk
	const localPath = path.resolve(process.cwd(), "public", filename)
	if (fs.existsSync(localPath)) {
		setHeaders(event, {
			"Content-Type": "image/jpeg",
			"Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
			"Vercel-Cache-Tag": `pfp,pfp-${index},pfp-unminted`,
		})
		return sendStream(event, fs.createReadStream(localPath) as any)
	}

	// On Vercel, public/ is on the CDN — self-fetch the static asset
	const origin = process.env.VERCEL_URL
		? `https://${process.env.VERCEL_URL}`
		: `http://localhost:${process.env.PORT || 3000}`
	const res = await fetchWithRetry(`${origin}/${filename}`)
	if (res.ok && res.body) {
		setHeaders(event, {
			"Content-Type": res.headers.get("content-type") ?? "image/png",
			"Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
			"Vercel-Cache-Tag": `pfp,pfp-${index},pfp-unminted`,
		})
		return sendStream(event, res.body as any)
	}

	setResponseStatus(event, 502)
	return { success: false, error: { code: "PLACEHOLDER_UNAVAILABLE", message: "Placeholder not found" } }
}

/**
 * Check if a URL is a local path (starts with /) vs an external URL (https://)
 */
function isLocalPath(url: string): boolean {
	return !url.startsWith("http://") && !url.startsWith("https://")
}

async function fetchWithRetry(url: string): Promise<Response> {
	try {
		return await fetch(url, { signal: AbortSignal.timeout(8_000) })
	} catch {
		return fetch(url, { signal: AbortSignal.timeout(10_000) })
	}
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export default defineEventHandler(async (event) => {
	const rawIndex = getRouterParam(event, "index")
	const index = Number.parseInt(rawIndex ?? "", 10)

	// Validate index
	if (Number.isNaN(index) || index < 0 || index > 9999) {
		setResponseStatus(event, 400)
		return { success: false, error: { code: "INVALID_INDEX", message: "Invalid image index" } }
	}

	// Validate HMAC token — reject unsigned requests
	const query = getQuery(event)
	const token = typeof query.t === "string" ? query.t : ""
	if (!validateImageToken(index, token)) {
		setResponseStatus(event, 403)
		return { success: false, error: { code: "INVALID_TOKEN", message: "Forbidden" } }
	}

	try {
		const mintedSet = await getMintedSet()

		if (mintedSet.has(index)) {
			const baseUrl = echoesEnv.ECHOES_IMAGE_BASE_URL
			const imagePath = `${baseUrl}/${index}.png`

			if (isLocalPath(imagePath)) {
				// Local dev — stream file from disk (not in public/, so not statically served)
				const absolutePath = path.resolve(process.cwd(), imagePath.replace(/^\//, ""))

				if (fs.existsSync(absolutePath)) {
					setHeaders(event, {
						"Content-Type": "image/png",
						// Minted images never change — cache aggressively
						"Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
						"Vercel-Cache-Tag": `pfp,pfp-${index},pfp-minted`,
					})
					return sendStream(event, fs.createReadStream(absolutePath) as any)
				}

				// File not found locally — serve placeholder
				return streamPlaceholder(event, index)
			}

			// Fetch from Blob storage and stream to client (never expose Blob URL)
			const imgRes = await fetchWithRetry(imagePath)
			if (!imgRes.ok || !imgRes.body) {
				// Image not in Blob — serve placeholder
				return streamPlaceholder(event, index)
			}

			setHeaders(event, {
				"Content-Type": imgRes.headers.get("content-type") ?? "image/png",
				// Minted images never change — cache for 1 year
				"Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
				"Vercel-Cache-Tag": `pfp,pfp-${index},pfp-minted`,
			})
			return sendStream(event, imgRes.body as any)
		}

		// Not minted — stream placeholder from public/
		return streamPlaceholder(event, index)

	} catch (error) {
		console.error(
			"[pfp-image-proxy] Error:",
			error instanceof Error ? error.message : error,
		)
		// On error, return proper error status instead of silently redirecting
		setResponseStatus(event, 502)
		return { success: false, error: { code: "PROXY_ERROR", message: "Image proxy error" } }
	}
})
