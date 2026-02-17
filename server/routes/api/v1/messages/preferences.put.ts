/**
 * Update DM Preferences Endpoint
 * PUT /api/v1/messages/preferences
 *
 * Update the authenticated user's DM preferences.
 *
 * Authentication: Required
 *
 * Body:
 * - dmEnabled: boolean (optional)
 * - allowBuyers: boolean (optional)
 * - allowCollectors: boolean (optional)
 * - collectorMinCount: number (optional)
 * - allowTippers: boolean (optional)
 * - tipMinAmount: number (optional)
 */

import {
	defineEventHandler,
	getHeader,
	readBody,
	setHeaders,
	setResponseStatus,
} from 'h3'
import { updateDmPreferencesDirect } from '@/server/utils/dm-preferences-direct'

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

	const body = await readBody(event)
	if (!body || typeof body !== 'object') {
		setResponseStatus(event, 400)
		return {
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Request body is required',
			},
			requestId,
		}
	}

	try {
		const result = await updateDmPreferencesDirect(token, body)

		if (!result.success) {
			const isAuthError = result.error?.toLowerCase().includes('auth')
			setResponseStatus(event, isAuthError ? 401 : 400)
			return {
				success: false,
				error: {
					code: isAuthError ? 'UNAUTHORIZED' : 'VALIDATION_ERROR',
					message: result.error || 'Failed to update DM preferences',
				},
				requestId,
			}
		}

		return {
			success: true,
			data: result.preferences,
			requestId,
		}
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'
		console.error(`[messages/preferences/put][${requestId}] Error:`, error)

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
