/**
 * Dynamic OG Image for Posts
 * GET /api/og/post/:id → 1200×630 PNG
 */

import { defineEventHandler, getRouterParam } from "h3"

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default defineEventHandler(async (event) => {
	try {
		const postId = getRouterParam(event, "id")
		if (!postId || !UUID_RE.test(postId)) {
			return new Response("Invalid post ID", { status: 400 })
		}

		const { getPostMeta } = await import("@/server/utils/post-meta")
		const { renderOgImage, fetchImageAsDataUri } = await import(
			"../../../../utils/og/renderer"
		)
		const { postTemplate } = await import("../../../../utils/og/templates")

		const meta = await getPostMeta(postId)
		if (!meta) {
			// Redirect to default OG for missing posts
			return Response.redirect("/api/og/default", 302)
		}

		// Pre-fetch media image as data URI (with timeout)
		const imageDataUri = meta.imageUrl
			? await fetchImageAsDataUri(meta.imageUrl)
			: null

		const png = await renderOgImage(postTemplate(meta, imageDataUri))

		return new Response(png as unknown as BodyInit, {
			headers: {
				"Content-Type": "image/png",
				"Cache-Control":
					"public, s-maxage=3600, stale-while-revalidate=86400",
			},
		})
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error)
		const stack = error instanceof Error ? error.stack : ""
		console.error("[OG/post] Failed to generate image:", msg, stack)
		return new Response(`Failed to generate image: ${msg}`, { status: 500 })
	}
})
