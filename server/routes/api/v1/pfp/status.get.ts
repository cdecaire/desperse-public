/**
 * GET /api/v1/pfp/status
 *
 * Returns PFP mint state for the authenticated user:
 * phase, eligibility, supply, price, windows, mintCount
 */

import {
	defineEventHandler,
	getHeader,
	getQuery,
	setHeaders,
	setResponseStatus,
} from "h3";
import { getCurrentUserByToken } from "@/server/utils/auth-standalone";
import { getPfpMintStatus } from "@/server/utils/echoes/mint";

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`;

	setHeaders(event, {
		"X-Request-Id": requestId,
		"X-Api-Version": "1",
		"Cache-Control": "no-store",
	});

	const authHeader = getHeader(event, "authorization");
	const token = authHeader?.startsWith("Bearer ")
		? authHeader.slice(7)
		: authHeader;

	const authResult = token ? await getCurrentUserByToken(token) : { user: null };

	// Allow client to pass the active wallet address (may differ from DB wallet
	// when user connected an external wallet for Echoes)
	const query = getQuery(event);
	const walletParam = typeof query.wallet === "string" ? query.wallet : null;
	const walletAddress = walletParam || authResult.user?.walletAddress || null;

	try {
		const status = await getPfpMintStatus(
			authResult.user?.id ?? null,
			walletAddress,
		);

		return {
			success: true,
			data: status,
			requestId,
		};
	} catch (error) {
		console.error(`[pfp-status][${requestId}] Error:`, error instanceof Error ? error.message : error);
		setResponseStatus(event, 500);
		return {
			success: false,
			error: { code: "INTERNAL_ERROR", message: "Failed to get mint status" },
			requestId,
		};
	}
});
