import { ECHOES_METADATA, getDevImagePaths } from "./echoes-metadata"
import { getOptimizedImageUrl, type ImageWidth } from "@/lib/imageUrl"

const DEV_IMAGE_COUNT = 300
const IMAGE_PROXY_BASE = "/api/v1/pfp/image"

/** Default width for echo images in grid/gallery views */
const ECHO_IMAGE_WIDTH: ImageWidth = 480

/**
 * Wrap an echo image URL through Vercel's image optimizer.
 * In dev mode this is a no-op (returns the original URL).
 */
function optimizeEchoUrl(url: string, width: ImageWidth = ECHO_IMAGE_WIDTH): string {
	return getOptimizedImageUrl(url, { width })
}

/** Placeholder images for premint, missing, or unavailable echo images (Vercel Blob) */
export const ECHO_PLACEHOLDER_MASC = "https://4swlq9hweqtpslft.public.blob.vercel-storage.com/echoes/echoes-unresolved.png"
export const ECHO_PLACEHOLDER_FEM = "https://4swlq9hweqtpslft.public.blob.vercel-storage.com/echoes/echoes-unresolved-fem.png"

/**
 * Get the appropriate placeholder image for an echo.
 * Matches the "Frame" trait (Masculine/Feminine) when metadata exists,
 * otherwise uses the index to deterministically pick one.
 */
export function getEchoPlaceholder(index: number): string {
	if (index < ECHOES_METADATA.length) {
		const frame = ECHOES_METADATA[index].attributes.find((a) => a.trait_type === "Frame")
		if (frame?.value === "Feminine") return ECHO_PLACEHOLDER_FEM
		return ECHO_PLACEHOLDER_MASC
	}
	// No metadata — deterministic random based on index
	return index % 2 === 0 ? ECHO_PLACEHOLDER_MASC : ECHO_PLACEHOLDER_FEM
}

/**
 * Get the primary dev image path for an echo by index (0-499).
 * Returns the first variant (00001) since there are no bare echoes_XXXX.png files.
 */
export function getEchoImage(index: number): string {
	if (index < ECHOES_METADATA.length) {
		const paths = getDevImagePaths(ECHOES_METADATA[index])
		return optimizeEchoUrl(paths[0])
	}
	return optimizeEchoUrl(`${IMAGE_PROXY_BASE}/${index}`)
}

/**
 * Get dev echo images filtered by faction attribute.
 * Only looks at echoes that have dev images.
 * Returns one image per matching echo.
 */
export function getEchoImagesByFaction(faction: string): string[] {
	const results: string[] = []
	for (let i = 0; i < DEV_IMAGE_COUNT && i < ECHOES_METADATA.length; i++) {
		const echo = ECHOES_METADATA[i]
		const factionAttr = echo.attributes.find((a) => a.trait_type === "Faction")
		if (factionAttr && factionAttr.value === faction) {
			results.push(getEchoImage(i)) // already optimized via getEchoImage
		}
	}
	return results
}

/**
 * Get a deterministic selection of echo images.
 * Uses a seed to ensure consistent results across renders (SSR-safe).
 * Cycles through different variants for visual variety.
 */
export function getEchoImagesSeeded(count: number, seed: number = 0): string[] {
	const results: string[] = []
	for (let i = 0; i < count; i++) {
		const echoIndex = (seed + i * 7) % DEV_IMAGE_COUNT
		if (echoIndex >= ECHOES_METADATA.length) {
			results.push(optimizeEchoUrl(`${IMAGE_PROXY_BASE}/${echoIndex}`))
			continue
		}
		const variantOffset = i % 4
		const paths = getDevImagePaths(ECHOES_METADATA[echoIndex])
		results.push(optimizeEchoUrl(paths[variantOffset] ?? paths[0]))
	}
	return results
}

// ---------------------------------------------------------------------------
// Reveal-aware image helpers
// ---------------------------------------------------------------------------

/**
 * Get a deterministic selection of echo images, reveal-aware.
 * Minted echoes show their real image; unminted show the placeholder.
 * Minted echoes are placed first, then placeholders fill remaining slots.
 */
