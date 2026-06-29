/**
 * Discord re-verification cron.
 * GET /api/v1/discord/recheck
 *
 * Re-checks every linked member's Echoes holdings and revokes roles from anyone
 * who no longer holds (after the grace window). Wire this to a Vercel Cron Job
 * (daily is plenty) with the CRON_SECRET bearer token, like /api/v1/arweave-monitor.
 */

import { defineEventHandler, getHeader, createError } from 'h3'

export default defineEventHandler(async (event) => {
	const authHeader = getHeader(event, 'authorization')
	const cronSecret = process.env.CRON_SECRET
	if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
	}

	const { runDiscordReverify } = await import('@/server/jobs/discord-reverify')
	const summary = await runDiscordReverify()
	return { success: true, ...summary }
})
