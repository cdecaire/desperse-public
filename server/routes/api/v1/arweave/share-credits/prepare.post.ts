/**
 * Prepare Share Credits
 * POST /api/v1/arweave/share-credits/prepare
 *
 * Builds an unsigned ANS-104 data item for sharing Turbo credits with Desperse.
 * Returns the deep hash for the client wallet to sign.
 *
 * Authentication: Required (Bearer token)
 *
 * Request:
 * {
 *   "wincAmount": "1000000000000"
 * }
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
	readBody,
	getHeader,
	setHeaders,
	setResponseStatus,
} from "h3";
import { authenticateWithToken } from "@/server/auth";
import { isArweaveStorageEnabled } from "@/config/env";
import { prepareShareCredits } from "@/server/services/arweave/credit-sharing";

export default defineEventHandler(async (event) => {
	const requestId = `req_${crypto.randomUUID().slice(0, 12)}`;

	setHeaders(event, {
		"X-Request-Id": requestId,
		"X-Api-Version": "1",
		"Cache-Control": "no-store",
	});

	// Feature flag
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

	// Parse body
	let body: Record<string, unknown>;
	try {
		body = (await readBody(event)) || {};
	} catch {
		setResponseStatus(event, 400);
		return {
			success: false,
			error: { code: "VALIDATION_ERROR", message: "Invalid request body" },
			requestId,
		};
	}

	const wincAmount = body.wincAmount as string | undefined;
	if (!wincAmount || typeof wincAmount !== "string" || !/^\d+$/.test(wincAmount)) {
		setResponseStatus(event, 400);
		return {
			success: false,
			error: { code: "VALIDATION_ERROR", message: "wincAmount must be a positive integer string" },
			requestId,
		};
	}

	// Prepare data item
	try {
		const result = await prepareShareCredits(walletAddress, userId, wincAmount);

		return {
			success: true,
			data: {
				sessionId: result.sessionToken,
				deepHashBase64: result.deepHashBase64,
			},
			requestId,
		};
	} catch (err) {
		console.error("[ArweaveSharePrepare] Failed:", err instanceof Error ? err.message : err);
		setResponseStatus(event, 500);
		return {
			success: false,
			error: { code: "INTERNAL_ERROR", message: "Failed to prepare credit sharing" },
			requestId,
		};
	}
});
