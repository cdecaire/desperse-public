/**
 * Tips internal logic (server-only)
 * Handles tip creation, confirmation, and stats.
 * This file should NEVER be imported from client code.
 */

import { db } from "@/server/db";
import { tips, users } from "@/server/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { buildTipTransaction, skrToRawAmount } from "./tip-transaction";
import type { TipTransactionResult } from "./tip-transaction";

// Rate limit: 1 tip per sender per recipient per 24 hours
const TIP_RATE_LIMIT_HOURS = 24;

export interface PrepareTipInput {
	toUserId: string;
	amount: number; // Human-readable SKR amount (e.g. 5.0)
	context: "profile" | "message_unlock";
}

export interface PrepareTipResult {
	success: boolean;
	tipId?: string;
	transaction?: string; // base64 encoded
	blockhash?: string;
	lastValidBlockHeight?: number;
	error?: string;
	status?: string;
}

export interface ConfirmTipInput {
	tipId: string;
	txSignature: string;
}

export interface ConfirmTipResult {
	success: boolean;
	error?: string;
	status?: string;
}

export interface TipStatsResult {
	success: boolean;
	totalReceived?: number; // Human-readable SKR total
	tipCount?: number;
	error?: string;
}

/**
 * Prepare a tip transaction
 * Creates a pending tip record and builds the SPL transfer transaction
 */
export async function prepareTipInternal(
	fromUserId: string,
	fromWalletAddress: string,
	input: PrepareTipInput,
): Promise<PrepareTipResult> {
	try {
		// Prevent self-tipping
		if (fromUserId === input.toUserId) {
			return { success: false, error: "Cannot tip yourself", status: "self_tip" };
		}

		// Validate amount (minimum 0.01 SKR, maximum 10000 SKR)
		if (input.amount <= 0 || input.amount > 10000) {
			return {
				success: false,
				error: "Tip amount must be between 0.01 and 10,000 SKR",
				status: "invalid_amount",
			};
		}

		// Get recipient user
		const [recipient] = await db
			.select({
				id: users.id,
				walletAddress: users.walletAddress,
			})
			.from(users)
			.where(eq(users.id, input.toUserId))
			.limit(1);

		if (!recipient) {
			return { success: false, error: "Recipient not found", status: "not_found" };
		}

		// Resolve recipient's primary wallet from userWallets, fallback to legacy field
		const { getPrimaryWalletAddress } = await import("./wallet-compat");
		const recipientWallet =
			(await getPrimaryWalletAddress(recipient.id)) || recipient.walletAddress;

		if (!recipientWallet) {
			return {
				success: false,
				error: "Recipient does not have a wallet",
				status: "no_wallet",
			};
		}

		// Rate limit: check for recent tips from this sender to this recipient
		const recentTip = await db
			.select({ id: tips.id })
			.from(tips)
			.where(
				and(
					eq(tips.fromUserId, fromUserId),
					eq(tips.toUserId, input.toUserId),
					eq(tips.status, "confirmed"),
					sql`${tips.createdAt} > NOW() - INTERVAL '${sql.raw(String(TIP_RATE_LIMIT_HOURS))} hours'`,
				),
			)
			.limit(1);

		if (recentTip.length > 0) {
			return {
				success: false,
				error: `You can only tip this user once every ${TIP_RATE_LIMIT_HOURS} hours`,
				status: "rate_limited",
			};
		}

		// Cancel any existing pending tips from this sender to this recipient
		await db
			.update(tips)
			.set({ status: "failed" })
			.where(
				and(
					eq(tips.fromUserId, fromUserId),
					eq(tips.toUserId, input.toUserId),
					eq(tips.status, "pending"),
				),
			);

		// Convert to raw amount
		const rawAmount = skrToRawAmount(input.amount);

		// Build the transaction
		let txResult: TipTransactionResult;
		try {
			txResult = await buildTipTransaction({
				from: fromWalletAddress,
				to: recipientWallet,
				amount: rawAmount,
			});
		} catch (txError) {
			console.error(
				"[prepareTip] Transaction build failed:",
				txError instanceof Error ? txError.message : "Unknown error",
			);
			return {
				success: false,
				error: "Failed to build transaction. Please try again.",
				status: "tx_build_failed",
			};
		}

		// Create pending tip record
		const [tip] = await db
			.insert(tips)
			.values({
				fromUserId,
				toUserId: input.toUserId,
				amount: rawAmount,
				tokenMint: (await import("@/constants/tokens")).SKR_MINT,
				status: "pending",
				context: input.context,
			})
			.returning({ id: tips.id });

		return {
			success: true,
			tipId: tip.id,
			transaction: txResult.transactionBase64,
			blockhash: txResult.blockhash,
			lastValidBlockHeight: txResult.lastValidBlockHeight,
		};
	} catch (error) {
		console.error(
			"[prepareTip] Error:",
			error instanceof Error ? error.message : "Unknown error",
		);
		return {
			success: false,
			error: "Failed to prepare tip. Please try again.",
		};
	}
}

