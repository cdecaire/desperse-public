import { describe, expect, it } from "vitest"

import {
	primaryFontFamily,
	sableDesignThemes,
	sableThemeFontsUrl,
} from "./sable-theme"

describe("primaryFontFamily", () => {
	it("unquotes the first family in a stack", () => {
		expect(primaryFontFamily('"Geist Mono", ui-monospace, monospace')).toBe("Geist Mono")
		expect(primaryFontFamily("'Inter', sans-serif")).toBe("Inter")
		expect(primaryFontFamily("system-ui, sans-serif")).toBe("system-ui")
	})
})

describe("sableThemeFontsUrl", () => {
	it("covers every primary face of every bundled theme (or that theme needs no load)", () => {
		// Contract: when a Sable release adds/changes a theme's fonts, its primary
		// families must be added to GOOGLE_FONT_SPECS in sable-theme.ts — otherwise
		// the theme silently renders on fallback faces. The desperse theme's fonts
		// ship in the base bundle, so it alone may resolve to null.
		for (const manifest of sableDesignThemes) {
			const url = sableThemeFontsUrl(manifest.id)
			const primaries = [manifest.fonts.sans, manifest.fonts.mono, manifest.fonts.display]
				.filter((stack): stack is string => Boolean(stack))
				.map(primaryFontFamily)
				// Base-bundle families are covered by the styles.css @import.
				.filter((family) => family !== "Figtree" && family !== "DM Mono")

			if (primaries.length === 0) {
				expect(url).toBeNull()
				continue
			}

			expect(url, `theme "${manifest.id}" has unmapped primary fonts: ${primaries.join(", ")}`).not.toBeNull()
			for (const family of primaries) {
				expect(
					decodeURIComponent(url ?? "").replace(/\+/g, " "),
					`theme "${manifest.id}": family "${family}" missing from GOOGLE_FONT_SPECS`,
				).toContain(family)
			}
		}
	})

	it("builds a single css2 URL with display=swap", () => {
		const meridian = sableThemeFontsUrl("meridian")
		expect(meridian).toMatch(/^https:\/\/fonts\.googleapis\.com\/css2\?family=/)
		expect(meridian).toContain("display=swap")
		expect(meridian).toContain("Instrument+Sans")
		expect(meridian).toContain("Geist+Mono")
	})

	it("loads nothing extra for the default desperse theme", () => {
		expect(sableThemeFontsUrl("desperse")).toBeNull()
	})
})
