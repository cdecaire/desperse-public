/**
 * POST /api/v1/pfp/confirm
 *
 * Accept a signed transaction from the client, broadcast to devnet,
 * and record the transaction signature.
 */

import {
	defineEventHandler,
	getHeader,
	readBody,
	setHeaders,
	setResponseStatus,
} from "h3";
import { getCurrentUserByToken } from "@/server/utils/auth-standalone";
import { confirmPfpMint } from "@/server/utils/echoes/mint";

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

	// Parse body
	let body: { mintId?: string; signedTxBase64?: string };
	try {
		body = (await readBody(event)) as { mintId?: string; signedTxBase64?: string };
	} catch {
		setResponseStatus(event, 400);
		return {
			success: false,
			error: { code: "VALIDATION_ERROR", message: "Invalid request body" },
			requestId,
		};
	}

	if (!body.mintId || !body.signedTxBase64) {
		setResponseStatus(event, 400);
		return {
			success: false,
			error: { code: "VALIDATION_ERROR", message: "mintId and signedTxBase64 are required" },
			requestId,
		};
	}

	try {
		const result = await confirmPfpMint(body.mintId, body.signedTxBase64);

		console.log(`[pfp-confirm][${requestId}] Tx broadcast for mintId=${body.mintId} sig=${result.txSignature.slice(0, 20)}...`);

		return {
			success: true,
			data: result,
			requestId,
		};
	} catch (error) {
		const msg = error instanceof Error ? error.message : "Unknown error";
		console.error(`[pfp-confirm][${requestId}] Error:`, msg);
		setResponseStatus(event, 500);
		return {
			success: false,
			error: { code: "BROADCAST_FAILED", message: msg },
			requestId,
		};
	}
});
