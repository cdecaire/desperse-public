/**
 * Version Endpoint
 * GET /api/v1/version
 *
 * Returns version information for debugging and force-update checks.
 * No authentication required.
 */

import { defineEventHandler, setHeaders } from 'h3'

export default defineEventHandler((event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	// Get build SHA from Vercel environment or git
	const buildSha =
		process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 9) ||
		process.env.GIT_COMMIT_SHA?.slice(0, 9) ||
		'development'

	// Determine environment
	let env: 'production' | 'preview' | 'development' = 'development'
	if (process.env.VERCEL_ENV === 'production') {
		env = 'production'
	} else if (process.env.VERCEL_ENV === 'preview') {
		env = 'preview'
	} else if (process.env.NODE_ENV === 'production') {
		env = 'production'
	}

	// Android version requirements (can be moved to env vars when needed)
	const minAndroidVersion =
		process.env.MIN_ANDROID_VERSION || '1.0.0'
	const currentAndroidVersion =
		process.env.CURRENT_ANDROID_VERSION || '1.0.0'

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'public, max-age=60', // Cache for 1 minute
	})

	return {
		success: true,
		data: {
			api: '1',
			build: buildSha,
			env,
			minAndroidVersion,
			currentAndroidVersion,
		},
		requestId,
	}
})
