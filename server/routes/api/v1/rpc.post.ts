/**
 * Solana JSON-RPC Proxy
 * POST /api/v1/rpc
 *
 * Forwards JSON-RPC requests to Helius so the API key never leaves the server.
 * - Validates JSON-RPC 2.0 envelope
 * - Explicit method allowlist (only methods we actually use)
 * - Rate limiting: 300 req/min per IP
 * - Max body size: 256 KB
 * - 15s upstream timeout
 */

import {
	defineEventHandler,
	readBody,
	getRequestIP,
	createError,
} from "h3";
import { getHeliusRpcUrl } from "@/config/env";

// ---------------------------------------------------------------------------
// Method allowlist — only the Solana JSON-RPC methods our app actually calls
// ---------------------------------------------------------------------------
const ALLOWED_METHODS = new Set([
	// Account / token
	"getBalance",
	"getAccountInfo",
	"getMultipleAccounts",
	"getTokenAccountsByOwner",
	"getTokenSupply",
	// Blockhash
	"getLatestBlockhash",
	"isBlockhashValid",
	// Transactions
	"sendTransaction",
	"simulateTransaction",
	"getSignatureStatuses",
	"getTransaction",
	// Fees
	"getFeeForMessage",
	"getRecentPrioritizationFees",
	"getMinimumBalanceForRentExemption",
	// Cluster
	"getSlot",
	"getBlockHeight",
	"getEpochInfo",
	"getHealth",
	"getVersion",
]);

// ---------------------------------------------------------------------------
// Simple in-memory sliding-window rate limiter (per-IP, 300 req / 60s)
// ---------------------------------------------------------------------------
const RATE_LIMIT = 300;
const RATE_WINDOW_MS = 60_000;

const ipBuckets = new Map<string, number[]>();

// Periodically clean stale entries so the map doesn't grow unbounded
setInterval(() => {
	const cutoff = Date.now() - RATE_WINDOW_MS;
	for (const [ip, timestamps] of ipBuckets) {
		const fresh = timestamps.filter((t) => t > cutoff);
		if (fresh.length === 0) {
			ipBuckets.delete(ip);
		} else {
			ipBuckets.set(ip, fresh);
		}
	}
}, RATE_WINDOW_MS);

function isRateLimited(ip: string): boolean {
	const now = Date.now();
	const cutoff = now - RATE_WINDOW_MS;
	let timestamps = ipBuckets.get(ip);

	if (!timestamps) {
		timestamps = [];
		ipBuckets.set(ip, timestamps);
	}

	// Prune old entries
	while (timestamps.length > 0 && timestamps[0] <= cutoff) {
		timestamps.shift();
	}

	if (timestamps.length >= RATE_LIMIT) {
		return true;
	}

	timestamps.push(now);
	return false;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_BODY_BYTES = 256 * 1024; // 256 KB
const UPSTREAM_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export default defineEventHandler(async (event) => {
	const ip = getRequestIP(event, { xForwardedFor: true }) ?? "unknown";

	// Rate limit
	if (isRateLimited(ip)) {
		console.warn(`[rpc-proxy] Rate limited IP=${ip}`);
		throw createError({ statusCode: 429, statusMessage: "Too many requests" });
	}

	// Read body (h3 parses JSON automatically)
	let body: unknown;
	try {
		body = await readBody(event);
	} catch {
		throw createError({ statusCode: 400, statusMessage: "Invalid JSON body" });
	}

	// Rough size check (re-serialize because h3 already parsed)
	const rawSize = JSON.stringify(body).length;
	if (rawSize > MAX_BODY_BYTES) {
		throw createError({
			statusCode: 413,
			statusMessage: "Request body too large",
		});
	}

	// Validate JSON-RPC 2.0 shape
	if (
		!body ||
		typeof body !== "object" ||
		Array.isArray(body) ||
		(body as any).jsonrpc !== "2.0" ||
		typeof (body as any).method !== "string" ||
		(body as any).id === undefined
	) {
		throw createError({
			statusCode: 400,
			statusMessage: "Invalid JSON-RPC 2.0 request",
		});
	}

	const method = (body as any).method as string;

	// Method allowlist
	if (!ALLOWED_METHODS.has(method)) {
		throw createError({
			statusCode: 403,
			statusMessage: `Method not allowed: ${method}`,
		});
	}

	// Forward to Helius
	const rpcUrl = getHeliusRpcUrl();
	const start = Date.now();

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

		const upstream = await fetch(rpcUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
			signal: controller.signal,
		});

		clearTimeout(timeout);

		const elapsed = Date.now() - start;
		console.log(`[rpc-proxy] ${method} ${upstream.status} ${elapsed}ms ip=${ip}`);

		// Return raw JSON-RPC response (no envelope wrapper)
		const data = await upstream.json();
		return data;
	} catch (err: unknown) {
		const elapsed = Date.now() - start;
		const msg = err instanceof Error ? err.message : "Unknown error";
		console.error(`[rpc-proxy] ${method} FAILED ${elapsed}ms ip=${ip}: ${msg}`);

		if (msg.includes("abort")) {
			throw createError({
				statusCode: 504,
				statusMessage: "Upstream RPC timeout",
			});
		}

		throw createError({
			statusCode: 502,
			statusMessage: "Upstream RPC error",
		});
	}
});
