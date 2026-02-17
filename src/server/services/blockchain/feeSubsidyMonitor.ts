/**
 * Fee Subsidy Monitor
 *
 * Tracks and logs fee subsidies for minting operations.
 * Provides observability into platform subsidized costs.
 *
 * Key metrics logged:
 * - type: 'collectible' | 'edition'
 * - feeCollected: Amount collected from user (0 for free collects)
 * - actualCost: Actual transaction cost in lamports
 * - subsidyAmount: Amount subsidized by platform
 *
 * The DISABLE_FEE_SUBSIDY env flag can be used as a circuit breaker
 * to stop subsidizing fees if costs are out of control.
 */

import { env } from "@/config/env";

// ============================================================================
// Types
// ============================================================================

export type MintType = "collectible" | "edition";

export interface FeeSubsidyEvent {
	type: MintType;
	/** Amount collected from user in lamports (0 for free collects) */
	feeCollected: bigint;
	/** Actual transaction cost in lamports */
	actualCost: bigint;
	/** Amount subsidized by platform in lamports */
	subsidyAmount: bigint;
	/** Optional transaction signature for tracing */
	txSignature?: string;
	/** Optional post ID for reference */
	postId?: string;
	/** Optional user ID for reference */
	userId?: string;
	/** Timestamp of the event */
	timestamp: Date;
}

export interface FeeSubsidyStats {
	/** Total subsidies logged */
	totalEvents: number;
	/** Total subsidy amount in lamports */
	totalSubsidyLamports: bigint;
	/** Breakdown by type */
	byType: {
		collectible: { count: number; subsidyLamports: bigint };
		edition: { count: number; subsidyLamports: bigint };
	};
	/** Session start time */
	sessionStart: Date;
	/** Last event time */
	lastEventAt: Date | null;
}

// ============================================================================
// In-Memory Stats (Singleton)
// ============================================================================

