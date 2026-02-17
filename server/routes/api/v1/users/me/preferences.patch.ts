/**
 * PATCH /api/v1/users/me/preferences
 * Update user preferences (partial update)
 */

import { defineEventHandler, getHeader, readBody } from 'h3'
import {
	updatePreferencesDirect,
	themeOptions,
	explorerOptions,
	type UpdatePreferencesInput,
} from '@/server/utils/preferences'

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	try {
		// Get auth token from header
		const authHeader = getHeader(event, 'authorization')
		const token = authHeader?.replace('Bearer ', '')

		if (!token) {
			event.node.res.statusCode = 401
			return {
				success: false,
				error: { code: 'unauthorized', message: 'Authentication required' },
				requestId,
			}
		}

		// Parse request body
		const body = await readBody(event)

		// Validate and build updates object
		const updates: UpdatePreferencesInput = {}

		// Validate theme
		if (body.theme !== undefined) {
			if (!themeOptions.includes(body.theme)) {
				event.node.res.statusCode = 400
				return {
					success: false,
					error: {
						code: 'invalid_theme',
						message: `Invalid theme. Must be one of: ${themeOptions.join(', ')}`,
					},
					requestId,
				}
			}
			updates.theme = body.theme
		}

		// Validate explorer
		if (body.explorer !== undefined) {
			if (!explorerOptions.includes(body.explorer)) {
				event.node.res.statusCode = 400
				return {
					success: false,
					error: {
						code: 'invalid_explorer',
						message: `Invalid explorer. Must be one of: ${explorerOptions.join(', ')}`,
					},
					requestId,
				}
			}
			updates.explorer = body.explorer
		}

		// Validate notifications (partial object of booleans)
		if (body.notifications !== undefined) {
			if (typeof body.notifications !== 'object') {
				event.node.res.statusCode = 400
				return {
					success: false,
					error: { code: 'invalid_notifications', message: 'Notifications must be an object' },
					requestId,
				}
			}

			const validKeys = ['follows', 'likes', 'comments', 'collects', 'purchases', 'mentions', 'messages']
			const notifUpdates: UpdatePreferencesInput['notifications'] = {}

			for (const key of validKeys) {
				if (body.notifications[key] !== undefined) {
					if (typeof body.notifications[key] !== 'boolean') {
						event.node.res.statusCode = 400
						return {
							success: false,
							error: { code: 'invalid_notification', message: `notifications.${key} must be a boolean` },
							requestId,
						}
					}
					notifUpdates[key as keyof typeof notifUpdates] = body.notifications[key]
				}
			}

			if (Object.keys(notifUpdates).length > 0) {
				updates.notifications = notifUpdates
			}
		}

		// Validate messaging preferences
		if (body.messaging !== undefined) {
			if (typeof body.messaging !== 'object') {
				event.node.res.statusCode = 400
				return {
					success: false,
					error: { code: 'invalid_messaging', message: 'Messaging must be an object' },
					requestId,
				}
			}

			const messagingUpdates: UpdatePreferencesInput['messaging'] = {}

			// Validate dmEnabled
			if (body.messaging.dmEnabled !== undefined) {
				if (typeof body.messaging.dmEnabled !== 'boolean') {
					event.node.res.statusCode = 400
					return {
						success: false,
						error: { code: 'invalid_messaging', message: 'messaging.dmEnabled must be a boolean' },
						requestId,
					}
				}
				messagingUpdates.dmEnabled = body.messaging.dmEnabled
			}

			// Validate allowBuyers
			if (body.messaging.allowBuyers !== undefined) {
				if (typeof body.messaging.allowBuyers !== 'boolean') {
					event.node.res.statusCode = 400
					return {
						success: false,
						error: { code: 'invalid_messaging', message: 'messaging.allowBuyers must be a boolean' },
						requestId,
					}
				}
				messagingUpdates.allowBuyers = body.messaging.allowBuyers
			}

			// Validate allowCollectors
			if (body.messaging.allowCollectors !== undefined) {
				if (typeof body.messaging.allowCollectors !== 'boolean') {
					event.node.res.statusCode = 400
					return {
						success: false,
						error: { code: 'invalid_messaging', message: 'messaging.allowCollectors must be a boolean' },
						requestId,
					}
				}
				messagingUpdates.allowCollectors = body.messaging.allowCollectors
			}

			// Validate collectorMinCount
			if (body.messaging.collectorMinCount !== undefined) {
				const minCount = body.messaging.collectorMinCount
				if (typeof minCount !== 'number' || !Number.isInteger(minCount) || minCount < 1 || minCount > 100) {
					event.node.res.statusCode = 400
					return {
						success: false,
						error: { code: 'invalid_messaging', message: 'messaging.collectorMinCount must be an integer between 1 and 100' },
						requestId,
					}
				}
				messagingUpdates.collectorMinCount = minCount
			}

			if (Object.keys(messagingUpdates).length > 0) {
				updates.messaging = messagingUpdates
			}
		}

		// Check if there are any updates
		if (Object.keys(updates).length === 0) {
			event.node.res.statusCode = 400
			return {
				success: false,
				error: { code: 'no_updates', message: 'No valid updates provided' },
				requestId,
			}
		}

		const result = await updatePreferencesDirect(token, updates)

		if (!result.success) {
			event.node.res.statusCode = result.error === 'User not found' ? 404 : 401
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
		console.error('[PATCH /users/me/preferences] Error:', error)
		event.node.res.statusCode = 500
		return {
			success: false,
			error: { code: 'internal_error', message: 'Failed to update preferences' },
			requestId,
		}
	}
})
