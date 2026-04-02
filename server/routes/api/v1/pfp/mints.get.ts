/**
 * GET /api/v1/pfp/mints
 *
 * Returns the authenticated user's confirmed PFP mints (up to 20).
 */

import {
	defineEventHandler,
	getHeader,
	setHeaders,
	setResponseStatus,
} from "h3"
import { getCurrentUserByToken } from "@/server/utils/auth-standalone"
import { getUserPfpMints } from "@/server/utils/echoes/mint"

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

	setHeaders(event, {
		"X-Request-Id": requestId,
		"X-Api-Version": "1",
		"Cache-Control": "no-store",
	})

	const authHeader = getHeader(event, "authorization")
	const token = authHeader?.startsWith("Bearer ")
		? authHeader.slice(7)
		: authHeader

	const authResult = await getCurrentUserByToken(token)
	if (!authResult.user) {
		setResponseStatus(event, 401)
		return {
			success: false,
			error: { code: "AUTH_REQUIRED", message: "Authentication required" },
			requestId,
		}
	}

	try {
		const mints = await getUserPfpMints(authResult.user.id)

		return {
			success: true,
			data: { mints },
			requestId,
		}
	} catch (error) {
		console.error(`[pfp-mints][${requestId}] Error:`, error instanceof Error ? error.message : error)
		setResponseStatus(event, 500)
		return {
			success: false,
			error: { code: "INTERNAL_ERROR", message: "Failed to get user mints" },
			requestId,
		}
	}
})
