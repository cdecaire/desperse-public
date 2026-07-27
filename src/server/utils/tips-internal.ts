/**
 * Tips internal logic (server-only).
 * Handles tip creation, confirmation, and stats.
 */

import { randomUUID } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { and, eq, isNull, sql } from "drizzle-orm";
import { SKR_MINT } from "@/constants/tokens";
import { db } from "@/server/db";
import { tips, users } from "@/server/db/schema";
import { getPrivyClient } from "@/server/auth";
import {
	buildTipTransaction,
	rawAmountToSkr,
	SKR_DECIMALS,
	skrToRawAmount,
} from "./tip-transaction";
import type { TipTransactionResult } from "./tip-transaction";
import {
	validateTransactionSignature,
	verifyTipTransaction,
} from "./tip-payment-verifier";

const TIP_RATE_LIMIT_HOURS = 24;
const VERIFICATION_VERSION = 1;

export interface PrepareTipInput {
	toUserId: string;
	amount: number;
	context: "profile" | "message_unlock";
}

export interface PrepareTipResult {
	success: boolean;
	tipId?: string;
	transaction?: string;
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
	totalReceived?: number;
	tipCount?: number;
	error?: string;
}

type PrivyWalletAccount = {
	type?: string;
	chainType?: string;
	address?: string;
	walletClientType?: string;
};

function canonicalAddress(address: string): string | null {
	try {
		return new PublicKey(address).toBase58();
	} catch {
		return null;
	}
}

async function getVerifiedSolanaWallets(privyId: string): Promise<PrivyWalletAccount[]> {
	if (privyId.startsWith("siws:")) {
		const address = canonicalAddress(privyId.slice("siws:".length));
		return address ? [{ type: "wallet", chainType: "solana", address }] : [];
	}

	const privyUser = await getPrivyClient().getUserById(privyId);
	return (privyUser.linkedAccounts as PrivyWalletAccount[]).filter(
		(account) =>
			account.type === "wallet" &&
			account.chainType === "solana" &&
			Boolean(account.address && canonicalAddress(account.address)),
	);
}

function ownsWallet(accounts: PrivyWalletAccount[], requested: string): boolean {
	return accounts.some(
		(account) =>
			account.address && canonicalAddress(account.address) === requested,
	);
}

function isUniqueSignatureError(error: unknown): boolean {
	const candidate = error as { code?: string; cause?: { code?: string } };
	return candidate.code === "23505" || candidate.cause?.code === "23505";
}

