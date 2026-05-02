/**
 * GET /api/v1/users/me/preferences
 * Get user preferences
 */

import { defineEventHandler, getHeader, setResponseStatus } from 'h3'
import { getPreferencesDirect } from '@/server/utils/preferences'

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	try {
		// Get auth token from header
		const authHeader = getHeader(event, 'authorization')
		const token = authHeader?.replace('Bearer ', '')

		if (!token) {
			setResponseStatus(event, 401)
			return {
				success: false,
				error: { code: 'unauthorized', message: 'Authentication required' },
				requestId,
			}
		}

		const result = await getPreferencesDirect(token)

		if (!result.success) {
			setResponseStatus(event, result.error === 'User not found' ? 404 : 401)
			return {
				success: false,
				error: { code: 'error', message: result.error },
				requestId,
			}
		}

		return {
			success: true,
			data: {
				preferences: result.preferences,
			},
			requestId,
		}
	} catch (error) {
		console.error('[GET /users/me/preferences] Error:', error)
		setResponseStatus(event, 500)
		return {
			success: false,
			error: { code: 'internal_error', message: 'Failed to get preferences' },
			requestId,
		}
	}
})
