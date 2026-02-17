/**
 * RPC Fallback Provider
 *
 * Provides resilient RPC connectivity with automatic fallback to a secondary endpoint
 * when the primary Helius RPC fails.
 *
 * Failure conditions:
 * - Network error / timeout (configurable, default 10s)
 * - HTTP 429 (rate limited)
 * - HTTP 5xx errors
 * - Invalid/malformed response
 *
 * Policy:
 * - Read operations: Retry 2x with backoff, then switch to fallback
 * - Write operations: Never auto-retry (risk of double-send). Check status first.
 * - All fallback switches are logged for observability
 */

import { createSolanaRpc } from "@solana/kit";
import { getHeliusRpcUrl, getEnvVar } from "@/config/env";
import { retryWithBackoff, isRetryableError } from "@/lib/retryUtils";

// ============================================================================
// Configuration
// ============================================================================

/** Default timeout for RPC requests (10 seconds) */
const DEFAULT_RPC_TIMEOUT_MS = 10_000;

/** Maximum retries before switching to fallback */
const MAX_RETRIES_BEFORE_FALLBACK = 2;

/** Get RPC timeout from env or use default */
function getRpcTimeoutMs(): number {
	const envTimeout = getEnvVar("RPC_TIMEOUT_MS", "");
	if (envTimeout) {
		const parsed = parseInt(envTimeout, 10);
		if (!isNaN(parsed) && parsed > 0) {
			return parsed;
		}
	}
	return DEFAULT_RPC_TIMEOUT_MS;
}

/** Get fallback RPC URL from env */
function getFallbackRpcUrl(): string | null {
	const url = getEnvVar("FALLBACK_RPC_URL", "");
	return url || null;
}

// ============================================================================
// Types
// ============================================================================

export type RpcEndpoint = "primary" | "fallback";

export interface RpcProviderConfig {
	/** Primary RPC URL (defaults to Helius) */
	primaryUrl?: string;
	/** Fallback RPC URL */
	fallbackUrl?: string | null;
	/** Request timeout in milliseconds */
	timeoutMs?: number;
	/** Maximum retries before fallback */
	maxRetries?: number;
}

export interface RpcCallResult<T> {
	/** The result data */
	data: T;
	/** Which endpoint was used */
	endpoint: RpcEndpoint;
	/** Number of retries before success */
	retries: number;
}

export interface RpcProviderStats {
	/** Total calls made */
	totalCalls: number;
	/** Calls that used primary endpoint */
	primaryCalls: number;
	/** Calls that fell back to secondary */
	fallbackCalls: number;
	/** Total failures (exhausted all retries) */
	failures: number;
	/** Timestamp of last fallback switch */
	lastFallbackAt: Date | null;
	/** Reason for last fallback */
	lastFallbackReason: string | null;
}

// ============================================================================
// RPC Provider Implementation
// ============================================================================

/**
 * Singleton stats tracking for observability
 */
const stats: RpcProviderStats = {
	totalCalls: 0,
	primaryCalls: 0,
	fallbackCalls: 0,
	failures: 0,
	lastFallbackAt: null,
	lastFallbackReason: null,
};

/** Get current RPC provider stats */
export function getRpcProviderStats(): RpcProviderStats {
	return { ...stats };
}

/** Reset stats (for testing) */
export function resetRpcProviderStats(): void {
	stats.totalCalls = 0;
	stats.primaryCalls = 0;
	stats.fallbackCalls = 0;
	stats.failures = 0;
	stats.lastFallbackAt = null;
	stats.lastFallbackReason = null;
}

/**
 * Log a fallback event for observability
 */
function logFallbackSwitch(reason: string, error?: unknown): void {
	stats.lastFallbackAt = new Date();
	stats.lastFallbackReason = reason;
	stats.fallbackCalls++;

	const errorMessage = error instanceof Error ? error.message : String(error);
	console.warn(`[RPC Provider] Switching to fallback RPC: ${reason}`, {
		error: errorMessage,
		timestamp: stats.lastFallbackAt.toISOString(),
	});
}

