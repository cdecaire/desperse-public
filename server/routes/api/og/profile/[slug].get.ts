/**
 * Dynamic OG Image for Profiles
 * GET /api/og/profile/:slug → 1200×630 PNG
 */

import { defineEventHandler, getRouterParam } from "h3"

export default defineEventHandler(async (event) => {
	try {
		const slug = getRouterParam(event, "slug")
		if (!slug || typeof slug !== "string") {
			return new Response("Invalid slug", { status: 400 })
		}

		const { getProfileMeta } = await import("@/server/utils/profile-meta")
		const { renderOgImage, fetchImageAsDataUri } = await import(
			"../../../../utils/og/renderer"
		)
		const { profileTemplate } = await import("../../../../utils/og/templates")

		const meta = await getProfileMeta(slug)
		if (!meta) {
			return Response.redirect("/api/og/default", 302)
		}

		// Pre-fetch avatar and header as data URIs (with timeout)
		const [avatarDataUri, headerDataUri] = await Promise.all([
			meta.avatarUrl ? fetchImageAsDataUri(meta.avatarUrl) : null,
			meta.headerUrl ? fetchImageAsDataUri(meta.headerUrl) : null,
		])

		const png = await renderOgImage(
			profileTemplate(meta, avatarDataUri, headerDataUri),
		)

		return new Response(png as unknown as BodyInit, {
			headers: {
				"Content-Type": "image/jpeg",
				"Cache-Control":
					"public, s-maxage=3600, stale-while-revalidate=86400",
			},
		})
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error)
		const stack = error instanceof Error ? error.stack : ""
		console.error("[OG/profile] Failed to generate image:", msg, stack)
		return new Response(`Failed to generate image: ${msg}`, { status: 500 })
	}
})
