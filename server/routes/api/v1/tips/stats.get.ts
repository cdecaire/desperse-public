/**
 * Tip Stats Endpoint
 * GET /api/v1/tips/stats
 *
 * Get tip statistics for a user (total received, count).
 *
 * Authentication: Optional (public endpoint)
 *
 * Query Parameters:
 * - userId: UUID of the user to get tip stats for (required)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "totalReceived": 150.5,
 *     "tipCount": 12
 *   }
 * }
 */

import {
	defineEventHandler,
	getQuery,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { getTipStatsInternal } from '@/server/utils/tips-internal'

const uuidRegex =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'max-age=60',
	})

	const query = getQuery(event)
	const userId = query.userId as string | undefined

	if (!userId || !uuidRegex.test(userId)) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Valid userId (UUID) query parameter is required',
			},
			requestId,
		}
	}

	try {
		const result = await getTipStatsInternal(userId)

		if (!result.success) {
			setResponseStatus(event, 500)
			return {
				success: false,
				error: {
					code: 'SERVER_ERROR',
					message: result.error || 'Failed to get tip stats',
				},
				requestId,
			}
		}

		return {
			success: true,
			data: {
				totalReceived: result.totalReceived ?? 0,
				tipCount: result.tipCount ?? 0,
			},
			requestId,
		}
	} catch (error) {
		console.error(
			`[tips/stats][${requestId}] Error:`,
			error instanceof Error ? error.message : 'Unknown error'
		)

		setResponseStatus(event, 500)
		return {
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: 'Failed to get tip stats',
			},
			requestId,
		}
	}
})