/**
 * Create an RPC client for a specific URL
 */
function createRpcClientForUrl(url: string) {
	return createSolanaRpc(url);
}

/**
 * Check if an error indicates we should try the fallback
 */
function shouldTryFallback(error: unknown): boolean {
	// All retryable errors should trigger fallback after exhausting retries
	if (isRetryableError(error)) {
		return true;
	}

	// Also check for specific RPC errors
	if (error instanceof Error) {
		const message = error.message.toLowerCase();
		return (
			message.includes("timeout") ||
			message.includes("aborted") ||
			message.includes("rate limit") ||
			message.includes("429") ||
			message.includes("503") ||
			message.includes("502") ||
			message.includes("504") ||
			message.includes("500")
		);
	}

	return false;
}

/**
 * Execute a read operation with retry and fallback support
 *
 * @param operation - The async operation to execute
 * @param operationName - Name for logging purposes
 * @param config - Optional configuration overrides
 * @returns The result with metadata about which endpoint was used
 */
export async function executeWithFallback<T>(
	operation: (rpc: ReturnType<typeof createSolanaRpc>) => Promise<T>,
	operationName: string,
	config: RpcProviderConfig = {}
): Promise<RpcCallResult<T>> {
	const {
		primaryUrl = getHeliusRpcUrl(),
		fallbackUrl = getFallbackRpcUrl(),
		maxRetries = MAX_RETRIES_BEFORE_FALLBACK,
	} = config;

	stats.totalCalls++;

	// Try primary endpoint with retries
	const primaryRpc = createRpcClientForUrl(primaryUrl);

	try {
		const data = await retryWithBackoff(() => operation(primaryRpc), {
			maxRetries,
			baseDelayMs: 500, // Start with 500ms delay
		});

		stats.primaryCalls++;
		return {
			data,
			endpoint: "primary",
			retries: 0, // Success on primary
		};
	} catch (primaryError) {
		// Primary failed, check if we should try fallback
		if (!fallbackUrl) {
			console.error(`[RPC Provider] ${operationName} failed on primary, no fallback configured:`, primaryError);
			stats.failures++;
			throw primaryError;
		}

		if (!shouldTryFallback(primaryError)) {
			// Non-retryable error (e.g., invalid input), don't try fallback
			console.error(`[RPC Provider] ${operationName} failed with non-retryable error:`, primaryError);
			stats.failures++;
			throw primaryError;
		}

		// Log the fallback switch
		const reason = primaryError instanceof Error ? primaryError.message : "Unknown error";
		logFallbackSwitch(`${operationName}: ${reason}`, primaryError);

		// Try fallback endpoint
		const fallbackRpc = createRpcClientForUrl(fallbackUrl);

		try {
			const data = await retryWithBackoff(() => operation(fallbackRpc), {
				maxRetries: 1, // Only 1 retry on fallback
				baseDelayMs: 500,
			});

			return {
				data,
				endpoint: "fallback",
				retries: maxRetries + 1, // All primary retries + fallback
			};
		} catch (fallbackError) {
			console.error(`[RPC Provider] ${operationName} failed on both primary and fallback:`, {
				primary: primaryError,
				fallback: fallbackError,
			});
			stats.failures++;
			throw fallbackError;
		}
	}
}

/**
 * Execute a write operation (no automatic retry to prevent double-sends)
 *
 * CRITICAL: Write operations like sendTransaction should NOT be automatically retried
 * because this could result in double-spending. Instead, the caller should:
 * 1. Check transaction status if a signature exists
 * 2. Manually decide whether to retry based on the status
 *
 * @param operation - The async operation to execute
 * @param operationName - Name for logging purposes
 * @param config - Optional configuration overrides
 * @returns The result without automatic retries
 */