export async function prepareTipInternal(
	fromUserId: string,
	fromPrivyId: string,
	requestedWalletAddress: string,
	input: PrepareTipInput,
): Promise<PrepareTipResult> {
	try {
		if (fromUserId === input.toUserId) {
			return { success: false, error: "Cannot tip yourself", status: "self_tip" };
		}

		if (
			input.amount < 0.01 ||
			input.amount > 10000 ||
			!Number.isSafeInteger(input.amount * 10 ** SKR_DECIMALS)
		) {
			return {
				success: false,
				error: "Tip amount must be between 0.01 and 10,000 SKR with at most 6 decimal places",
				status: "invalid_amount",
			};
		}

		const senderWallet = canonicalAddress(requestedWalletAddress);
		if (!senderWallet) {
			return { success: false, error: "Invalid sender wallet", status: "wallet_not_verified" };
		}

		const senderAccounts = await getVerifiedSolanaWallets(fromPrivyId);
		if (!ownsWallet(senderAccounts, senderWallet)) {
			return {
				success: false,
				error: "Selected wallet is not verified for this account",
				status: "wallet_not_verified",
			};
		}

		const [recipient] = await db
			.select({
				id: users.id,
				walletAddress: users.walletAddress,
				privyId: users.privyId,
			})
			.from(users)
			.where(eq(users.id, input.toUserId))
			.limit(1);

		if (!recipient) {
			return { success: false, error: "Recipient not found", status: "not_found" };
		}

		const recipientAccounts = await getVerifiedSolanaWallets(recipient.privyId);
		const preferredRecipient = canonicalAddress(recipient.walletAddress);
		const embeddedRecipients = recipientAccounts.filter(
			(account) => account.walletClientType === "privy" && account.address,
		);
		const recipientWallet =
			preferredRecipient && ownsWallet(recipientAccounts, preferredRecipient)
				? preferredRecipient
				: embeddedRecipients.length === 1 && embeddedRecipients[0].address
					? canonicalAddress(embeddedRecipients[0].address)
					: null;

		if (!recipientWallet) {
			return {
				success: false,
				error: "Recipient does not have an unambiguous verified wallet",
				status: "recipient_wallet_unverified",
			};
		}

		const recentTip = await db
			.select({ id: tips.id })
			.from(tips)
			.where(
				and(
					eq(tips.fromUserId, fromUserId),
					eq(tips.toUserId, input.toUserId),
					eq(tips.status, "confirmed"),
					eq(tips.verificationVersion, VERIFICATION_VERSION),
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

		const [existingPending] = await db
			.select({ id: tips.id, txSignature: tips.txSignature })
			.from(tips)
			.where(
				and(
					eq(tips.fromUserId, fromUserId),
					eq(tips.toUserId, input.toUserId),
					eq(tips.status, "pending"),
				),
			)
			.limit(1);

		if (existingPending?.txSignature) {
			return {
				success: false,
				tipId: existingPending.id,
				error: "A submitted tip is still being confirmed",
				status: "confirmation_pending",
			};
		}

		if (existingPending) {
			await db
				.update(tips)
				.set({ status: "failed", failedAt: new Date(), lastVerificationCode: "replaced_unsigned" })
				.where(and(eq(tips.id, existingPending.id), isNull(tips.txSignature)));
		}

		const rawAmount = skrToRawAmount(input.amount);
		let txResult: TipTransactionResult;
		try {
			txResult = await buildTipTransaction({
				from: senderWallet,
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

		const [tip] = await db
			.insert(tips)
			.values({
				fromUserId,
				toUserId: input.toUserId,
				amount: rawAmount,
				tokenMint: SKR_MINT,
				fromWalletAddress: senderWallet,
				toWalletAddress: recipientWallet,
				sourceTokenAccount: txResult.sourceTokenAccount,
				destinationTokenAccount: txResult.destinationTokenAccount,
				tokenProgram: txResult.tokenProgram,
				tokenDecimals: SKR_DECIMALS,
				preparedBlockhash: txResult.blockhash,
				lastValidBlockHeight: txResult.lastValidBlockHeight,
				preparedMessageHash: txResult.messageHash,
				verificationVersion: VERIFICATION_VERSION,
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
		return { success: false, error: "Failed to prepare tip. Please try again." };
	}
}

export async function confirmTipInternal(
	fromUserId: string,
	input: ConfirmTipInput,
): Promise<ConfirmTipResult> {
	if (!validateTransactionSignature(input.txSignature)) {
		return { success: false, error: "Invalid transaction signature", status: "invalid_signature" };
	}

	const claimKey = randomUUID();
	try {
		const [claimed] = await db
			.update(tips)
			.set({
				txSignature: input.txSignature,
				signatureSubmittedAt: new Date(),
				verificationClaimKey: claimKey,
				verificationClaimedAt: new Date(),
				verificationAttempts: sql`${tips.verificationAttempts} + 1`,
			})
			.where(
				and(
					eq(tips.id, input.tipId),
					eq(tips.fromUserId, fromUserId),
					eq(tips.status, "pending"),
					eq(tips.verificationVersion, VERIFICATION_VERSION),
					isNull(tips.txSignature),
					isNull(tips.verificationClaimKey),
				),
			)
			.returning({
				id: tips.id,
				preparedMessageHash: tips.preparedMessageHash,
				preparedBlockhash: tips.preparedBlockhash,
			});

		if (!claimed) {
			const [existing] = await db
				.select({
					fromUserId: tips.fromUserId,
					status: tips.status,
					txSignature: tips.txSignature,
					lastVerificationCode: tips.lastVerificationCode,
				})
				.from(tips)
				.where(eq(tips.id, input.tipId))
				.limit(1);

			if (!existing) return { success: false, error: "Tip not found", status: "not_found" };
			if (existing.fromUserId !== fromUserId) {
				return { success: false, error: "Unauthorized", status: "unauthorized" };
			}
			if (existing.txSignature !== input.txSignature) {
				return { success: false, error: "Tip already has another signature", status: "signature_mismatch" };
			}
			if (existing.status === "confirmed") return { success: true, status: "confirmed" };
			if (existing.status === "pending") return { success: true, status: "confirmation_pending" };
			return {
				success: false,
				error: "Transaction could not be verified for this tip",
				status: existing.lastVerificationCode ?? "failed",
			};
		}

		if (!claimed.preparedMessageHash || !claimed.preparedBlockhash) {
			throw new Error("Version 1 tip is missing prepared message evidence");
		}

		const verification = await verifyTipTransaction(input.txSignature, {
			preparedMessageHash: claimed.preparedMessageHash,
			preparedBlockhash: claimed.preparedBlockhash,
		});

		if (verification === "confirmation_pending") {
			await db
				.update(tips)
				.set({
					verificationClaimKey: null,
					verificationClaimedAt: null,
					lastVerificationCode: verification,
				})
				.where(and(eq(tips.id, input.tipId), eq(tips.verificationClaimKey, claimKey)));
			return { success: true, status: "confirmation_pending" };
		}

		if (verification !== "confirmed") {
			await db
				.update(tips)
				.set({
					status: "failed",
					failedAt: new Date(),
					lastVerificationCode: verification,
					verificationClaimKey: null,
					verificationClaimedAt: null,
				})
				.where(and(eq(tips.id, input.tipId), eq(tips.verificationClaimKey, claimKey)));
			return {
				success: false,
				error: "Transaction could not be verified for this tip",
				status: verification,
			};
		}

		const [confirmed] = await db
			.update(tips)
			.set({
				status: "confirmed",
				confirmedAt: new Date(),
				lastVerificationCode: "confirmed",
				verificationClaimKey: null,
				verificationClaimedAt: null,
			})
			.where(
				and(
					eq(tips.id, input.tipId),
					eq(tips.status, "pending"),
					eq(tips.verificationClaimKey, claimKey),
				),
			)
			.returning({ id: tips.id });

		return confirmed
			? { success: true, status: "confirmed" }
			: { success: true, status: "confirmation_pending" };
	} catch (error) {
		if (isUniqueSignatureError(error)) {
			return {
				success: false,
				error: "This transaction was already used for another tip",
				status: "signature_reused",
			};
		}
		console.error(
			"[confirmTip] Error:",
			error instanceof Error ? error.message : "Unknown error",
		);
		return { success: false, error: "Failed to confirm tip. Please try again." };
	}
}

export async function getTipStatsInternal(userId: string): Promise<TipStatsResult> {
	try {
		const [result] = await db
			.select({
				totalReceived: sql<string>`COALESCE(SUM(${tips.amount}), 0)`,
				tipCount: sql<number>`COUNT(*)::int`,
			})
			.from(tips)
			.where(
				and(
					eq(tips.toUserId, userId),
					eq(tips.status, "confirmed"),
					eq(tips.verificationVersion, VERIFICATION_VERSION),
				),
			);

		return {
			success: true,
			totalReceived: rawAmountToSkr(BigInt(result?.totalReceived ?? "0")),
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

export async function getTotalTipsFromTo(
	fromUserId: string,
	toUserId: string,
): Promise<number> {
	const [result] = await db
		.select({ total: sql<string>`COALESCE(SUM(${tips.amount}), 0)` })
		.from(tips)
		.where(
			and(
				eq(tips.fromUserId, fromUserId),
				eq(tips.toUserId, toUserId),
				eq(tips.status, "confirmed"),
				eq(tips.verificationVersion, VERIFICATION_VERSION),
			),
		);

	return rawAmountToSkr(BigInt(result?.total ?? "0"));
}
