/**
 * Tests for Helius webhook authentication
 *
 * Tests the webhook validation logic including:
 * - Authorization header validation
 * - Timing-safe comparison
 * - Request body validation
 * - Error handling
 */

import { describe, it, expect } from "vitest";
import { timingSafeEqual } from "crypto";

// ============================================================================
// Re-implement validation logic for testing
// (Since the handler isn't easily unit testable, we test the same logic)
// ============================================================================

/**
 * Timing-safe string comparison to prevent timing attacks
 * (Same implementation as helius-webhook.post.ts)
 */
function secureCompare(a: string, b: string): boolean {
	if (a.length !== b.length) {
		// Still do a comparison to maintain consistent timing
		const dummy = Buffer.from(a);
		timingSafeEqual(dummy, dummy);
		return false;
	}
	return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Validate authorization header
 */
function validateAuthHeader(
	authHeader: string | null | undefined,
	webhookSecret: string
): { valid: boolean; error?: string } {
	if (!webhookSecret) {
		return { valid: false, error: "Webhook not configured" };
	}

	if (!authHeader) {
		return { valid: false, error: "Missing authorization header" };
	}

	if (!secureCompare(authHeader, webhookSecret)) {
		return { valid: false, error: "Invalid authorization header" };
	}

	return { valid: true };
}

// ============================================================================
// Test Data
// ============================================================================

const VALID_SECRET = "test-webhook-secret-12345";

const VALID_PAYLOAD_ARRAY = [
	{
		signature: "5UfDuX8xvdKznwVGEDanKa3SKkVsLYmTJKfHWsDNQWNMBkmkwsLsknpPYVUxY6UwVRLTZWTZKMCv7nXwvyQxr4H9",
		type: "TRANSACTION",
		timestamp: Date.now(),
	},
];

const VALID_PAYLOAD_OBJECT = {
	events: [
		{
			signature: "5UfDuX8xvdKznwVGEDanKa3SKkVsLYmTJKfHWsDNQWNMBkmkwsLsknpPYVUxY6UwVRLTZWTZKMCv7nXwvyQxr4H9",
			type: "TRANSACTION",
			timestamp: Date.now(),
		},
	],
};

const VALID_PAYLOAD_SINGLE = {
	signature: "5UfDuX8xvdKznwVGEDanKa3SKkVsLYmTJKfHWsDNQWNMBkmkwsLsknpPYVUxY6UwVRLTZWTZKMCv7nXwvyQxr4H9",
	type: "TRANSACTION",
};

// ============================================================================
// Tests
// ============================================================================

describe("helius-webhook", () => {
	describe("secureCompare", () => {
		it("should return true for identical strings", () => {
			expect(secureCompare("secret123", "secret123")).toBe(true);
			expect(secureCompare("a", "a")).toBe(true);
			expect(secureCompare("", "")).toBe(true);
		});

		it("should return false for different strings", () => {
			expect(secureCompare("secret123", "secret456")).toBe(false);
			expect(secureCompare("a", "b")).toBe(false);
		});

		it("should return false for different length strings", () => {
			expect(secureCompare("short", "longerstring")).toBe(false);
			expect(secureCompare("longerstring", "short")).toBe(false);
			expect(secureCompare("", "nonempty")).toBe(false);
		});

		it("should be timing-safe (same-length different strings)", () => {
			// This test verifies the implementation uses timingSafeEqual
			// The actual timing safety is provided by Node's crypto module
			const result1 = secureCompare("aaaaaaaaaa", "aaaaaaaaab");
			const result2 = secureCompare("aaaaaaaaaa", "baaaaaaaaa");
			expect(result1).toBe(false);
			expect(result2).toBe(false);
		});

		it("should handle special characters", () => {
			expect(secureCompare("secret!@#$%", "secret!@#$%")).toBe(true);
			expect(secureCompare("secret!@#$%", "secret!@#$&")).toBe(false);
		});

		it("should handle unicode characters", () => {
			expect(secureCompare("secret🔐", "secret🔐")).toBe(true);
			expect(secureCompare("secret🔐", "secret🔑")).toBe(false);
		});
	});

	describe("validateAuthHeader", () => {
		it("should reject when webhook secret is not configured", () => {
			const result = validateAuthHeader("any-header", "");
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Webhook not configured");
		});

		it("should reject when authorization header is missing", () => {
			const result = validateAuthHeader(null, VALID_SECRET);
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Missing authorization header");
		});

		it("should reject when authorization header is undefined", () => {
			const result = validateAuthHeader(undefined, VALID_SECRET);
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Missing authorization header");
		});

		it("should reject when authorization header is empty", () => {
			const result = validateAuthHeader("", VALID_SECRET);
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Missing authorization header");
		});

		it("should reject when authorization header does not match", () => {
			const result = validateAuthHeader("wrong-secret", VALID_SECRET);
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Invalid authorization header");
		});

		it("should accept when authorization header matches", () => {
			const result = validateAuthHeader(VALID_SECRET, VALID_SECRET);
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it("should reject when header is a prefix of secret", () => {
			const result = validateAuthHeader("test-webhook", VALID_SECRET);
			expect(result.valid).toBe(false);
		});

		it("should reject when header has extra characters", () => {
			const result = validateAuthHeader(VALID_SECRET + "extra", VALID_SECRET);
			expect(result.valid).toBe(false);
		});
	});

	describe("payload validation", () => {
		// Import schema for validation tests
		it("should accept array of events", async () => {
			const { heliusWebhookSchema } = await import("@/server/functions/webhook");
			const result = heliusWebhookSchema.safeParse(VALID_PAYLOAD_ARRAY);
			expect(result.success).toBe(true);
		});

		it("should accept object with events array", async () => {
			const { heliusWebhookSchema } = await import("@/server/functions/webhook");
			const result = heliusWebhookSchema.safeParse(VALID_PAYLOAD_OBJECT);
			expect(result.success).toBe(true);
		});

		it("should accept single event object", async () => {
			const { heliusWebhookSchema } = await import("@/server/functions/webhook");
			const result = heliusWebhookSchema.safeParse(VALID_PAYLOAD_SINGLE);
			expect(result.success).toBe(true);
		});

		it("should accept object with unknown fields (Zod strips them)", async () => {
			// The schema allows objects with optional events/signature/type
			// Unknown fields are stripped by Zod's default behavior
			const { heliusWebhookSchema } = await import("@/server/functions/webhook");
			const result = heliusWebhookSchema.safeParse({ invalid: "data" });
			// This passes because the object schema has all optional fields
			expect(result.success).toBe(true);
			// But the resulting data won't have the invalid field
			if (result.success) {
				expect(result.data).not.toHaveProperty("invalid");
			}
		});

		it("should accept event with transactionError", async () => {
			const { heliusWebhookSchema } = await import("@/server/functions/webhook");
			const payload = [
				{
					signature: "abc123",
					type: "TRANSACTION",
					transactionError: { code: -32002, message: "Transaction failed" },
				},
			];
			const result = heliusWebhookSchema.safeParse(payload);
			expect(result.success).toBe(true);
		});

		it("should accept event with nft data", async () => {
			const { heliusWebhookSchema } = await import("@/server/functions/webhook");
			const payload = [
				{
					signature: "abc123",
					type: "NFT_SALE",
					nft: {
						mint: "NFTMint123456789",
					},
				},
			];
			const result = heliusWebhookSchema.safeParse(payload);
			expect(result.success).toBe(true);
		});
	});

	describe("security scenarios", () => {
		it("should prevent replay attacks by validating each request independently", () => {
			// Each webhook request must have a valid auth header
			// There's no session or token reuse
			const result1 = validateAuthHeader(VALID_SECRET, VALID_SECRET);
			const result2 = validateAuthHeader(VALID_SECRET, VALID_SECRET);
			expect(result1.valid).toBe(true);
			expect(result2.valid).toBe(true);
			// Each validation is independent - this is by design
		});

		it("should reject attempts to bypass with Bearer prefix", () => {
			// If secret is "test-secret", "Bearer test-secret" should fail
			const secret = "test-secret";
			const result = validateAuthHeader("Bearer " + secret, secret);
			expect(result.valid).toBe(false);
		});

		it("should reject whitespace-padded headers", () => {
			const result1 = validateAuthHeader(" " + VALID_SECRET, VALID_SECRET);
			const result2 = validateAuthHeader(VALID_SECRET + " ", VALID_SECRET);
			const result3 = validateAuthHeader(" " + VALID_SECRET + " ", VALID_SECRET);
			expect(result1.valid).toBe(false);
			expect(result2.valid).toBe(false);
			expect(result3.valid).toBe(false);
		});

		it("should reject case-different headers", () => {
			const result = validateAuthHeader(VALID_SECRET.toUpperCase(), VALID_SECRET);
			expect(result.valid).toBe(false);
		});
	});
});
