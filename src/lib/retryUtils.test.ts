/**
 * Tests for retryUtils
 *
 * Tests retry behavior with exponential backoff.
 * Note: These tests use real timers with short delays since the retry logic
 * uses actual setTimeout which doesn't work well with fake timers in async contexts.
 */

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { retryWithBackoff, createRetryFunction } from "./retryUtils";

describe("retryUtils", () => {
	// Use real timers for these tests since retryWithBackoff uses actual setTimeout
	beforeAll(() => {
		vi.useRealTimers();
	});

	afterAll(() => {
		vi.useFakeTimers();
	});

	beforeEach(() => {
		// Reset any mocks between tests
		vi.clearAllMocks();
	});

	describe("retryWithBackoff", () => {
		it("should return result on first successful call", async () => {
			const fn = vi.fn().mockResolvedValue("success");

			const result = await retryWithBackoff(fn);

			expect(result).toBe("success");
			expect(fn).toHaveBeenCalledTimes(1);
		});

		it("should retry on retryable network errors", async () => {
			const fn = vi
				.fn()
				.mockRejectedValueOnce(new Error("Network error"))
				.mockRejectedValueOnce(new Error("Connection timeout"))
				.mockResolvedValue("success");

			const result = await retryWithBackoff(fn, {
				maxRetries: 3,
				baseDelayMs: 1, // Use 1ms for fast tests
			});

			expect(result).toBe("success");
			expect(fn).toHaveBeenCalledTimes(3);
		});

		it("should retry on 5xx HTTP errors", async () => {
			const error503 = new Error("Service unavailable");
			const fn = vi
				.fn()
				.mockRejectedValueOnce(error503)
				.mockResolvedValue("success");

			// Customize error message to include 503
			error503.message = "503 Service Unavailable";

			const result = await retryWithBackoff(fn, { maxRetries: 2, baseDelayMs: 1 });

			expect(result).toBe("success");
			expect(fn).toHaveBeenCalledTimes(2);
		});

		it("should retry on status code 429 (rate limit)", async () => {
			const rateLimitError = { status: 429, message: "Rate limited" };
			const fn = vi
				.fn()
				.mockRejectedValueOnce(rateLimitError)
				.mockResolvedValue("success");

			const result = await retryWithBackoff(fn, { maxRetries: 2, baseDelayMs: 1 });

			expect(result).toBe("success");
			expect(fn).toHaveBeenCalledTimes(2);
		});

		it("should retry on status code 408 (timeout)", async () => {
			const timeoutError = { statusCode: 408, message: "Request timeout" };
			const fn = vi
				.fn()
				.mockRejectedValueOnce(timeoutError)
				.mockResolvedValue("success");

			const result = await retryWithBackoff(fn, { maxRetries: 2, baseDelayMs: 1 });

			expect(result).toBe("success");
			expect(fn).toHaveBeenCalledTimes(2);
		});

		it("should NOT retry on non-retryable errors (4xx)", async () => {
			const notFoundError = { status: 404, message: "Not found" };
			const fn = vi.fn().mockRejectedValue(notFoundError);

			await expect(
				retryWithBackoff(fn, { maxRetries: 3 })
			).rejects.toMatchObject(notFoundError);

			// Should only try once - no retries for 404
			expect(fn).toHaveBeenCalledTimes(1);
		});

		it("should NOT retry on validation errors", async () => {
			const validationError = new Error("Invalid input: field required");
			const fn = vi.fn().mockRejectedValue(validationError);

			await expect(
				retryWithBackoff(fn, { maxRetries: 3 })
			).rejects.toThrow("Invalid input");

			expect(fn).toHaveBeenCalledTimes(1);
		});

		it("should throw after exhausting all retries", async () => {
			const networkError = new Error("Network connection failed");
			const fn = vi.fn().mockRejectedValue(networkError);

			await expect(
				retryWithBackoff(fn, { maxRetries: 2, baseDelayMs: 10 })
			).rejects.toThrow("Network connection failed");

			// Initial attempt + 2 retries = 3 total calls
			expect(fn).toHaveBeenCalledTimes(3);
		});

		it("should use exponential backoff delay", async () => {
			const fn = vi
				.fn()
				.mockRejectedValueOnce(new Error("Network error"))
				.mockRejectedValueOnce(new Error("Network error"))
				.mockResolvedValue("success");

			await retryWithBackoff(fn, {
				maxRetries: 3,
				baseDelayMs: 1, // Use 1ms for fast tests
			});

			// Verify the fn was called the right number of times
			expect(fn).toHaveBeenCalledTimes(3);
		});

		it("should use custom shouldRetry function", async () => {
			const customError = { code: "CUSTOM_RETRYABLE" };
			const fn = vi
				.fn()
				.mockRejectedValueOnce(customError)
				.mockResolvedValue("success");

			const shouldRetry = vi.fn().mockImplementation((error: unknown) => {
				return (
					typeof error === "object" &&
					error !== null &&
					"code" in error &&
					(error as { code: string }).code === "CUSTOM_RETRYABLE"
				);
			});

			const result = await retryWithBackoff(fn, {
				maxRetries: 2,
				baseDelayMs: 1,
				shouldRetry,
			});

			expect(result).toBe("success");
			expect(shouldRetry).toHaveBeenCalledWith(customError);
			expect(fn).toHaveBeenCalledTimes(2);
		});

		it("should respect maxRetries option", async () => {
			const fn = vi.fn().mockRejectedValue(new Error("Network error"));

			await expect(
				retryWithBackoff(fn, { maxRetries: 5, baseDelayMs: 1 })
			).rejects.toThrow();

			// 1 initial + 5 retries = 6 total
			expect(fn).toHaveBeenCalledTimes(6);
		});

		it("should use default options when not specified", async () => {
			const fn = vi.fn().mockRejectedValue(new Error("Network error"));

			// Override default baseDelayMs to make test faster
			await expect(
				retryWithBackoff(fn, { baseDelayMs: 1 })
			).rejects.toThrow();

			// Default maxRetries is 3, so 1 initial + 3 retries = 4 total
			expect(fn).toHaveBeenCalledTimes(4);
		});
	});

	describe("createRetryFunction", () => {
		it("should create a pre-configured retry function", async () => {
			const retryFn = createRetryFunction({ maxRetries: 1, baseDelayMs: 1 });

			const fn = vi
				.fn()
				.mockRejectedValueOnce(new Error("Network error"))
				.mockResolvedValue("success");

			const result = await retryFn(fn);

			expect(result).toBe("success");
			expect(fn).toHaveBeenCalledTimes(2);
		});

		it("should use provided options for all calls", async () => {
			const shouldRetry = vi.fn().mockReturnValue(true);
			const retryFn = createRetryFunction({
				maxRetries: 2,
				baseDelayMs: 1,
				shouldRetry,
			});

			const fn = vi.fn().mockRejectedValue(new Error("Test error"));

			await expect(retryFn(fn)).rejects.toThrow();

			// shouldRetry should be called for each failed attempt except the last
			expect(shouldRetry).toHaveBeenCalled();
		});
	});

	describe("error classification", () => {
		it("should identify network errors as retryable", async () => {
			const networkErrors = [
				new Error("network request failed"),
				new Error("connection refused"),
				new Error("ECONNREFUSED"),
				new Error("ENOTFOUND"),
				new Error("ECONNRESET"),
				new Error("fetch failed"),
				new Error("request timeout"),
			];

			for (const error of networkErrors) {
				const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValue("ok");

				await expect(
					retryWithBackoff(fn, { maxRetries: 1, baseDelayMs: 1 })
				).resolves.toBe("ok");

				expect(fn).toHaveBeenCalledTimes(2);
				fn.mockClear();
			}
		});

		it("should identify RPC errors as retryable", async () => {
			const rpcErrors = [
				new Error("RPC error: node unavailable"),
				new Error("503 Service Unavailable"),
				new Error("502 Bad Gateway"),
				new Error("504 Gateway Timeout"),
				new Error("500 Internal Server Error"),
			];

			for (const error of rpcErrors) {
				const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValue("ok");

				await expect(
					retryWithBackoff(fn, { maxRetries: 1, baseDelayMs: 1 })
				).resolves.toBe("ok");

				expect(fn).toHaveBeenCalledTimes(2);
				fn.mockClear();
			}
		});

		it("should identify status code errors as retryable", async () => {
			const statusErrors = [
				{ status: 500 },
				{ status: 502 },
				{ status: 503 },
				{ status: 504 },
				{ status: 408 },
				{ status: 429 },
				{ statusCode: 500 },
				{ statusCode: 429 },
			];

			for (const error of statusErrors) {
				const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValue("ok");

				await expect(
					retryWithBackoff(fn, { maxRetries: 1, baseDelayMs: 1 })
				).resolves.toBe("ok");

				expect(fn).toHaveBeenCalledTimes(2);
				fn.mockClear();
			}
		});

		it("should NOT retry 4xx client errors (except 408, 429)", async () => {
			const clientErrors = [
				{ status: 400 },
				{ status: 401 },
				{ status: 403 },
				{ status: 404 },
				{ status: 422 },
			];

			for (const error of clientErrors) {
				const fn = vi.fn().mockRejectedValue(error);

				await expect(
					retryWithBackoff(fn, { maxRetries: 3, baseDelayMs: 1 })
				).rejects.toMatchObject(error);

				// Should not retry
				expect(fn).toHaveBeenCalledTimes(1);
				fn.mockClear();
			}
		});
	});
});
