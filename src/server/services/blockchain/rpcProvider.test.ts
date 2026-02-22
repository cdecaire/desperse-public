/**
 * Tests for RPC Fallback Provider
 *
 * Tests the resilient RPC connectivity with automatic fallback.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	executeWithFallback,
	executeWriteOperation,
	getRpcProviderStats,
	resetRpcProviderStats,
} from "./rpcProvider";

// Mock the @solana/kit module
vi.mock("@solana/kit", () => ({
	createSolanaRpc: vi.fn((url: string) => ({
		_url: url,
		getBalance: vi.fn(),
		getSignatureStatuses: vi.fn(),
		getSlot: vi.fn(),
	})),
}));

// Mock env to avoid requiring actual env vars
vi.mock("@/config/env", () => ({
	getHeliusRpcUrl: vi.fn(() => "https://primary-rpc.example.com"),
	getEnvVar: vi.fn((key: string, defaultValue?: string) => {
		if (key === "FALLBACK_RPC_URL") return "https://fallback-rpc.example.com";
		if (key === "RPC_TIMEOUT_MS") return "10000";
		return defaultValue || "";
	}),
}));

// Mock retryUtils
vi.mock("@/lib/retryUtils", () => ({
	retryWithBackoff: vi.fn(async (fn: () => Promise<unknown>) => {
		return fn();
	}),
	isRetryableError: vi.fn((error: unknown) => {
		if (error instanceof Error) {
			const msg = error.message.toLowerCase();
			return (
				msg.includes("network") ||
				msg.includes("timeout") ||
				msg.includes("429") ||
				msg.includes("503") ||
				msg.includes("502") ||
				msg.includes("504") ||
				msg.includes("500")
			);
		}
		return false;
	}),
}));

describe("rpcProvider", () => {
	beforeEach(() => {
		resetRpcProviderStats();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("executeWithFallback", () => {
		it("should return result from primary on success", async () => {
			const mockData = { value: BigInt(1000000000) };
			const operation = vi.fn().mockResolvedValue(mockData);

			const result = await executeWithFallback(operation, "testOperation");

			expect(result.data).toBe(mockData);
			expect(result.endpoint).toBe("primary");
			expect(operation).toHaveBeenCalledTimes(1);
		});

		it("should track stats on success", async () => {
			const operation = vi.fn().mockResolvedValue({ value: 100 });

			await executeWithFallback(operation, "testOperation");

			const stats = getRpcProviderStats();
			expect(stats.totalCalls).toBe(1);
			expect(stats.primaryCalls).toBe(1);
			expect(stats.fallbackCalls).toBe(0);
			expect(stats.failures).toBe(0);
		});

		it("should fall back on network error", async () => {
			const { retryWithBackoff } = await import("@/lib/retryUtils");
			const mockRetry = vi.mocked(retryWithBackoff);

			// First call (primary) throws, second call (fallback) succeeds
			let callCount = 0;
			mockRetry.mockImplementation(async (fn: () => Promise<unknown>) => {
				callCount++;
				if (callCount === 1) {
					throw new Error("503 Service Unavailable");
				}
				return fn();
			});

			const mockData = { value: 200 };
			const operation = vi.fn().mockResolvedValue(mockData);

			const result = await executeWithFallback(operation, "testOperation");

			expect(result.endpoint).toBe("fallback");
			expect(result.data).toBe(mockData);
		});

		it("should log fallback switch", async () => {
			const { retryWithBackoff } = await import("@/lib/retryUtils");
			const mockRetry = vi.mocked(retryWithBackoff);
			const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

			let callCount = 0;
			mockRetry.mockImplementation(async (fn: () => Promise<unknown>) => {
				callCount++;
				if (callCount === 1) {
					throw new Error("503 Service Unavailable");
				}
				return fn();
			});

			const operation = vi.fn().mockResolvedValue({ value: 100 });

			await executeWithFallback(operation, "getBalance");

			expect(consoleWarn).toHaveBeenCalledWith(
				expect.stringContaining("[RPC Provider] Switching to fallback RPC"),
				expect.objectContaining({
					error: expect.stringContaining("503"),
				})
			);

			consoleWarn.mockRestore();
		});

		it("should update stats on fallback", async () => {
			const { retryWithBackoff } = await import("@/lib/retryUtils");
			const mockRetry = vi.mocked(retryWithBackoff);

			let callCount = 0;
			mockRetry.mockImplementation(async (fn: () => Promise<unknown>) => {
				callCount++;
				if (callCount === 1) {
					throw new Error("503 Service Unavailable");
				}
				return fn();
			});

			const operation = vi.fn().mockResolvedValue({ value: 100 });

			await executeWithFallback(operation, "testOperation");

			const stats = getRpcProviderStats();
			expect(stats.fallbackCalls).toBe(1);
			expect(stats.lastFallbackAt).not.toBeNull();
			expect(stats.lastFallbackReason).toContain("503");
		});

		it("should throw if both primary and fallback fail", async () => {
			const { retryWithBackoff } = await import("@/lib/retryUtils");
			const mockRetry = vi.mocked(retryWithBackoff);

			mockRetry.mockImplementation(async () => {
				throw new Error("503 Service Unavailable");
			});

			const operation = vi.fn();
			const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

			await expect(executeWithFallback(operation, "testOperation")).rejects.toThrow("503");

			const stats = getRpcProviderStats();
			expect(stats.failures).toBe(1);

			consoleError.mockRestore();
		});

		it("should not try fallback for non-retryable errors", async () => {
			const { retryWithBackoff, isRetryableError } = await import("@/lib/retryUtils");
			const mockRetry = vi.mocked(retryWithBackoff);
			const mockIsRetryable = vi.mocked(isRetryableError);

			mockIsRetryable.mockReturnValue(false);
			mockRetry.mockImplementation(async () => {
				throw new Error("Invalid account address");
			});

			const operation = vi.fn();
			const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

			await expect(executeWithFallback(operation, "testOperation")).rejects.toThrow(
				"Invalid account address"
			);

			// Should only have 1 call (no fallback attempt)
			expect(mockRetry).toHaveBeenCalledTimes(1);

			consoleError.mockRestore();
		});
	});

	describe("executeWriteOperation", () => {
		it("should not retry write operations automatically", async () => {
			const mockData = { signature: "abc123" };
			const operation = vi.fn().mockResolvedValue(mockData);

			const result = await executeWriteOperation(operation, "sendTransaction");

			expect(result.data).toBe(mockData);
			expect(result.endpoint).toBe("primary");
			expect(result.retries).toBe(0);
		});

		it("should only fallback on infrastructure errors for writes", async () => {
			const operation = vi.fn();
			const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

			// Transaction error (should not fallback)
			operation.mockRejectedValueOnce(new Error("Transaction simulation failed"));

			await expect(executeWriteOperation(operation, "sendTransaction")).rejects.toThrow(
				"Transaction simulation failed"
			);

			expect(operation).toHaveBeenCalledTimes(1); // No fallback attempt

			consoleError.mockRestore();
		});

		it("should fallback on infrastructure error for writes", async () => {
			const operation = vi.fn();
			const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

			// First call: infrastructure error
			operation.mockRejectedValueOnce(new Error("503 Service Unavailable"));
			// Second call (fallback): success
			operation.mockResolvedValueOnce({ signature: "xyz789" });

			const result = await executeWriteOperation(operation, "sendTransaction");

			expect(result.endpoint).toBe("fallback");
			expect(result.retries).toBe(1);
			expect(operation).toHaveBeenCalledTimes(2);

			consoleWarn.mockRestore();
		});
	});

	describe("getRpcProviderStats", () => {
		it("should return accurate statistics", async () => {
			const operation = vi.fn().mockResolvedValue({ value: 100 });

			// Make several successful calls
			await executeWithFallback(operation, "op1");
			await executeWithFallback(operation, "op2");
			await executeWithFallback(operation, "op3");

			const stats = getRpcProviderStats();
			expect(stats.totalCalls).toBe(3);
			expect(stats.primaryCalls).toBe(3);
			expect(stats.fallbackCalls).toBe(0);
			expect(stats.failures).toBe(0);
		});

		it("should return a copy of stats (not reference)", async () => {
			const stats1 = getRpcProviderStats();
			const operation = vi.fn().mockResolvedValue({ value: 100 });
			await executeWithFallback(operation, "op1");
			const stats2 = getRpcProviderStats();

			expect(stats1.totalCalls).toBe(0);
			expect(stats2.totalCalls).toBe(1);
		});
	});

	describe("resetRpcProviderStats", () => {
		it("should reset all statistics", async () => {
			const operation = vi.fn().mockResolvedValue({ value: 100 });
			await executeWithFallback(operation, "op1");

			expect(getRpcProviderStats().totalCalls).toBe(1);

			resetRpcProviderStats();

			const stats = getRpcProviderStats();
			expect(stats.totalCalls).toBe(0);
			expect(stats.primaryCalls).toBe(0);
			expect(stats.fallbackCalls).toBe(0);
			expect(stats.failures).toBe(0);
			expect(stats.lastFallbackAt).toBeNull();
			expect(stats.lastFallbackReason).toBeNull();
		});
	});

	describe("fallback conditions", () => {
		const testCases = [
			{ error: "Network error", shouldFallback: true },
			{ error: "timeout exceeded", shouldFallback: true },
			{ error: "429 Too Many Requests", shouldFallback: true },
			{ error: "503 Service Unavailable", shouldFallback: true },
			{ error: "502 Bad Gateway", shouldFallback: true },
			{ error: "504 Gateway Timeout", shouldFallback: true },
			{ error: "500 Internal Server Error", shouldFallback: true },
			{ error: "ECONNREFUSED", shouldFallback: true },
			{ error: "Invalid account", shouldFallback: false },
			{ error: "Account not found", shouldFallback: false },
		];

		for (const { error, shouldFallback } of testCases) {
			it(`should ${shouldFallback ? "" : "NOT "}fall back on "${error}"`, async () => {
				const { retryWithBackoff, isRetryableError } = await import("@/lib/retryUtils");
				const mockRetry = vi.mocked(retryWithBackoff);
				const mockIsRetryable = vi.mocked(isRetryableError);

				// Reset mock to default implementation for this test
				mockIsRetryable.mockImplementation((err: unknown) => {
					if (err instanceof Error) {
						const msg = err.message.toLowerCase();
						return (
							msg.includes("network") ||
							msg.includes("timeout") ||
							msg.includes("429") ||
							msg.includes("503") ||
							msg.includes("502") ||
							msg.includes("504") ||
							msg.includes("500") ||
							msg.includes("econnrefused")
						);
					}
					return false;
				});

				let callCount = 0;
				mockRetry.mockImplementation(async (fn: () => Promise<unknown>) => {
					callCount++;
					if (callCount === 1) {
						throw new Error(error);
					}
					return fn();
				});

				const operation = vi.fn().mockResolvedValue({ value: 100 });
				const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
				const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

				if (shouldFallback) {
					const result = await executeWithFallback(operation, "testOp");
					expect(result.endpoint).toBe("fallback");
				} else {
					await expect(executeWithFallback(operation, "testOp")).rejects.toThrow(error);
					expect(mockRetry).toHaveBeenCalledTimes(1); // No fallback
				}

				consoleError.mockRestore();
				consoleWarn.mockRestore();
			});
		}
	});
});
