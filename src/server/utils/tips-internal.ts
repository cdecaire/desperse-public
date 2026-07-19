/**
 * Tips internal logic (server-only)
 * Handles tip creation, confirmation, and stats.
 * This file should NEVER be imported from client code.
 */

import { db } from "@/server/db";
import { tips, users } from "@/server/db/schema";
import { eq, and, ne, isNull, sql } from "drizzle-orm";
import { buildTipTransaction, skrToRawAmount } from "./tip-transaction";
import type { TipTransactionResult } from "./tip-transaction";
import { getHeliusRpcUrl } from "@/config/env";

// Rate limit: 1 tip per sender per recipient per 24 hours
const TIP_RATE_LIMIT_HOURS = 24;

/**
 * Verify on-chain that `txSignature` actually delivered at least `expectedRawAmount`
 * of `tokenMint` to `recipientWallet`. This is what makes a tip trustworthy: without
 * it, a client could mark any tip "confirmed" with a fabricated or unrelated signature
 * and unlock DMs / inflate tip stats without paying.
 *
 * Returns:
 *  - 'confirmed' — tx landed, succeeded, and moved >= the expected amount to the recipient
 *  - 'failed'    — tx failed on-chain, or landed but did NOT pay the recipient correctly
 *  - 'pending'   — tx not visible yet (still propagating); caller should leave the tip
 *                  pending and reconcile later rather than crediting or rejecting it
 *
 * Uses @solana/web3.js getTransaction (full ledger + token-balance metadata) with a
 * short bounded retry, mirroring the proven confirmEditionPayment fallback pattern.
 */
