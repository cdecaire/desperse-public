/**
 * Submit Revoke Credits
 * POST /api/v1/arweave/revoke-credits/submit
 *
 * Receives the wallet's Ed25519 signature, assembles the signed ANS-104
 * data item, and uploads it to Turbo to revoke the credit approval.
 *
 * Authentication: Required (Bearer token)
 *
 * Request:
 * {
 *   "sessionId": "encrypted-session-token...",
 *   "signatureBase64": "base64-encoded-ed25519-signature"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "success": true
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
import { submitSignedRevokeCredits } from "@/server/services/arweave/credit-sharing";

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
	} catch {
		setResponseStatus(event, 401);
		return {
			success: false,
			error: { code: "AUTH_REQUIRED", message: "Authentication failed" },
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

	const sessionId = body.sessionId as string | undefined;
	const signatureBase64 = body.signatureBase64 as string | undefined;

	if (!sessionId || typeof sessionId !== "string") {
		setResponseStatus(event, 400);
		return {
			success: false,
			error: { code: "VALIDATION_ERROR", message: "sessionId is required" },
			requestId,
		};
	}

	if (!signatureBase64 || typeof signatureBase64 !== "string") {
		setResponseStatus(event, 400);
		return {
			success: false,
			error: { code: "VALIDATION_ERROR", message: "signatureBase64 is required" },
			requestId,
		};
	}

	try {
		const result = await submitSignedRevokeCredits(sessionId, signatureBase64, userId);

		return {
			success: true,
			data: {
				success: result.success,
			},
			requestId,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		console.error("[ArweaveRevokeSubmit] Failed:", message);

		const isClientError = message.includes("Session") || message.includes("Invalid") || message.includes("expired");
		setResponseStatus(event, isClientError ? 400 : 500);

		return {
			success: false,
			error: {
				code: isClientError ? "VALIDATION_ERROR" : "INTERNAL_ERROR",
				message: isClientError ? message : "Failed to submit credit revocation",
			},
			requestId,
		};
	}
});
