/**
 * Lightweight Arweave credit-share balance checker using the Turbo REST API.
 *
 * This file intentionally does NOT import @ardrive/turbo-sdk to avoid
 * cosmjs-types bundling issues (broken globalThis detection in Rollup ESM).
 */

import { env } from "@/config/env";

/**
 * Minimum winc balance we consider "sufficient" for a creator to cover
 * a typical upload. 100_000_000 winc ~ a few hundred KB of data.
 */
const MIN_SUFFICIENT_WINC = "100000000";

/** Turbo payment API base URL */
const TURBO_PAYMENT_URL =
	env.TURBO_PAYMENT_URL || "https://payment.ardrive.io";

interface CreditApproval {
	approvedAddress: string;
	approvedWincAmount: string;
	usedWincAmount: string;
	expirationDate?: string | null;
}

interface ApprovalsResponse {
	givenApprovals: CreditApproval[];
	receivedApprovals: CreditApproval[];
}

/**
 * Checks whether a creator has shared sufficient Turbo credits with the
 * Desperse platform wallet for uploads.
 *
 * Uses the public Turbo REST API (`/v1/account/approvals/get`) instead of the
 * SDK to avoid pulling in cosmjs-types and its broken global detection.
 *
 * @param creatorWallet - The creator's Solana wallet address
 * @returns Available shared winc, sufficiency flag, and expiration date
 */
export async function checkCreatorSharedBalance(
	creatorWallet: string,
): Promise<{
	availableWinc: string;
	sufficient: boolean;
	expiresAt: Date | null;
}> {
	const desperseWallet = env.DESPERSE_TURBO_WALLET;

	if (!desperseWallet) {
		console.error(
			"[ArweaveTurbo] DESPERSE_TURBO_WALLET is not configured — cannot check shared balance",
		);
		return {
			availableWinc: "0",
			sufficient: false,
			expiresAt: null,
		};
	}

	console.log(
		`[ArweaveTurbo] Checking shared balance from creator ${creatorWallet.slice(0, 8)}... to platform ${desperseWallet.slice(0, 8)}...`,
	);

	try {
		const url = `${TURBO_PAYMENT_URL}/v1/account/approvals/get?userAddress=${encodeURIComponent(creatorWallet)}`;
		const res = await fetch(url);

		if (!res.ok) {
			throw new Error(
				`Turbo API returned HTTP ${res.status}: ${await res.text()}`,
			);
		}

		const approvals = (await res.json()) as ApprovalsResponse;

		// Find approvals given by this creator TO the Desperse platform wallet
		const relevantApprovals = approvals.givenApprovals.filter(
			(a) =>
				a.approvedAddress.toLowerCase() ===
				desperseWallet.toLowerCase(),
		);

		if (relevantApprovals.length === 0) {
			console.log(
				`[ArweaveTurbo] No shared credit approvals found from creator ${creatorWallet.slice(0, 8)}...`,
			);
			return {
				availableWinc: "0",
				sufficient: false,
				expiresAt: null,
			};
		}

		// Sum available winc across all relevant approvals (approved - used)
		let totalAvailableWinc = BigInt(0);
		let earliestExpiration: Date | null = null;

		for (const approval of relevantApprovals) {
			const approved = BigInt(approval.approvedWincAmount);
			const used = BigInt(approval.usedWincAmount);
			const remaining = approved - used;

			if (remaining > BigInt(0)) {
				totalAvailableWinc += remaining;
			}

			if (approval.expirationDate) {
				const expDate = new Date(approval.expirationDate);
				if (!earliestExpiration || expDate < earliestExpiration) {
					earliestExpiration = expDate;
				}
			}
		}

		const sufficient =
			totalAvailableWinc >= BigInt(MIN_SUFFICIENT_WINC);

		console.log(
			`[ArweaveTurbo] Creator shared balance: ${totalAvailableWinc.toString()} winc, sufficient=${sufficient}`,
		);

		return {
			availableWinc: totalAvailableWinc.toString(),
			sufficient,
			expiresAt: earliestExpiration,
		};
	} catch (error) {
		const msg =
			error instanceof Error
				? error.message
				: typeof error === "string"
					? error
					: JSON.stringify(error, null, 2);
		console.error(
			"[ArweaveTurbo] Failed to check creator shared balance:",
			msg,
			error,
		);
		throw error;
	}
}
