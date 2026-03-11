/** Font loading for Satori OG image generation */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import type { SatoriOptions } from "satori"

let fontsCache: SatoriOptions["fonts"] | null = null

export function loadFonts(): SatoriOptions["fonts"] {
	if (fontsCache) return fontsCache

	const fontsDir = resolve(process.cwd(), "server/assets/fonts")

	fontsCache = [
		{
			name: "Figtree",
			data: readFileSync(resolve(fontsDir, "Figtree-Medium.ttf")),
			weight: 500,
			style: "normal" as const,
		},
		{
			name: "Figtree",
			data: readFileSync(resolve(fontsDir, "Figtree-Bold.ttf")),
			weight: 700,
			style: "normal" as const,
		},
	]

	return fontsCache
}
