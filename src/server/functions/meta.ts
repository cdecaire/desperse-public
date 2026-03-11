/**
 * Server functions for SEO metadata
 * Used by route loaders to fetch data for OG/meta tags during SSR
 */

import { createServerFn } from "@tanstack/react-start"

export const fetchPostMeta = createServerFn({
	method: "GET",
}).handler(async (input: unknown) => {
	const { getPostMeta } = await import("@/server/utils/post-meta")
	const { postId } = (input as { data: { postId: string } }).data
	if (!postId || typeof postId !== "string") return null
	return getPostMeta(postId)
})

export const fetchProfileMeta = createServerFn({
	method: "GET",
}).handler(async (input: unknown) => {
	const { getProfileMeta } = await import("@/server/utils/profile-meta")
	const { slug } = (input as { data: { slug: string } }).data
	if (!slug || typeof slug !== "string") return null
	return getProfileMeta(slug)
})
