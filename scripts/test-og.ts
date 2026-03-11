/**
 * Test script for OG image generation
 *
 * Usage:
 *   npx tsx scripts/test-og.ts                          # Generate default OG
 *   npx tsx scripts/test-og.ts post <postId>             # Generate post OG
 *   npx tsx scripts/test-og.ts profile <slug>            # Generate profile OG
 *   npx tsx scripts/test-og.ts mock-post                 # Generate with mock post data
 *   npx tsx scripts/test-og.ts mock-profile              # Generate with mock profile data
 *
 * Output is saved to scripts/og-output.png
 */

import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import satori from "satori"
import { Resvg } from "@resvg/resvg-wasm"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"

// Initialize WASM
const require = createRequire(import.meta.url)
const wasmPath = require.resolve("@resvg/resvg-wasm/index_bg.wasm")
const { initWasm } = await import("@resvg/resvg-wasm")
await initWasm(readFileSync(wasmPath))

// Load fonts
const fontsDir = resolve(process.cwd(), "server/assets/fonts")
const fonts = [
	{
		name: "Figtree",
		data: readFileSync(resolve(fontsDir, "Figtree-Medium.ttf")),
		weight: 500 as const,
		style: "normal" as const,
	},
	{
		name: "Figtree",
		data: readFileSync(resolve(fontsDir, "Figtree-Bold.ttf")),
		weight: 700 as const,
		style: "normal" as const,
	},
]

// Import templates
const {
	postTemplate,
	profileTemplate,
	defaultTemplate,
} = await import("../server/utils/og/templates")
const { OG_WIDTH, OG_HEIGHT } = await import("../server/utils/og/constants")

async function render(element: React.ReactNode): Promise<Buffer> {
	const svg = await satori(element, { width: OG_WIDTH, height: OG_HEIGHT, fonts })
	const resvg = new Resvg(svg, { fitTo: { mode: "width", value: OG_WIDTH } })
	return Buffer.from(resvg.render().asPng())
}

async function fetchImage(url: string): Promise<string | null> {
	try {
		const res = await fetch(url)
		if (!res.ok) return null
		const buf = await res.arrayBuffer()
		const ct = res.headers.get("content-type") || "image/png"
		return `data:${ct};base64,${Buffer.from(buf).toString("base64")}`
	} catch {
		return null
	}
}

const outputPath = resolve(process.cwd(), "scripts/og-output.png")
const [command, arg] = process.argv.slice(2)

if (command === "post" && arg) {
	// Real post from DB
	const { getPostMeta } = await import("../src/server/utils/post-meta")
	const meta = await getPostMeta(arg)
	if (!meta) {
		console.error("Post not found:", arg)
		process.exit(1)
	}
	console.log("Post meta:", meta)
	const imageDataUri = meta.imageUrl ? await fetchImage(meta.imageUrl) : null
	console.log("Image fetched:", imageDataUri ? "yes" : "no")
	const png = await render(postTemplate(meta, imageDataUri))
	writeFileSync(outputPath, png)
	console.log(`Saved to ${outputPath}`)
} else if (command === "profile" && arg) {
	// Real profile from DB
	const { getProfileMeta } = await import("../src/server/utils/profile-meta")
	const meta = await getProfileMeta(arg)
	if (!meta) {
		console.error("Profile not found:", arg)
		process.exit(1)
	}
	console.log("Profile meta:", meta)
	const avatarDataUri = meta.avatarUrl ? await fetchImage(meta.avatarUrl) : null
	const png = await render(profileTemplate(meta, avatarDataUri))
	writeFileSync(outputPath, png)
	console.log(`Saved to ${outputPath}`)
} else if (command === "mock-post") {
	// Mock post with image
	const mockWithImage = postTemplate(
		{
			title: "Genesis Drop by pixeljedi",
			description:
				"A stunning pixel art piece capturing the essence of Times Square at night. Limited edition collectible on Solana.",
			imageUrl: null,
			type: "edition",
			creatorName: "pixeljedi",
			creatorSlug: "pixeljedi",
			creatorAvatar: null,
		},
		null, // No image for this mock — test the no-image variant
	)
	const png = await render(mockWithImage)
	writeFileSync(outputPath, png)
	console.log(`Saved mock post (no image) to ${outputPath}`)

	// Also generate with-image variant using a placeholder
	const mockImageUri =
		"data:image/svg+xml;base64," +
		Buffer.from(
			'<svg width="720" height="630" xmlns="http://www.w3.org/2000/svg"><rect width="720" height="630" fill="#7c3aed"/><text x="360" y="315" text-anchor="middle" fill="white" font-size="48">Artwork</text></svg>',
		).toString("base64")
	const mockWithImg = postTemplate(
		{
			title: "Genesis Drop by pixeljedi",
			description:
				"A stunning pixel art piece capturing the essence of Times Square at night.",
			imageUrl: "mock",
			type: "edition",
			creatorName: "pixeljedi",
			creatorSlug: "pixeljedi",
			creatorAvatar: null,
		},
		mockImageUri,
	)
	const png2 = await render(mockWithImg)
	const outputPath2 = resolve(process.cwd(), "scripts/og-output-with-image.png")
	writeFileSync(outputPath2, png2)
	console.log(`Saved mock post (with image) to ${outputPath2}`)
} else if (command === "mock-profile") {
	// Mock profile
	const mock = profileTemplate(
		{
			displayName: "pixeljedi",
			slug: "pixeljedi",
			bio: "Pixel artist & collector. Building in public on Solana. GM every day.",
			avatarUrl: null,
		},
		null,
	)
	const png = await render(mock)
	writeFileSync(outputPath, png)
	console.log(`Saved mock profile to ${outputPath}`)
} else {
	// Default
	const png = await render(defaultTemplate())
	writeFileSync(outputPath, png)
	console.log(`Saved default OG to ${outputPath}`)
}

process.exit(0)
