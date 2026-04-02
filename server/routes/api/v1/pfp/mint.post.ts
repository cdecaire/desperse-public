/**
 * POST /api/v1/pfp/mint
 *
 * Server-mediated mint: builds a Core Candy Machine mintV1 transaction,
 * partially signs it (fee payer), and returns base64 for client signing.
 */

import {
	defineEventHandler,
	getHeader,
	getRequestIP,
	readBody,
	setHeaders,
	setResponseStatus,
} from "h3";
import { getCurrentUserByToken } from "@/server/utils/auth-standalone";
import { buildPfpMintTransaction } from "@/server/utils/echoes/mint";

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
	let body: { walletAddress?: string };
	try {
		body = (await readBody(event)) as { walletAddress?: string };
	} catch {
		setResponseStatus(event, 400);
		return {
			success: false,
			error: { code: "VALIDATION_ERROR", message: "Invalid request body" },
			requestId,
		};
	}

	const walletAddress = body.walletAddress || authResult.user.walletAddress;
	if (!walletAddress) {
		setResponseStatus(event, 400);
		return {
			success: false,
			error: { code: "VALIDATION_ERROR", message: "walletAddress is required" },
			requestId,
		};
	}

	// Extract client IP for rate limiting
	const ip = getRequestIP(event, { xForwardedFor: true }) ?? null;

	try {
		const result = await buildPfpMintTransaction(
			authResult.user.id,
			walletAddress,
			ip,
		);

		console.log(`[pfp-mint][${requestId}] Mint tx built for user=${authResult.user.id} wallet=${walletAddress.slice(0, 8)}...`);

		setResponseStatus(event, 201);
		return {
			success: true,
			data: result,
			requestId,
		};
	} catch (error) {
		const msg = error instanceof Error ? error.message : "Unknown error";
		console.error(`[pfp-mint][${requestId}] Error:`, msg);

		const isRateLimit = msg.includes("Rate limit");
		const isSoldOut = msg.includes("sold out");
		const isClosed = msg.includes("closed");
		const isNotAllowlisted = msg.includes("not on the allowlist");

		setResponseStatus(event, isRateLimit ? 429 : 400);
		return {
			success: false,
			error: {
				code: isRateLimit ? "RATE_LIMITED" : isSoldOut ? "SOLD_OUT" : isClosed ? "MINT_CLOSED" : isNotAllowlisted ? "NOT_ALLOWLISTED" : "MINT_FAILED",
				message: msg,
			},
			requestId,
		};
	}
});
