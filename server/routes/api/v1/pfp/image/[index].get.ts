/**
 * GET /api/v1/pfp/image/:index
 *
 * Server image proxy for echo PFP images.
 * - Minted items: serve the real image (streamed from disk or redirected to Blob)
 * - Unminted items: redirect to unresolved placeholder
 *
 * This prevents users from enumerating all images via DevTools.
 * The actual image storage location (ECHOES_IMAGE_BASE_URL) is server-only.
 */

import {
	defineEventHandler,
	getRouterParam,
	setHeaders,
	setResponseStatus,
	sendRedirect,
	sendStream,
} from "h3"
import { getEchoesUmi, getCandyMachinePublicKey } from "@/server/services/blockchain/echoes/echoesUmiClient"
import { fetchCandyMachine } from "@metaplex-foundation/mpl-core-candy-machine"
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
// Placeholder paths (served from public/ — always accessible)
// ---------------------------------------------------------------------------

const PLACEHOLDER_MASC = "https://4swlq9hweqtpslft.public.blob.vercel-storage.com/echoes/echoes-unresolved.png"
const PLACEHOLDER_FEM = "https://4swlq9hweqtpslft.public.blob.vercel-storage.com/echoes/echoes-unresolved-fem.png"

function getPlaceholder(index: number): string {
	return index % 2 === 0 ? PLACEHOLDER_MASC : PLACEHOLDER_FEM
}

/**
 * Check if a URL is a local path (starts with /) vs an external URL (https://)
 */
function isLocalPath(url: string): boolean {
	return !url.startsWith("http://") && !url.startsWith("https://")
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
						"Cache-Control": "public, max-age=3600",
						"Vercel-Cache-Tag": `pfp,pfp-${index},pfp-minted`,
					})
					return sendStream(event, fs.createReadStream(absolutePath) as any)
				}

				// File not found locally — serve placeholder
				const fallback = await fetch(getPlaceholder(index))
				if (fallback.ok && fallback.body) {
					setHeaders(event, {
						"Content-Type": fallback.headers.get("content-type") ?? "image/png",
						"Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
						"Vercel-Cache-Tag": `pfp,pfp-${index},pfp-unminted`,
					})
					return sendStream(event, fallback.body as any)
				}
				return sendRedirect(event, getPlaceholder(index), 302)
			}

			// Fetch from Blob storage and stream to client (never expose Blob URL)
			const imgRes = await fetch(imagePath)
			if (!imgRes.ok || !imgRes.body) {
				// Image not in Blob — serve placeholder with short cache
				const fallback = await fetch(getPlaceholder(index))
				if (fallback.ok && fallback.body) {
					setHeaders(event, {
						"Content-Type": fallback.headers.get("content-type") ?? "image/png",
						"Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
						"Vercel-Cache-Tag": `pfp,pfp-${index},pfp-unminted`,
					})
					return sendStream(event, fallback.body as any)
				}
				return sendRedirect(event, getPlaceholder(index), 302)
			}

			setHeaders(event, {
				"Content-Type": imgRes.headers.get("content-type") ?? "image/png",
				"Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
				"Vercel-Cache-Tag": `pfp,pfp-${index},pfp-minted`,
			})
			return sendStream(event, imgRes.body as any)
		}

		// Not minted — stream placeholder directly (don't redirect, so our
		// Cache-Control headers are what /_vercel/image sees, not Blob's)
		const placeholderUrl = getPlaceholder(index)
		const placeholderRes = await fetch(placeholderUrl)
		if (!placeholderRes.ok || !placeholderRes.body) {
			return sendRedirect(event, placeholderUrl, 302)
		}

		setHeaders(event, {
			"Content-Type": placeholderRes.headers.get("content-type") ?? "image/png",
			"Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
			"Vercel-Cache-Tag": `pfp,pfp-${index},pfp-unminted`,
		})
		return sendStream(event, placeholderRes.body as any)

	} catch (error) {
		console.error(
			"[pfp-image-proxy] Error:",
			error instanceof Error ? error.message : error,
		)
		// On error, fail gracefully — show placeholder rather than breaking the page
		return sendRedirect(event, getPlaceholder(index), 302)
	}
})
