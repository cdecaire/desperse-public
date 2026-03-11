/** Font loading for Satori OG image generation */

import type { SatoriOptions } from "satori"

let fontsCache: SatoriOptions["fonts"] | null = null

import { useStorage } from "nitro/storage"

export async function loadFonts(): Promise<SatoriOptions["fonts"]> {
	if (fontsCache) return fontsCache

	// Use Nitro's storage API to access serverAssets (works on Vercel)
	const storage = useStorage("assets")

	const [mediumFont, boldFont, extraBoldFont, blackFont] = await Promise.all([
		storage.getItemRaw<ArrayBuffer>("fonts:Figtree-Medium.ttf"),
		storage.getItemRaw<ArrayBuffer>("fonts:Figtree-Bold.ttf"),
		storage.getItemRaw<ArrayBuffer>("fonts:Figtree-ExtraBold.ttf"),
		storage.getItemRaw<ArrayBuffer>("fonts:Figtree-Black.ttf"),
	])

	if (!mediumFont || !boldFont || !extraBoldFont || !blackFont) {
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
		{
			name: "Figtree",
			data: Buffer.from(extraBoldFont),
			weight: 800,
			style: "normal" as const,
		},
		{
			name: "Figtree",
			data: Buffer.from(blackFont),
			weight: 900,
			style: "normal" as const,
		},
	]

	return fontsCache
}
