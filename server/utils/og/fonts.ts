/** Font loading for Satori OG image generation */

import type { SatoriOptions } from "satori"

let fontsCache: SatoriOptions["fonts"] | null = null

// @ts-expect-error — Nitro runtime module, types not exposed but resolves at build time
import { useStorage } from "nitro/storage"

export async function loadFonts(): Promise<SatoriOptions["fonts"]> {
	if (fontsCache) return fontsCache

	// Use Nitro's storage API to access serverAssets (works on Vercel)
	const storage = useStorage("assets")

	const [mediumFont, boldFont] = await Promise.all([
		storage.getItemRaw<ArrayBuffer>("fonts:Figtree-Medium.ttf"),
		storage.getItemRaw<ArrayBuffer>("fonts:Figtree-Bold.ttf"),
	])

	if (!mediumFont || !boldFont) {
		throw new Error("[OG] Font files not found in server assets")
	}

	fontsCache = [
		{
			name: "Figtree",
			data: Buffer.from(mediumFont),
			weight: 500,
			style: "normal" as const,
		},
		{
			name: "Figtree",
			data: Buffer.from(boldFont),
			weight: 700,
			style: "normal" as const,
		},
	]

	return fontsCache
}
