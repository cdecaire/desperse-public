/**
 * Solana Devnet JSON-RPC Proxy (Echoes)
 * POST /api/v1/echoes-rpc
 *
 * Isolated devnet proxy for Echoes PFP minting.
 * Same structure as rpc.post.ts but routes to devnet Helius.
 * The mainnet proxy at /api/v1/rpc is completely untouched.
 */

import {
	defineEventHandler,
	readBody,
	getRequestIP,
	createError,
} from "h3";
import { getEchoesHeliusRpcUrl } from "@/config/echoes-env";

const ALLOWED_METHODS = new Set([
	"getBalance",
	"getAccountInfo",
	"getMultipleAccounts",
	"getTokenAccountsByOwner",
	"getTokenSupply",
	"getLatestBlockhash",
	"isBlockhashValid",
	"sendTransaction",
	"simulateTransaction",
	"getSignatureStatuses",
	"getTransaction",
	"getFeeForMessage",
	"getRecentPrioritizationFees",
	"getMinimumBalanceForRentExemption",
	"getSlot",
	"getBlockHeight",
	"getEpochInfo",
	"getHealth",
	"getVersion",
]);

// Separate rate limiter from mainnet proxy
const RATE_LIMIT = 300;
const RATE_WINDOW_MS = 60_000;

const ipBuckets = new Map<string, number[]>();

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

	while (timestamps.length > 0 && timestamps[0] <= cutoff) {
		timestamps.shift();
	}

	if (timestamps.length >= RATE_LIMIT) {
		return true;
	}

	timestamps.push(now);
	return false;
}

const MAX_BODY_BYTES = 256 * 1024;
const UPSTREAM_TIMEOUT_MS = 15_000;

export default defineEventHandler(async (event) => {
	const ip = getRequestIP(event, { xForwardedFor: true }) ?? "unknown";

	if (isRateLimited(ip)) {
		console.warn(`[echoes-rpc-proxy] Rate limited IP=${ip}`);
		throw createError({ statusCode: 429, statusMessage: "Too many requests" });
	}

	let body: unknown;
	try {
		body = await readBody(event);
	} catch {
		throw createError({ statusCode: 400, statusMessage: "Invalid JSON body" });
	}

	const rawSize = JSON.stringify(body).length;
	if (rawSize > MAX_BODY_BYTES) {
		throw createError({
			statusCode: 413,
			statusMessage: "Request body too large",
		});
	}

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

	if (!ALLOWED_METHODS.has(method)) {
		throw createError({
			statusCode: 403,
			statusMessage: `Method not allowed: ${method}`,
		});
	}

	// Forward to Helius devnet (NOT mainnet)
	const rpcUrl = getEchoesHeliusRpcUrl();
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
		console.log(`[echoes-rpc-proxy] ${method} ${upstream.status} ${elapsed}ms ip=${ip}`);

		const data = await upstream.json();
		return data;
	} catch (err: unknown) {
		const elapsed = Date.now() - start;
		const msg = err instanceof Error ? err.message : "Unknown error";
		console.error(`[echoes-rpc-proxy] ${method} FAILED ${elapsed}ms ip=${ip}: ${msg}`);

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
