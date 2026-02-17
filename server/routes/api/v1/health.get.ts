/**
 * Health Check Endpoint
 * GET /api/v1/health
 *
 * Returns basic health status for uptime monitoring.
 * No authentication required.
 */

import { defineEventHandler, setHeaders } from 'h3'

export default defineEventHandler((event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'no-store',
	})

	return {
		success: true,
		data: {
			status: 'ok',
			api: '1',
		},
		requestId,
	}
})
