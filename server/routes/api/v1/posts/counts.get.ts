/**
 * Post Counts Endpoint
 * GET /api/v1/posts/counts?postIds=id1,id2,...
 *
 * Returns collect counts and current supply for multiple posts.
 * Used for real-time polling on feed to keep counts fresh.
 *
 * No authentication required (public data).
 *
 * Query Parameters:
 * - postIds: comma-separated list of post UUIDs (max 50)
 */

import {
	defineEventHandler,
	getQuery,
	setHeaders,
	createError,
} from 'h3'
import { db } from '@/server/db'
import { collections, purchases } from '@/server/db/schema'
import { eq, and, inArray, count } from 'drizzle-orm'
import { z } from 'zod'

const postIdSchema = z.string().uuid()

export default defineEventHandler(async (event) => {
	setHeaders(event, {
		'Cache-Control': 'no-store',
	})

	const query = getQuery(event)
	const postIdsRaw = query.postIds as string | undefined

	if (!postIdsRaw) {
		throw createError({ statusCode: 400, statusMessage: 'postIds query parameter is required' })
	}

	const postIds = postIdsRaw.split(',').filter(Boolean)

	if (postIds.length === 0) {
		return { success: true, counts: {} }
	}

	if (postIds.length > 50) {
		throw createError({ statusCode: 400, statusMessage: 'Maximum 50 post IDs per request' })
	}

	// Validate each ID is a UUID
	for (const id of postIds) {
		const result = postIdSchema.safeParse(id)
		if (!result.success) {
			throw createError({ statusCode: 400, statusMessage: `Invalid post ID: ${id}` })
		}
	}

	try {
		// Get collect counts for collectibles
		const collectCountResults = await db
			.select({
				postId: collections.postId,
				count: count(),
			})
			.from(collections)
			.where(
				and(
					inArray(collections.postId, postIds),
					eq(collections.status, 'confirmed')
				)
			)
			.groupBy(collections.postId)

		const collectCounts: Record<string, number> = Object.fromEntries(
			collectCountResults.map(r => [r.postId, r.count])
		)

		// Get current supply for editions (count confirmed purchases only)
		const purchaseCountResults = await db
			.select({
				postId: purchases.postId,
				count: count(),
			})
			.from(purchases)
			.where(
				and(
					inArray(purchases.postId, postIds),
					eq(purchases.status, 'confirmed')
				)
			)
			.groupBy(purchases.postId)

		const supplyCounts: Record<string, number> = Object.fromEntries(
			purchaseCountResults.map(r => [r.postId, r.count])
		)

		// Combine results
		const counts: Record<string, { collectCount: number; currentSupply: number }> = {}
		for (const postId of postIds) {
			counts[postId] = {
				collectCount: collectCounts[postId] || 0,
				currentSupply: supplyCounts[postId] || 0,
			}
		}

		return { success: true, counts }
	} catch (error) {
		console.error('Error in post counts endpoint:', error)
		throw createError({ statusCode: 500, statusMessage: 'Failed to fetch post counts' })
	}
})
