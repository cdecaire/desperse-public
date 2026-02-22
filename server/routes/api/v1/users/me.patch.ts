/**
 * PATCH /api/v1/users/me
 * Update current user's profile
 */

import { defineEventHandler, getHeader, readBody } from 'h3'
import { updateProfileDirect, type UpdateProfileInput } from '@/server/utils/profile'

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	try {
		// Get auth token from header
		const authHeader = getHeader(event, 'authorization')
		const token = authHeader?.replace('Bearer ', '')

		if (!token) {
			event.node!.res!.statusCode = 401
			return {
				success: false,
				error: { code: 'unauthorized', message: 'Authentication required' },
				requestId,
			}
		}

		// Parse request body
		const body = await readBody(event) as Record<string, any>

		// Build updates object with validation
		const updates: UpdateProfileInput = {}

		// displayName - optional, can be null to clear
		if ('displayName' in body) {
			if (body.displayName !== null && typeof body.displayName !== 'string') {
				event.node!.res!.statusCode = 400
				return {
					success: false,
					error: { code: 'invalid_display_name', message: 'Display name must be a string or null' },
					requestId,
				}
			}
			updates.displayName = body.displayName
		}

		// bio - optional, can be null to clear
		if ('bio' in body) {
			if (body.bio !== null && typeof body.bio !== 'string') {
				event.node!.res!.statusCode = 400
				return {
					success: false,
					error: { code: 'invalid_bio', message: 'Bio must be a string or null' },
					requestId,
				}
			}
			updates.bio = body.bio
		}

		// usernameSlug - optional
		if ('usernameSlug' in body) {
			if (typeof body.usernameSlug !== 'string') {
				event.node!.res!.statusCode = 400
				return {
					success: false,
					error: { code: 'invalid_username', message: 'Username must be a string' },
					requestId,
				}
			}
			updates.usernameSlug = body.usernameSlug
		}

		// website - optional, can be null to clear
		if ('website' in body) {
			if (body.website !== null && typeof body.website !== 'string') {
				event.node!.res!.statusCode = 400
				return {
					success: false,
					error: { code: 'invalid_website', message: 'Website must be a string or null' },
					requestId,
				}
			}
			updates.website = body.website
		}

		// avatarUrl - optional, can be null to clear
		if ('avatarUrl' in body) {
			if (body.avatarUrl !== null && typeof body.avatarUrl !== 'string') {
				event.node!.res!.statusCode = 400
				return {
					success: false,
					error: { code: 'invalid_avatar', message: 'Avatar URL must be a string or null' },
					requestId,
				}
			}
			updates.avatarUrl = body.avatarUrl
		}

		// headerUrl - optional, can be null to clear
		if ('headerUrl' in body) {
			if (body.headerUrl !== null && typeof body.headerUrl !== 'string') {
				event.node!.res!.statusCode = 400
				return {
					success: false,
					error: { code: 'invalid_header', message: 'Header URL must be a string or null' },
					requestId,
				}
			}
			updates.headerUrl = body.headerUrl
		}

		// Check if there are any updates
		if (Object.keys(updates).length === 0) {
			event.node!.res!.statusCode = 400
			return {
				success: false,
				error: { code: 'no_updates', message: 'No valid updates provided' },
				requestId,
			}
		}

		const result = await updateProfileDirect(token, updates)

		if (!result.success) {
			// Determine appropriate status code
			let statusCode = 400
			if (result.error === 'Authentication required') statusCode = 401
			else if (result.error === 'User not found') statusCode = 404
			else if (result.error === 'Username is already taken') statusCode = 409

			event.node!.res!.statusCode = statusCode
			return {
				success: false,
				error: { code: 'error', message: result.error },
				requestId,
			}
		}

		return {
			success: true,
			data: {
				user: result.user,
			},
			requestId,
		}
	} catch (error) {
		console.error('[PATCH /users/me] Error:', error)
		event.node!.res!.statusCode = 500
		return {
			success: false,
			error: { code: 'internal_error', message: 'Failed to update profile' },
			requestId,
		}
	}
})
