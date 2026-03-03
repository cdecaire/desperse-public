/**
 * Prepare Revoke Credits
 * POST /api/v1/arweave/revoke-credits/prepare
 *
 * Builds an unsigned ANS-104 data item for revoking shared Turbo credits.
 * Returns the deep hash for the client wallet to sign.
 *
 * Authentication: Required (Bearer token)
 *
 * Request: (empty body — wallet address from auth)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "sessionId": "encrypted-session-token...",
 *     "deepHashBase64": "base64-encoded-deep-hash-for-signing"
 *   }
 * }
 */

import {
	defineEventHandler,
	getHeader,
	setHeaders,
	setResponseStatus,
} from "h3";
import { authenticateWithToken } from "@/server/auth";
import { isArweaveStorageEnabled } from "@/config/env";
import { prepareRevokeCredits } from "@/server/services/arweave/credit-sharing";

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`;

	setHeaders(event, {
		"X-Request-Id": requestId,
		"X-Api-Version": "1",
		"Cache-Control": "no-store",
	});

	if (!isArweaveStorageEnabled()) {
		setResponseStatus(event, 404);
		return {
			success: false,
			error: { code: "FEATURE_DISABLED", message: "Arweave storage is not enabled" },
			requestId,
		};
	}

	// Auth
	const authHeader = getHeader(event, "authorization");
	const token = authHeader?.startsWith("Bearer ")
		? authHeader.slice(7)
		: authHeader;

	if (!token) {
		setResponseStatus(event, 401);
		return {
			success: false,
			error: { code: "AUTH_REQUIRED", message: "Authentication required" },
			requestId,
		};
	}

	let userId: string;
	let walletAddress: string | undefined;
	try {
		const auth = await authenticateWithToken(token);
		if (!auth?.userId) {
			setResponseStatus(event, 401);
			return {
				success: false,
				error: { code: "AUTH_REQUIRED", message: "Invalid or expired token" },
				requestId,
			};
		}
		userId = auth.userId;
		walletAddress = auth.walletAddress;
	} catch {
		setResponseStatus(event, 401);
		return {
			success: false,
			error: { code: "AUTH_REQUIRED", message: "Authentication failed" },
			requestId,
		};
	}

	if (!walletAddress) {
		setResponseStatus(event, 400);
		return {
			success: false,
			error: { code: "NO_WALLET", message: "No wallet address associated with account" },
			requestId,
		};
	}

	try {
		const result = await prepareRevokeCredits(walletAddress, userId);

		return {
			success: true,
			data: {
				sessionId: result.sessionToken,
				deepHashBase64: result.deepHashBase64,
			},
			requestId,
		};
	} catch (err) {
		console.error("[ArweaveRevokePrepare] Failed:", err instanceof Error ? err.message : err);
		setResponseStatus(event, 500);
		return {
			success: false,
			error: { code: "INTERNAL_ERROR", message: "Failed to prepare credit revocation" },
			requestId,
		};
	}
});
