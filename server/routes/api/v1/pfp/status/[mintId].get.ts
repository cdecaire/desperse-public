/**
 * GET /api/v1/pfp/status/:mintId
 *
 * Poll for on-chain confirmation of a specific mint.
 * Returns status, txSignature, nftMintAddress.
 */

import {
	defineEventHandler,
	getHeader,
	getRouterParam,
	setHeaders,
	setResponseStatus,
} from "h3";
import { getCurrentUserByToken } from "@/server/utils/auth-standalone";
import { checkPfpMintStatus } from "@/server/utils/echoes/mint";

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`;

	setHeaders(event, {
		"X-Request-Id": requestId,
		"X-Api-Version": "1",
		"Cache-Control": "no-store",
	});

	// Auth
	const authHeader = getHeader(event, "authorization");
	const token = authHeader?.startsWith("Bearer ")
		? authHeader.slice(7)
		: authHeader;

	const authResult = await getCurrentUserByToken(token);
	if (!authResult.user) {
		setResponseStatus(event, 401);
		return {
			success: false,
			error: { code: "AUTH_REQUIRED", message: "Authentication required" },
			requestId,
		};
	}

	const mintId = getRouterParam(event, "mintId");
	if (!mintId) {
		setResponseStatus(event, 400);
		return {
			success: false,
			error: { code: "VALIDATION_ERROR", message: "mintId is required" },
			requestId,
		};
	}

	try {
		const result = await checkPfpMintStatus(mintId);

		return {
			success: true,
			data: result,
			requestId,
		};
	} catch (error) {
		console.error(`[pfp-status-check][${requestId}] Error:`, error instanceof Error ? error.message : error);
		setResponseStatus(event, 500);
		return {
			success: false,
			error: { code: "INTERNAL_ERROR", message: "Failed to check mint status" },
			requestId,
		};
	}
});