async function verifyTipPayment(
	txSignature: string,
	recipientWallet: string,
	tokenMint: string,
	expectedRawAmount: bigint,
): Promise<{ status: "confirmed" | "failed" | "pending"; error?: string }> {
	const MAX_ATTEMPTS = 4;
	const RETRY_DELAY_MS = 3_000;
	try {
		const { Connection } = await import("@solana/web3.js");
		const connection = new Connection(getHeliusRpcUrl(), "confirmed");

		for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
			const tx = await connection.getTransaction(txSignature, {
				maxSupportedTransactionVersion: 0,
			});

			if (tx) {
				if (tx.meta?.err) {
					return {
						status: "failed",
						error: `Transaction failed on-chain: ${JSON.stringify(tx.meta.err)}`,
					};
				}

				// Confirm the recipient's token balance for this mint grew by >= the tip amount.
				const pre = tx.meta?.preTokenBalances ?? [];
				const post = tx.meta?.postTokenBalances ?? [];
				const postEntry = post.find(
					(b) => b.mint === tokenMint && b.owner === recipientWallet,
				);
				if (!postEntry) {
					return {
						status: "failed",
						error: "Transaction did not credit the recipient's token account",
					};
				}
				const preEntry = pre.find(
					(b) => b.accountIndex === postEntry.accountIndex,
				);
				const preAmt = BigInt(preEntry?.uiTokenAmount.amount ?? "0");
				const postAmt = BigInt(postEntry.uiTokenAmount.amount);
				const delta = postAmt - preAmt;

				if (delta >= expectedRawAmount) {
					return { status: "confirmed" };
				}
				return {
					status: "failed",
					error: `Transferred amount (${delta}) is less than the tip amount (${expectedRawAmount})`,
				};
			}

			// Not visible yet — wait and retry (skip the wait after the final attempt).
			if (attempt < MAX_ATTEMPTS) {
				await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
			}
		}

		// Still not visible after the bounded wait. Treat as pending so a legit-but-slow
		// tip is reconciled later rather than wrongly credited or rejected now.
		return { status: "pending" };
	} catch (err) {
		// RPC/network error — never fail-open to "confirmed"; leave it pending for retry.
		console.warn(
			"[verifyTipPayment] RPC error, returning pending:",
			err instanceof Error ? err.message : "Unknown",
		);
		return { status: "pending" };
	}
}

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

		// Cancel any existing *un-broadcast* pending tips from this sender to this
		// recipient. Only fail tips with no txSignature — a pending tip that already
		// has a signature was broadcast and may still be confirming on-chain, so it is
		// left for reconcileTipsFromTo() to finalize rather than wrongly marked failed.
		await db
			.update(tips)
			.set({ status: "failed" })
			.where(
				and(
					eq(tips.fromUserId, fromUserId),
					eq(tips.toUserId, input.toUserId),
					eq(tips.status, "pending"),
					isNull(tips.txSignature),
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
		// Get the pending tip (including the amount/mint/recipient we must verify against)
		const [tip] = await db
			.select({
				id: tips.id,
				fromUserId: tips.fromUserId,
				toUserId: tips.toUserId,
				amount: tips.amount,
				tokenMint: tips.tokenMint,
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

		// Signature reuse guard: a payment signature may back only ONE tip. Claim it as
		// soon as it is attached to ANY other tip (pending OR confirmed) — checking only
		// confirmed tips would let a client attach one real payment to a second tip while
		// the first is still pending-with-signature, double-crediting a single payment.
		// (A residual concurrent double-confirm is still theoretically possible without a
		// unique index on tx_signature — tracked as a follow-up hardening.)
		const [reused] = await db
			.select({ id: tips.id })
			.from(tips)
			.where(
				and(
					eq(tips.txSignature, input.txSignature),
					ne(tips.id, tip.id),
				),
			)
			.limit(1);
		if (reused) {
			return {
				success: false,
				error: "This transaction has already been used for another tip",
				status: "signature_reused",
			};
		}

		// Resolve the recipient's wallet the same way prepare did, so we can check the
		// on-chain transfer actually landed in their token account.
		const { getPrimaryWalletAddress } = await import("./wallet-compat");
		const [recipient] = await db
			.select({ walletAddress: users.walletAddress })
			.from(users)
			.where(eq(users.id, tip.toUserId))
			.limit(1);
		const recipientWallet =
			(await getPrimaryWalletAddress(tip.toUserId)) ||
			recipient?.walletAddress ||
			null;

		if (!recipientWallet) {
			return {
				success: false,
				error: "Recipient wallet unavailable",
				status: "no_wallet",
			};
		}

		// Verify the payment on-chain before crediting the tip.
		const verification = await verifyTipPayment(
			input.txSignature,
			recipientWallet,
			tip.tokenMint,
			tip.amount,
		);

		if (verification.status === "confirmed") {
			await db
				.update(tips)
				.set({
					txSignature: input.txSignature,
					status: "confirmed",
					confirmedAt: new Date(),
				})
				.where(eq(tips.id, input.tipId));
			return { success: true, status: "confirmed" };
		}

		if (verification.status === "failed") {
			await db
				.update(tips)
				.set({ txSignature: input.txSignature, status: "failed" })
				.where(eq(tips.id, input.tipId));
			return {
				success: false,
				error: verification.error ?? "Tip payment failed on-chain",
				status: "failed",
			};
		}

		// Pending: the tx isn't visible yet. Store the signature but keep the tip
		// pending; reconcileTipsFromTo() will finalize it on the next eligibility read.
		// The client shows success on broadcast regardless, so this is not a UX regression.
		await db
			.update(tips)
			.set({ txSignature: input.txSignature })
			.where(eq(tips.id, input.tipId));
		return { success: true, status: "pending" };
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
 * Reconcile any pending-but-broadcast tips for a sender→recipient pair.
 *
 * A tip is left `pending` with a stored `txSignature` when it was broadcast but not yet
 * visible on-chain at confirm time. This re-checks those (rare) tips on-chain and flips
 * them to `confirmed`/`failed`, so slow-to-propagate legit tips are not permanently lost
 * for eligibility/stats. Bounded: only touches pending rows that already have a signature.
 */
async function reconcileTipsFromTo(
	fromUserId: string,
	toUserId: string,
): Promise<void> {
	const pending = await db
		.select({
			id: tips.id,
			amount: tips.amount,
			tokenMint: tips.tokenMint,
			txSignature: tips.txSignature,
		})
		.from(tips)
		.where(
			and(
				eq(tips.fromUserId, fromUserId),
				eq(tips.toUserId, toUserId),
				eq(tips.status, "pending"),
				sql`${tips.txSignature} IS NOT NULL`,
			),
		);

	if (pending.length === 0) return;

	// Resolve recipient wallet once for the whole batch.
	const { getPrimaryWalletAddress } = await import("./wallet-compat");
	const [recipient] = await db
		.select({ walletAddress: users.walletAddress })
		.from(users)
		.where(eq(users.id, toUserId))
		.limit(1);
	const recipientWallet =
		(await getPrimaryWalletAddress(toUserId)) ||
		recipient?.walletAddress ||
		null;
	if (!recipientWallet) return;

	for (const tip of pending) {
		if (!tip.txSignature) continue;
		const verification = await verifyTipPayment(
			tip.txSignature,
			recipientWallet,
			tip.tokenMint,
			tip.amount,
		);
		if (verification.status === "confirmed") {
			await db
				.update(tips)
				.set({ status: "confirmed", confirmedAt: new Date() })
				.where(and(eq(tips.id, tip.id), eq(tips.status, "pending")));
		} else if (verification.status === "failed") {
			await db
				.update(tips)
				.set({ status: "failed" })
				.where(and(eq(tips.id, tip.id), eq(tips.status, "pending")));
		}
		// still pending → leave for a later reconcile
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
	// Finalize any broadcast-but-not-yet-confirmed tips before summing, so this gate
	// reflects real on-chain payments.
	await reconcileTipsFromTo(fromUserId, toUserId);

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