export function getRevealedImagesSeeded(
	count: number,
	seed: number,
	mintedIndices: Set<number> | null,
): { src: string; index: number; revealed: boolean }[] {
	// No mint data yet — show all as placeholders (safe default)
	if (mintedIndices === null) {
		return Array.from({ length: count }, (_, i) => {
			const echoIndex = (seed + i * 7) % ECHOES_METADATA.length
			return { src: getEchoPlaceholder(echoIndex), index: echoIndex, revealed: false }
		})
	}

	const mintedArr = [...mintedIndices]
	const results: { src: string; index: number; revealed: boolean }[] = []

	// Pick from minted pool first (seeded deterministic selection)
	for (let i = 0; i < count; i++) {
		if (mintedArr.length > 0) {
			const pickIdx = (seed + i * 7) % mintedArr.length
			const echoIndex = mintedArr[pickIdx]
			const meta = echoIndex < ECHOES_METADATA.length ? ECHOES_METADATA[echoIndex] : undefined
			if (meta) {
				const variantOffset = i % 4
				const paths = getDevImagePaths(meta)
				results.push({ src: optimizeEchoUrl(paths[variantOffset] ?? paths[0]), index: echoIndex, revealed: true })
			} else {
				// Index out of metadata bounds — show as placeholder
				results.push({ src: getEchoPlaceholder(echoIndex), index: echoIndex, revealed: false })
			}
			// Remove to avoid duplicates (if count <= minted)
			mintedArr.splice(pickIdx, 1)
		} else {
			// Ran out of minted — fill with placeholders from unminted pool
			const echoIndex = (seed + i * 7) % ECHOES_METADATA.length
			results.push({ src: getEchoPlaceholder(echoIndex), index: echoIndex, revealed: false })
		}
	}
	return results
}

/**
 * Get revealed echo images filtered by faction.
 * Only returns images for minted echoes in the given faction.
 * Fills remaining slots with placeholders if not enough minted in that faction.
 */
export function getRevealedImagesByFaction(
	faction: string,
	count: number,
	mintedIndices: Set<number> | null,
): { src: string; index: number; revealed: boolean }[] {
	const results: { src: string; index: number; revealed: boolean }[] = []

	if (mintedIndices !== null) {
		for (let i = 0; i < ECHOES_METADATA.length && results.length < count; i++) {
			if (!mintedIndices.has(i)) continue
			const factionAttr = ECHOES_METADATA[i].attributes.find((a) => a.trait_type === "Faction")
			if (factionAttr?.value === faction) {
				results.push({ src: getEchoImage(i), index: i, revealed: true })
			}
		}
	}

	// Fill remaining with placeholders
	let fillIdx = 0
	while (results.length < count) {
		const echoIndex = (fillIdx * 13 + faction.length) % ECHOES_METADATA.length
		results.push({ src: getEchoPlaceholder(echoIndex), index: echoIndex, revealed: false })
		fillIdx++
	}

	return results
}

/**
 * Get all variant paths for a specific echo index.
 * @param width — override width (default 480 for grids, use 800 for detail/modal views)
 */
export function getEchoVariants(index: number, width?: ImageWidth): string[] {
	if (index >= ECHOES_METADATA.length) return [getEchoImage(index)]
	return getDevImagePaths(ECHOES_METADATA[index]).map((p) => optimizeEchoUrl(p, width))
}

/**
 * Get the faction for an echo by index.
 */
export function getEchoFaction(index: number): string | undefined {
	if (index >= ECHOES_METADATA.length) return undefined
	const attr = ECHOES_METADATA[index].attributes.find((a) => a.trait_type === "Faction")
	return attr?.value as string | undefined
}

/**
 * Get echo metadata (name, faction, rank, etc.) along with image path.
 * Useful for displaying labeled PFP cards.
 */
export function getEchoWithMeta(index: number) {
	if (index >= ECHOES_METADATA.length) return null
	const echo = ECHOES_METADATA[index]
	return {
		index,
		name: echo.name,
		image: getEchoImage(index), // already optimized via getEchoImage
		faction: echo.attributes.find((a) => a.trait_type === "Faction")?.value as string,
		rank: echo.attributes.find((a) => a.trait_type === "Rank")?.value as string,
		role: echo.attributes.find((a) => a.trait_type === "Role")?.value as string,
		bioType: echo.attributes.find((a) => a.trait_type === "Bio Type")?.value as string,
	}
}
