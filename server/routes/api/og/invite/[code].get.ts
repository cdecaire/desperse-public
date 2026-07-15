/**
 * Invite-specific OG image.
 * GET /api/og/invite/:code → 1200×630 JPEG
 */

import { defineEventHandler, getRequestURL, getRouterParam } from "h3"

export default defineEventHandler(async (event) => {
	const origin = getRequestURL(event).origin
	const fallback = () => Response.redirect(`${origin}/api/og/default`, 302)

	try {
		const code = getRouterParam(event, "code")
		if (!code || typeof code !== "string") return fallback()

		const { getReferrerInvitePreview } = await import("@/server/utils/referrals")
		const preview = await getReferrerInvitePreview(code)
		if (!preview) return fallback()

		const { renderOgImage, fetchImageAsDataUri } = await import(
			"../../../../utils/og/renderer"
		)
		const { inviteTemplate } = await import("../../../../utils/og/templates")
		const firstPost = preview.samplePosts[0]
		const artUrl = firstPost?.coverUrl || firstPost?.mediaUrl || null
		const [artDataUri, avatarDataUri] = await Promise.all([
			artUrl ? fetchImageAsDataUri(artUrl, 3000, true) : null,
			preview.referrer.avatarUrl ? fetchImageAsDataUri(preview.referrer.avatarUrl, 3000, true) : null,
		])
		const displayName = preview.referrer.displayName?.trim() || preview.referrer.slug || "A creator"
		const image = await renderOgImage(
			inviteTemplate(
				{ displayName, slug: preview.referrer.slug },
				artDataUri,
				avatarDataUri,
			),
		)

		return new Response(image as unknown as BodyInit, {
			headers: {
				"Content-Type": "image/jpeg",
				"Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
			},
		})
	} catch (error) {
		console.error("[OG/invite] Failed to generate image:", error)
		return fallback()
	}
})
