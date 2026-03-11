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

		// Pre-fetch avatar as data URI (with timeout)
		const avatarDataUri = meta.avatarUrl
			? await fetchImageAsDataUri(meta.avatarUrl)
			: null

		const png = await renderOgImage(profileTemplate(meta, avatarDataUri))

		return new Response(png as unknown as BodyInit, {
			headers: {
				"Content-Type": "image/png",
				"Cache-Control":
					"public, s-maxage=3600, stale-while-revalidate=86400",
			},
		})
	} catch (error) {
		console.error("[OG/profile] Failed to generate image:", error)
		return new Response("Failed to generate image", { status: 500 })
	}
})
