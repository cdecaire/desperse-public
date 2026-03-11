/**
 * Default OG Image
 * GET /api/og/default → 1200×630 PNG (generic Desperse branding)
 */

import { defineEventHandler } from "h3"

export default defineEventHandler(async () => {
	try {
		const { renderOgImage } = await import("../../../utils/og/renderer")
		const { defaultTemplate } = await import("../../../utils/og/templates")

		const png = await renderOgImage(defaultTemplate())

		return new Response(png as unknown as BodyInit, {
			headers: {
				"Content-Type": "image/png",
				"Cache-Control":
					"public, s-maxage=86400, stale-while-revalidate=604800",
			},
		})
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error)
		const stack = error instanceof Error ? error.stack : ""
		console.error("[OG/default] Failed to generate image:", msg, stack)
		return new Response(`Failed to generate image: ${msg}`, { status: 500 })
	}
})
