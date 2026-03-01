/**
 * Arweave Funding Monitor Endpoint
 * GET /api/v1/arweave-monitor
 *
 * Called by Vercel Cron or external scheduler every 15 minutes.
 * Checks Arweave-enabled editions and updates their funding status.
 * Requires CRON_SECRET for authorization.
 */

import { defineEventHandler, getHeader, createError } from "h3";

export default defineEventHandler(async (event) => {
	// Verify cron secret
	const authHeader = getHeader(event, "authorization");
	const cronSecret = process.env.CRON_SECRET;

	if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
		throw createError({ statusCode: 401, message: "Unauthorized" });
	}

	try {
		const { runArweaveFundingMonitor } = await import(
			"@/server/jobs/arweave-funding-monitor"
		);
		const result = await runArweaveFundingMonitor();

		return { success: true, ...result };
	} catch (error) {
		console.error(
			"[arweave-monitor] Cron job failed:",
			error instanceof Error ? error.message : "Unknown error",
		);
		throw createError({
			statusCode: 500,
			message: "Arweave funding monitor failed",
		});
	}
});
