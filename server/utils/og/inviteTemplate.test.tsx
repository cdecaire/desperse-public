import fs from "node:fs/promises"
import satori from "satori"
import { describe, expect, it } from "vitest"
import { inviteTemplate } from "./templates"

const tinyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="

async function renderInvite(art: string | null, avatar: string | null) {
	const fontFiles = [
		["Figtree-Medium.ttf", 500],
		["Figtree-Bold.ttf", 700],
		["Figtree-ExtraBold.ttf", 800],
	] as const
	const fonts = await Promise.all(
		fontFiles.map(async ([file, weight]) => ({
			name: "Figtree",
			data: await fs.readFile(new URL(`../../assets/fonts/${file}`, import.meta.url)),
			weight,
			style: "normal" as const,
		})),
	)
	return satori(
		inviteTemplate({ displayName: "Alice Example", slug: "alice" }, art, avatar),
		{
			width: 1200,
			height: 630,
			fonts,
		},
	)
}

describe("inviteTemplate", () => {
	it.each([
		["fallback", null, null],
		["first-post art", tinyPng, tinyPng],
	] as const)("renders a 1200x630 %s image", async (_name, art, avatar) => {
		const svg = await renderInvite(art, avatar)
		expect(svg).toContain('<svg width="1200" height="630"')
		expect(svg.length).toBeGreaterThan(10_000)
	})
})