const stats: FeeSubsidyStats = {
	totalEvents: 0,
	totalSubsidyLamports: BigInt(0),
	byType: {
		collectible: { count: 0, subsidyLamports: BigInt(0) },
		edition: { count: 0, subsidyLamports: BigInt(0) },
	},
	sessionStart: new Date(),
	lastEventAt: null,
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Check if fee subsidy is currently enabled
 *
 * Returns false if DISABLE_FEE_SUBSIDY is set to true (circuit breaker engaged)
 */
export function isFeeSubsidyEnabled(): boolean {
	return !env.DISABLE_FEE_SUBSIDY;
}

/**
 * Log a fee subsidy event for observability
 *
 * This logs to console where Vercel/cloud providers capture it for analysis.
 * In production, these logs can be aggregated for daily reports.
 *
 * @param event - The fee subsidy event to log
 */
export function logFeeSubsidy(event: Omit<FeeSubsidyEvent, "timestamp">): void {
	const eventWithTimestamp: FeeSubsidyEvent = {
		...event,
		timestamp: new Date(),
	};

	// Update stats
	stats.totalEvents++;
	stats.totalSubsidyLamports += event.subsidyAmount;
	stats.byType[event.type].count++;
	stats.byType[event.type].subsidyLamports += event.subsidyAmount;
	stats.lastEventAt = eventWithTimestamp.timestamp;

	// Convert bigints to numbers for JSON logging
	const logData = {
		type: event.type,
		feeCollected: Number(event.feeCollected),
		feeCollectedSol: Number(event.feeCollected) / 1_000_000_000,
		actualCost: Number(event.actualCost),
		actualCostSol: Number(event.actualCost) / 1_000_000_000,
		subsidyAmount: Number(event.subsidyAmount),
		subsidyAmountSol: Number(event.subsidyAmount) / 1_000_000_000,
		...(event.txSignature && { txSignature: event.txSignature }),
		...(event.postId && { postId: event.postId }),
		...(event.userId && { userId: event.userId }),
		timestamp: eventWithTimestamp.timestamp.toISOString(),
	};

	// Log in structured format for log aggregation
	console.log("[Fee Subsidy]", JSON.stringify(logData));

	// Log human-readable summary
	if (event.subsidyAmount > BigInt(0)) {
		console.info(
			`[Fee Subsidy] ${event.type} mint: subsidized ${(Number(event.subsidyAmount) / 1_000_000_000).toFixed(6)} SOL`
		);
	}
}

/**
 * Get current session statistics
 *
 * Returns a copy of the current stats (not a reference)
 */
export function getFeeSubsidyStats(): FeeSubsidyStats {
	return {
		...stats,
		byType: {
			collectible: { ...stats.byType.collectible },
			edition: { ...stats.byType.edition },
		},
	};
}

/**
 * Reset statistics (mainly for testing)
 */
export function resetFeeSubsidyStats(): void {
	stats.totalEvents = 0;
	stats.totalSubsidyLamports = BigInt(0);
	stats.byType.collectible = { count: 0, subsidyLamports: BigInt(0) };
	stats.byType.edition = { count: 0, subsidyLamports: BigInt(0) };
	stats.sessionStart = new Date();
	stats.lastEventAt = null;
}

/**
 * Log a daily summary (call from a cron job or scheduled function)
 *
 * This aggregates the session stats into a daily summary log.
 */
export function logDailySummary(): void {
	const totalSubsidySol = Number(stats.totalSubsidyLamports) / 1_000_000_000;
	const collectibleSubsidySol = Number(stats.byType.collectible.subsidyLamports) / 1_000_000_000;
	const editionSubsidySol = Number(stats.byType.edition.subsidyLamports) / 1_000_000_000;

	const summary = {
		type: "daily_summary",
		sessionStart: stats.sessionStart.toISOString(),
		sessionEnd: new Date().toISOString(),
		totalEvents: stats.totalEvents,
		totalSubsidySol,
		collectibles: {
			count: stats.byType.collectible.count,
			subsidySol: collectibleSubsidySol,
		},
		editions: {
			count: stats.byType.edition.count,
			subsidySol: editionSubsidySol,
		},
		circuitBreakerEnabled: !isFeeSubsidyEnabled(),
	};

	console.log("[Fee Subsidy Daily Summary]", JSON.stringify(summary));

	// Log human-readable summary
	console.info(`[Fee Subsidy] Daily Summary:
  - Total mints: ${stats.totalEvents}
  - Total subsidy: ${totalSubsidySol.toFixed(4)} SOL
  - Collectibles: ${stats.byType.collectible.count} mints, ${collectibleSubsidySol.toFixed(4)} SOL subsidy
  - Editions: ${stats.byType.edition.count} mints, ${editionSubsidySol.toFixed(4)} SOL subsidy
  - Circuit breaker: ${!isFeeSubsidyEnabled() ? "ENGAGED" : "OFF"}`);
}

/**
 * Estimate transaction cost in lamports
 *
 * Provides a rough estimate for transaction fees.
 * Actual costs vary based on compute units used.
 *
 * @param type - The type of mint transaction
 * @returns Estimated cost in lamports
 */
export function estimateTransactionCost(type: MintType): bigint {
	// Base fee is typically ~5000 lamports for a standard transaction
	// Compressed NFT mints are more complex, estimate higher
	const estimates: Record<MintType, bigint> = {
		collectible: BigInt(10_000), // ~0.00001 SOL for cNFT mint
		edition: BigInt(20_000), // ~0.00002 SOL for edition mint (more complex)
	};

	return estimates[type];
}

/**
 * Check if subsidy should be applied and throw if circuit breaker is engaged
 *
 * Call this before performing a subsidized operation.
 *
 * @param type - The type of operation being subsidized
 * @throws Error if circuit breaker is engaged
 */
export function requireSubsidyEnabled(type: MintType): void {
	if (!isFeeSubsidyEnabled()) {
		throw new Error(
			`Fee subsidy is currently disabled (circuit breaker engaged). Cannot perform subsidized ${type} mint.`
		);
	}
}
