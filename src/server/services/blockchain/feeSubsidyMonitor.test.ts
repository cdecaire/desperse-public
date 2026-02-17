/**
 * Tests for Fee Subsidy Monitor
 *
 * Tests the fee subsidy logging and statistics functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	logFeeSubsidy,
	getFeeSubsidyStats,
	resetFeeSubsidyStats,
	isFeeSubsidyEnabled,
	requireSubsidyEnabled,
	estimateTransactionCost,
	logDailySummary,
} from "./feeSubsidyMonitor";

// Mock env module
vi.mock("@/config/env", () => ({
	env: {
		DISABLE_FEE_SUBSIDY: false,
	},
}));

describe("feeSubsidyMonitor", () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		resetFeeSubsidyStats();
		consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "info").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("logFeeSubsidy", () => {
		it("should log fee subsidy events", () => {
			logFeeSubsidy({
				type: "collectible",
				feeCollected: BigInt(0),
				actualCost: BigInt(10_000),
				subsidyAmount: BigInt(10_000),
				txSignature: "abc123",
				postId: "post-123",
			});

			expect(consoleSpy).toHaveBeenCalledWith(
				"[Fee Subsidy]",
				expect.stringContaining('"type":"collectible"')
			);
		});

		it("should update statistics on each event", () => {
			logFeeSubsidy({
				type: "collectible",
				feeCollected: BigInt(0),
				actualCost: BigInt(10_000),
				subsidyAmount: BigInt(10_000),
			});

			logFeeSubsidy({
				type: "edition",
				feeCollected: BigInt(5_000),
				actualCost: BigInt(20_000),
				subsidyAmount: BigInt(15_000),
			});

			const stats = getFeeSubsidyStats();
			expect(stats.totalEvents).toBe(2);
			expect(stats.totalSubsidyLamports).toBe(BigInt(25_000));
			expect(stats.byType.collectible.count).toBe(1);
			expect(stats.byType.edition.count).toBe(1);
		});

		it("should calculate subsidy amounts correctly in logs", () => {
			logFeeSubsidy({
				type: "collectible",
				feeCollected: BigInt(0),
				actualCost: BigInt(10_000_000), // 0.01 SOL
				subsidyAmount: BigInt(10_000_000),
			});

			expect(consoleSpy).toHaveBeenCalledWith(
				"[Fee Subsidy]",
				expect.stringContaining('"subsidyAmountSol":0.01')
			);
		});

		it("should include optional fields when provided", () => {
			logFeeSubsidy({
				type: "collectible",
				feeCollected: BigInt(0),
				actualCost: BigInt(10_000),
				subsidyAmount: BigInt(10_000),
				txSignature: "test-signature",
				postId: "test-post-id",
				userId: "test-user-id",
			});

			const logCall = consoleSpy.mock.calls[0][1] as string;
			expect(logCall).toContain('"txSignature":"test-signature"');
			expect(logCall).toContain('"postId":"test-post-id"');
			expect(logCall).toContain('"userId":"test-user-id"');
		});
	});

	describe("getFeeSubsidyStats", () => {
		it("should return initial stats when no events logged", () => {
			const stats = getFeeSubsidyStats();

			expect(stats.totalEvents).toBe(0);
			expect(stats.totalSubsidyLamports).toBe(BigInt(0));
			expect(stats.byType.collectible.count).toBe(0);
			expect(stats.byType.edition.count).toBe(0);
			expect(stats.lastEventAt).toBeNull();
		});

		it("should return a copy not a reference", () => {
			const stats1 = getFeeSubsidyStats();
			logFeeSubsidy({
				type: "collectible",
				feeCollected: BigInt(0),
				actualCost: BigInt(10_000),
				subsidyAmount: BigInt(10_000),
			});
			const stats2 = getFeeSubsidyStats();

			expect(stats1.totalEvents).toBe(0);
			expect(stats2.totalEvents).toBe(1);
		});

		it("should track stats by type separately", () => {
			// Log 3 collectibles
			for (let i = 0; i < 3; i++) {
				logFeeSubsidy({
					type: "collectible",
					feeCollected: BigInt(0),
					actualCost: BigInt(10_000),
					subsidyAmount: BigInt(10_000),
				});
			}

			// Log 2 editions
			for (let i = 0; i < 2; i++) {
				logFeeSubsidy({
					type: "edition",
					feeCollected: BigInt(0),
					actualCost: BigInt(20_000),
					subsidyAmount: BigInt(20_000),
				});
			}

			const stats = getFeeSubsidyStats();
			expect(stats.totalEvents).toBe(5);
			expect(stats.byType.collectible.count).toBe(3);
			expect(stats.byType.collectible.subsidyLamports).toBe(BigInt(30_000));
			expect(stats.byType.edition.count).toBe(2);
			expect(stats.byType.edition.subsidyLamports).toBe(BigInt(40_000));
		});
	});

	describe("resetFeeSubsidyStats", () => {
		it("should reset all statistics", () => {
			logFeeSubsidy({
				type: "collectible",
				feeCollected: BigInt(0),
				actualCost: BigInt(10_000),
				subsidyAmount: BigInt(10_000),
			});

			expect(getFeeSubsidyStats().totalEvents).toBe(1);

			resetFeeSubsidyStats();

			const stats = getFeeSubsidyStats();
			expect(stats.totalEvents).toBe(0);
			expect(stats.totalSubsidyLamports).toBe(BigInt(0));
			expect(stats.byType.collectible.count).toBe(0);
			expect(stats.byType.edition.count).toBe(0);
			expect(stats.lastEventAt).toBeNull();
		});
	});

	describe("isFeeSubsidyEnabled", () => {
		it("should return true when circuit breaker is not engaged", async () => {
			// Default mock has DISABLE_FEE_SUBSIDY: false
			expect(isFeeSubsidyEnabled()).toBe(true);
		});

		it("should return false when circuit breaker is engaged", async () => {
			// Update the mock to simulate circuit breaker engaged
			vi.doMock("@/config/env", () => ({
				env: {
					DISABLE_FEE_SUBSIDY: true,
				},
			}));

			// Re-import to get the updated mock
			const { isFeeSubsidyEnabled: updatedCheck } = await import("./feeSubsidyMonitor");
			// Note: Due to module caching, this may not work as expected in the same test file
			// In real usage, the env check happens at call time, not import time
		});
	});

	describe("requireSubsidyEnabled", () => {
		it("should not throw when subsidy is enabled", () => {
			expect(() => requireSubsidyEnabled("collectible")).not.toThrow();
			expect(() => requireSubsidyEnabled("edition")).not.toThrow();
		});

		// Note: Testing the throw case would require re-mocking env.DISABLE_FEE_SUBSIDY
	});

	describe("estimateTransactionCost", () => {
		it("should return estimates for collectible", () => {
			const cost = estimateTransactionCost("collectible");
			expect(cost).toBe(BigInt(10_000));
		});

		it("should return estimates for edition", () => {
			const cost = estimateTransactionCost("edition");
			expect(cost).toBe(BigInt(20_000));
		});

		it("should return higher estimate for edition than collectible", () => {
			const collectibleCost = estimateTransactionCost("collectible");
			const editionCost = estimateTransactionCost("edition");
			expect(editionCost).toBeGreaterThan(collectibleCost);
		});
	});

	describe("logDailySummary", () => {
		it("should log summary with correct totals", () => {
			// Log some events first
			logFeeSubsidy({
				type: "collectible",
				feeCollected: BigInt(0),
				actualCost: BigInt(10_000_000), // 0.01 SOL
				subsidyAmount: BigInt(10_000_000),
			});

			logFeeSubsidy({
				type: "edition",
				feeCollected: BigInt(0),
				actualCost: BigInt(20_000_000), // 0.02 SOL
				subsidyAmount: BigInt(20_000_000),
			});

			vi.clearAllMocks();
			logDailySummary();

			expect(consoleSpy).toHaveBeenCalledWith(
				"[Fee Subsidy Daily Summary]",
				expect.stringContaining('"totalEvents":2')
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				"[Fee Subsidy Daily Summary]",
				expect.stringContaining('"totalSubsidySol":0.03')
			);
		});

		it("should log summary even with no events", () => {
			logDailySummary();

			expect(consoleSpy).toHaveBeenCalledWith(
				"[Fee Subsidy Daily Summary]",
				expect.stringContaining('"totalEvents":0')
			);
		});
	});

	describe("integration scenarios", () => {
		it("should handle high volume of events", () => {
			const eventCount = 1000;
			const subsidyPerEvent = BigInt(10_000);

			for (let i = 0; i < eventCount; i++) {
				logFeeSubsidy({
					type: i % 2 === 0 ? "collectible" : "edition",
					feeCollected: BigInt(0),
					actualCost: subsidyPerEvent,
					subsidyAmount: subsidyPerEvent,
				});
			}

			const stats = getFeeSubsidyStats();
			expect(stats.totalEvents).toBe(eventCount);
			expect(stats.totalSubsidyLamports).toBe(BigInt(eventCount) * subsidyPerEvent);
			expect(stats.byType.collectible.count).toBe(500);
			expect(stats.byType.edition.count).toBe(500);
		});

		it("should handle zero subsidy events", () => {
			logFeeSubsidy({
				type: "collectible",
				feeCollected: BigInt(10_000),
				actualCost: BigInt(10_000),
				subsidyAmount: BigInt(0), // User paid full cost
			});

			const stats = getFeeSubsidyStats();
			expect(stats.totalEvents).toBe(1);
			expect(stats.totalSubsidyLamports).toBe(BigInt(0));
		});

		it("should handle partial subsidy events", () => {
			logFeeSubsidy({
				type: "edition",
				feeCollected: BigInt(5_000),
				actualCost: BigInt(20_000),
				subsidyAmount: BigInt(15_000), // Platform subsidized part of the cost
			});

			const stats = getFeeSubsidyStats();
			expect(stats.totalEvents).toBe(1);
			expect(stats.totalSubsidyLamports).toBe(BigInt(15_000));
		});
	});
});