export async function executeWriteOperation<T>(
	operation: (rpc: ReturnType<typeof createSolanaRpc>) => Promise<T>,
	operationName: string,
	config: Omit<RpcProviderConfig, "maxRetries"> = {}
): Promise<RpcCallResult<T>> {
	const { primaryUrl = getHeliusRpcUrl(), fallbackUrl = getFallbackRpcUrl() } = config;

	stats.totalCalls++;

	// Try primary endpoint (no retries for write operations!)
	const primaryRpc = createRpcClientForUrl(primaryUrl);

	try {
		const data = await operation(primaryRpc);

		stats.primaryCalls++;
		return {
			data,
			endpoint: "primary",
			retries: 0,
		};
	} catch (primaryError) {
		// For write operations, we're more conservative about fallback
		// Only try fallback for clear infrastructure issues, not transaction errors
		if (!fallbackUrl) {
			console.error(`[RPC Provider] Write operation ${operationName} failed, no fallback:`, primaryError);
			stats.failures++;
			throw primaryError;
		}

		// Only fallback for infrastructure errors, not transaction errors
		const shouldFallback =
			primaryError instanceof Error &&
			(primaryError.message.includes("ECONNREFUSED") ||
				primaryError.message.includes("ENOTFOUND") ||
				primaryError.message.includes("503") ||
				primaryError.message.includes("502") ||
				primaryError.message.includes("504") ||
				primaryError.message.includes("429"));

		if (!shouldFallback) {
			console.error(`[RPC Provider] Write operation ${operationName} failed (not retrying):`, primaryError);
			stats.failures++;
			throw primaryError;
		}

		// Log the fallback switch
		const reason = primaryError.message;
		logFallbackSwitch(`Write ${operationName}: ${reason}`, primaryError);

		// Try fallback endpoint (single attempt only)
		const fallbackRpc = createRpcClientForUrl(fallbackUrl);

		try {
			const data = await operation(fallbackRpc);

			return {
				data,
				endpoint: "fallback",
				retries: 1,
			};
		} catch (fallbackError) {
			console.error(`[RPC Provider] Write ${operationName} failed on both endpoints:`, {
				primary: primaryError,
				fallback: fallbackError,
			});
			stats.failures++;
			throw fallbackError;
		}
	}
}

/**
 * Get an RPC client with fallback support built in
 *
 * This creates a proxy that automatically handles fallback for common operations.
 * For more control, use executeWithFallback or executeWriteOperation directly.
 */
export function getResilientRpcClient(config: RpcProviderConfig = {}) {
	const primaryUrl = config.primaryUrl || getHeliusRpcUrl();
	const fallbackUrl = config.fallbackUrl ?? getFallbackRpcUrl();
	const timeoutMs = config.timeoutMs || getRpcTimeoutMs();

	// Return an object with helper methods for common operations
	return {
		/** Get balance with automatic fallback */
		async getBalance(address: string): Promise<{ value: bigint; endpoint: RpcEndpoint }> {
			const result = await executeWithFallback(
				(rpc) =>
					rpc
						.getBalance(address as unknown as Parameters<ReturnType<typeof createSolanaRpc>["getBalance"]>[0])
						.send(),
				"getBalance"
			);
			return { value: result.data.value, endpoint: result.endpoint };
		},

		/** Get signature statuses with automatic fallback */
		async getSignatureStatuses(
			signatures: string[]
		): Promise<{ value: Array<unknown>; endpoint: RpcEndpoint }> {
			const result = await executeWithFallback(
				(rpc) =>
					rpc
						.getSignatureStatuses(
							signatures as unknown as Parameters<
								ReturnType<typeof createSolanaRpc>["getSignatureStatuses"]
							>[0]
						)
						.send(),
				"getSignatureStatuses"
			);
			return { value: result.data.value, endpoint: result.endpoint };
		},

		/** Get current slot with automatic fallback */
		async getSlot(): Promise<{ slot: bigint; endpoint: RpcEndpoint }> {
			const result = await executeWithFallback((rpc) => rpc.getSlot().send(), "getSlot");
			return { slot: result.data, endpoint: result.endpoint };
		},

		/** Configuration info */
		config: {
			primaryUrl,
			fallbackUrl,
			timeoutMs,
			hasFallback: !!fallbackUrl,
		},

		/** Get current stats */
		getStats: getRpcProviderStats,
	};
}
