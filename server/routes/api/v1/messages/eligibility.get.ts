/**
 * Check DM Eligibility Endpoint
 * GET /api/v1/messages/eligibility
 *
 * Check whether the authenticated user is eligible to DM a specific creator.
 *
 * Authentication: Required
 *
 * Query Parameters:
 * - creatorId: UUID of the creator to check eligibility for (required)
 */

import {
	defineEventHandler,
	getQuery,
	getHeader,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { authenticateWithToken } from '@/server/auth'
import { checkDmEligibility } from '@/server/utils/dm-eligibility-internal'

const uuidRegex =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'no-store',
	})

	const token = getHeader(event, 'authorization')?.replace('Bearer ', '')
	if (!token) {
		setResponseStatus(event, 401)
		return {
			success: false,
			error: {
				code: 'UNAUTHORIZED',
				message: 'Authentication required',
			},
			requestId,
		}
	}

	let userId: string
	try {
		const auth = await authenticateWithToken(token)
		if (!auth?.userId) {
			setResponseStatus(event, 401)
			return {
				success: false,
				error: {
					code: 'UNAUTHORIZED',
					message: 'Invalid or expired token',
				},
				requestId,
			}
		}
		userId = auth.userId
	} catch (error) {
		setResponseStatus(event, 401)
		return {
			success: false,
			error: {
				code: 'UNAUTHORIZED',
				message: 'Authentication failed',
			},
			requestId,
		}
	}

	const query = getQuery(event)
	const creatorId = query.creatorId as string | undefined

	if (!creatorId || !uuidRegex.test(creatorId)) {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Valid creatorId (UUID) query parameter is required',
			},
			requestId,
		}
	}

	try {
		const result = await checkDmEligibility(creatorId, userId)

		if (!result.success || !result.data) {
			setResponseStatus(event, 500)
			return {
				success: false,
				error: {
					code: 'SERVER_ERROR',
					message: result.error || 'Failed to check eligibility',
				},
				requestId,
			}
		}

		return {
			success: true,
			data: result.data,
			requestId,
		}
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'
		console.error(`[messages/eligibility][${requestId}] Error:`, error)

		setResponseStatus(event, 500)
		return {
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: errorMessage,
			},
			requestId,
		}
	}
})
