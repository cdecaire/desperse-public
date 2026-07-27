import { randomUUID } from "node:crypto";
import { and, asc, eq, isNotNull, isNull, lt, lte, or, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { tips } from "@/server/db/schema";
import {
	type PreparedTipEvidence,
	type TipVerificationCode,
	verifyTipTransaction,
} from "@/server/utils/tip-payment-verifier";

const VERIFICATION_VERSION = 1;
const CLAIM_LEASE_MS = 2 * 60_000;
const MAX_BATCH_SIZE = 50;
const BACKOFF_MS = [15_000, 30_000, 60_000, 120_000, 300_000, 600_000] as const;

export type ClaimedTip = PreparedTipEvidence & {
	id: string;
	txSignature: string;
	claimKey: string;
	attempts: number;
};

export type ReconciliationSummary = {
	claimed: number;
	confirmed: number;
	retried: number;
	failed: number;
};

export function verificationBackoffMs(attempts: number, random = Math.random): number {
	const base = BACKOFF_MS[Math.min(Math.max(attempts - 1, 0), BACKOFF_MS.length - 1)];
	return Math.round(base * (1 + random() * 0.2));
}

async function claimDueTips(now: Date, limit: number): Promise<ClaimedTip[]> {
	const staleBefore = new Date(now.getTime() - CLAIM_LEASE_MS);
	const candidates = await db
		.select({ id: tips.id })
		.from(tips)
		.where(and(
			eq(tips.status, "pending"),
			eq(tips.verificationVersion, VERIFICATION_VERSION),
			isNotNull(tips.txSignature),
			or(isNull(tips.nextVerificationAt), lte(tips.nextVerificationAt, now)),
			or(isNull(tips.verificationClaimedAt), lt(tips.verificationClaimedAt, staleBefore)),
		))
		.orderBy(asc(tips.signatureSubmittedAt))
		.limit(Math.min(limit, MAX_BATCH_SIZE));

	const claimed: ClaimedTip[] = [];
	for (const candidate of candidates) {
		const claimKey = randomUUID();
		const [row] = await db
			.update(tips)
			.set({
				verificationClaimKey: claimKey,
				verificationClaimedAt: now,
				verificationAttempts: sql`${tips.verificationAttempts} + 1`,
				nextVerificationAt: null,
			})
			.where(and(
				eq(tips.id, candidate.id),
				eq(tips.status, "pending"),
				isNotNull(tips.txSignature),
				or(isNull(tips.nextVerificationAt), lte(tips.nextVerificationAt, now)),
				or(isNull(tips.verificationClaimedAt), lt(tips.verificationClaimedAt, staleBefore)),
			))
			.returning({
				id: tips.id,
				txSignature: tips.txSignature,
				preparedMessageHash: tips.preparedMessageHash,
				preparedBlockhash: tips.preparedBlockhash,
				attempts: tips.verificationAttempts,
			});

		if (row?.txSignature && row.preparedMessageHash && row.preparedBlockhash) {
			claimed.push({
				...row,
				txSignature: row.txSignature,
				preparedMessageHash: row.preparedMessageHash,
				preparedBlockhash: row.preparedBlockhash,
				claimKey,
			});
		}
	}
	return claimed;
}

async function finalizeClaim(
	row: ClaimedTip,
	result: TipVerificationCode,
	now: Date,
	random: () => number,
): Promise<"confirmed" | "retried" | "failed"> {
	const ownedClaim = and(eq(tips.id, row.id), eq(tips.status, "pending"), eq(tips.verificationClaimKey, row.claimKey));
	if (result === "confirmation_pending") {
		await db.update(tips).set({
			verificationClaimKey: null,
			verificationClaimedAt: null,
			lastVerificationCode: result,
			nextVerificationAt: new Date(now.getTime() + verificationBackoffMs(row.attempts, random)),
		}).where(ownedClaim);
		return "retried";
	}

	if (result !== "confirmed") {
		await db.update(tips).set({
			status: "failed",
			failedAt: now,
			lastVerificationCode: result,
			verificationClaimKey: null,
			verificationClaimedAt: null,
			nextVerificationAt: null,
		}).where(ownedClaim);
		return "failed";
	}

	const updated = await db.update(tips).set({
		status: "confirmed",
		confirmedAt: now,
		lastVerificationCode: "confirmed",
		verificationClaimKey: null,
		verificationClaimedAt: null,
		nextVerificationAt: null,
	}).where(ownedClaim).returning({ id: tips.id });
	return updated.length > 0 ? "confirmed" : "retried";
}

export async function reconcilePendingTips(options: {
	now?: Date;
	random?: () => number;
	limit?: number;
	claim?: (now: Date, limit: number) => Promise<ClaimedTip[]>;
	verify?: typeof verifyTipTransaction;
	finalize?: typeof finalizeClaim;
} = {}): Promise<ReconciliationSummary> {
	const now = options.now ?? new Date();
	const random = options.random ?? Math.random;
	const rows = await (options.claim ?? claimDueTips)(now, Math.min(options.limit ?? MAX_BATCH_SIZE, MAX_BATCH_SIZE));
	const verify = options.verify ?? verifyTipTransaction;
	const finalize = options.finalize ?? finalizeClaim;
	const summary: ReconciliationSummary = { claimed: rows.length, confirmed: 0, retried: 0, failed: 0 };

	for (const row of rows) {
		let result: TipVerificationCode;
		try {
			result = await verify(row.txSignature, row);
		} catch (error) {
			console.warn("[reconcilePendingTips] RPC verification failed; scheduling retry:", error instanceof Error ? error.message : "Unknown error");
			result = "confirmation_pending";
		}
		const outcome = await finalize(row, result, now, random);
		summary[outcome] += 1;
		console.log(`[reconcilePendingTips] ${row.id}: ${outcome}`);
	}
	console.log("[reconcilePendingTips] batch", summary);
	return summary;
}