/**
 * Confirm a tip after the transaction has been signed and submitted
 */
export async function confirmTipInternal(
	fromUserId: string,
	input: ConfirmTipInput,
): Promise<ConfirmTipResult> {
	try {
		// Get the pending tip
		const [tip] = await db
			.select({
				id: tips.id,
				fromUserId: tips.fromUserId,
				status: tips.status,
			})
			.from(tips)
			.where(eq(tips.id, input.tipId))
			.limit(1);

		if (!tip) {
			return { success: false, error: "Tip not found", status: "not_found" };
		}

		// Verify ownership
		if (tip.fromUserId !== fromUserId) {
			return { success: false, error: "Unauthorized", status: "unauthorized" };
		}

		// Only pending tips can be confirmed
		if (tip.status !== "pending") {
			return {
				success: false,
				error: `Tip is already ${tip.status}`,
				status: "invalid_status",
			};
		}

		// Update tip with transaction signature and mark as confirmed
		await db
			.update(tips)
			.set({
				txSignature: input.txSignature,
				status: "confirmed",
				confirmedAt: new Date(),
			})
			.where(eq(tips.id, input.tipId));

		return { success: true, status: "confirmed" };
	} catch (error) {
		console.error(
			"[confirmTip] Error:",
			error instanceof Error ? error.message : "Unknown error",
		);
		return {
			success: false,
			error: "Failed to confirm tip. Please try again.",
		};
	}
}

/**
 * Get tip stats for a user (total received)
 */
export async function getTipStatsInternal(
	userId: string,
): Promise<TipStatsResult> {
	try {
		const [result] = await db
			.select({
				totalReceived: sql<string>`COALESCE(SUM(${tips.amount}), 0)`,
				tipCount: sql<number>`COUNT(*)::int`,
			})
			.from(tips)
			.where(and(eq(tips.toUserId, userId), eq(tips.status, "confirmed")));

		const totalRaw = BigInt(result?.totalReceived ?? "0");
		const { rawAmountToSkr } = await import("./tip-transaction");

		return {
			success: true,
			totalReceived: rawAmountToSkr(totalRaw),
			tipCount: result?.tipCount ?? 0,
		};
	} catch (error) {
		console.error(
			"[getTipStats] Error:",
			error instanceof Error ? error.message : "Unknown error",
		);
		return { success: false, error: "Failed to get tip stats" };
	}
}

/**
 * Get total confirmed tips from one user to another (for eligibility checks)
 * Returns the total in human-readable SKR
 */
export async function getTotalTipsFromTo(
	fromUserId: string,
	toUserId: string,
): Promise<number> {
	const [result] = await db
		.select({
			total: sql<string>`COALESCE(SUM(${tips.amount}), 0)`,
		})
		.from(tips)
		.where(
			and(
				eq(tips.fromUserId, fromUserId),
				eq(tips.toUserId, toUserId),
				eq(tips.status, "confirmed"),
			),
		);

	const totalRaw = BigInt(result?.total ?? "0");
	const { rawAmountToSkr } = await import("./tip-transaction");
	return rawAmountToSkr(totalRaw);
}
