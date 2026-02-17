/**
 * Tips server functions
 * Exposes tip creation, confirmation, and stats via createServerFn.
 * All DB logic lives in src/server/utils/tips-internal.ts
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { withAuth, withOptionalAuth } from "@/server/auth";

const prepareTipSchema = z.object({
	toUserId: z.string().uuid(),
	amount: z.number().positive().max(10000),
	context: z.enum(["profile", "message_unlock"]),
	walletAddress: z.string().min(1),
});

/**
 * Prepare a tip transaction
 * Builds an unsigned SPL transfer transaction for the client to sign
 */
export const prepareTip = createServerFn({
	method: "POST",
}).handler(async (input: unknown) => {
	const result = await withAuth(prepareTipSchema, input);
	if (!result) {
		return { success: false, error: "Authentication required" };
	}

	const { auth, input: data } = result;

	const { prepareTipInternal } = await import(
		"@/server/utils/tips-internal"
	);
	return prepareTipInternal(auth.userId, data.walletAddress, {
		toUserId: data.toUserId,
		amount: data.amount,
		context: data.context,
	});
});

const confirmTipSchema = z.object({
	tipId: z.string().uuid(),
	txSignature: z.string().min(1),
});

/**
 * Confirm a tip after the transaction has been signed and submitted
 */
export const confirmTip = createServerFn({
	method: "POST",
}).handler(async (input: unknown) => {
	const result = await withAuth(confirmTipSchema, input);
	if (!result) {
		return { success: false, error: "Authentication required" };
	}

	const { auth, input: data } = result;

	const { confirmTipInternal } = await import(
		"@/server/utils/tips-internal"
	);
	return confirmTipInternal(auth.userId, data);
});

const getTipStatsSchema = z.object({
	userId: z.string().uuid(),
});

/**
 * Get tip stats for a user (total received, tip count)
 * Public endpoint - no auth required
 */
export const getTipStats = createServerFn({
	method: "POST",
}).handler(async (input: unknown) => {
	const { input: data } = await withOptionalAuth(
		getTipStatsSchema,
		input,
	);

	const { getTipStatsInternal } = await import(
		"@/server/utils/tips-internal"
	);
	return getTipStatsInternal(data.userId);
});
