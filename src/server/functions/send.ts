/**
 * Send server functions
 * Prepares transfer transactions for wallet sends (SOL/USDC/SKR).
 * All transfer logic lives in src/server/utils/transfer-transaction.ts
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { withAuth } from "@/server/auth";

const prepareSendSchema = z.object({
	toAddress: z.string().min(1),
	amount: z.string().min(1),
	asset: z.enum(["sol", "usdc", "skr"]),
	walletAddress: z.string().min(1),
});

/**
 * Prepare a transfer transaction
 * Builds an unsigned transaction for the client to sign
 */
export const prepareSend = createServerFn({
	method: "POST",
}).handler(async (input: unknown) => {
	const result = await withAuth(prepareSendSchema, input);
	if (!result) {
		return { success: false as const, error: "Authentication required" };
	}

	const { input: data } = result;

	try {
		const { buildTransferTransaction } = await import(
			"@/server/utils/transfer-transaction"
		);

		const txResult = await buildTransferTransaction({
			from: data.walletAddress,
			to: data.toAddress,
			amount: data.amount,
			asset: data.asset,
		});

		return {
			success: true as const,
			transactionBase64: txResult.transactionBase64,
			blockhash: txResult.blockhash,
			lastValidBlockHeight: txResult.lastValidBlockHeight,
		};
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to prepare transfer";
		console.error("[prepareSend] Error:", message);
		return { success: false as const, error: message };
	}
});
