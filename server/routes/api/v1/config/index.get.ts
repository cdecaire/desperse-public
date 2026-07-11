/**
 * Remote Config Endpoint
 * GET /api/v1/config
 *
 * Feature-flag kill switch for the iOS app. Each flag is sourced from an
 * environment variable so ops can disable a feature via env + redeploy
 * without a client release. Unset vars default to true (enabled).
 *
 * NOTE: flag keys are intentionally snake_case (not the usual camelCase)
 * — they must match the keys FeatureFlags.swift resolves on the client
 * ("wallet_enabled" etc.).
 *
 * No authentication required.
 */

import { defineEventHandler, setHeaders } from 'h3'

/** Parse a boolean flag env var; unset/empty defaults to true. */
function flagFromEnv(name: string): boolean {
	const raw = process.env[name]
	if (raw === undefined || raw === '') return true
	return !['false', '0', 'off', 'no'].includes(raw.trim().toLowerCase())
}

export default defineEventHandler((event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	setHeaders(event, {
		'X-Request-Id': requestId,
		'X-Api-Version': '1',
		'Cache-Control': 'public, max-age=60', // Cache for 1 minute
	})

	return {
		success: true,
		data: {
			flags: {
				wallet_enabled: flagFromEnv('FLAG_WALLET_ENABLED'),
				collect_enabled: flagFromEnv('FLAG_COLLECT_ENABLED'),
				editions_enabled: flagFromEnv('FLAG_EDITIONS_ENABLED'),
				tipping_enabled: flagFromEnv('FLAG_TIPPING_ENABLED'),
				realtime_enabled: flagFromEnv('FLAG_REALTIME_ENABLED'),
				create_post_enabled: flagFromEnv('FLAG_CREATE_POST_ENABLED'),
			},
		},
		requestId,
	}
})
