/**
 * Client-side Turbo utility — funding + credit management only (NOT uploads).
 * Uses dynamic import to avoid bundle bloat from @ardrive/turbo-sdk/web.
 *
 * This is CLIENT-SIDE code. No Node.js or server imports allowed.
 */

import type { TurboAuthenticatedClient } from "@ardrive/turbo-sdk/web";
import bs58 from "bs58";
import { getClientRpcUrl } from "@/lib/rpc";

/** Re-export the authenticated client type for consumers */
export type TurboClient = TurboAuthenticatedClient;

/**
 * Shape of a Privy ConnectedStandardSolanaWallet from useWallets().
 * We only need the subset required to build a Turbo wallet adapter.
 *
 * Privy's signMessage takes { message: Uint8Array } (not a bare Uint8Array).
 * Privy's signTransaction takes { transaction: Uint8Array, chain?: string }.
 */
interface PrivyWallet {
	address: string;
	signMessage: (input: { message: Uint8Array }) => Promise<{ signature: Uint8Array }>;
	signTransaction: (input: {
		transaction: Uint8Array;
		chain?: `${string}:${string}`;
	}) => Promise<{ signedTransaction: Uint8Array }>;
}

/** Desperse platform wallet address for credit sharing (public, not a secret) */
export const DESPERSE_TURBO_WALLET = import.meta.env.VITE_DESPERSE_TURBO_WALLET || "";

/**
 * Adapts a Privy connected Solana wallet into the SolanaWalletAdapter shape
 * expected by TurboFactory.authenticated().
 *
 * Turbo SDK expects:
 *   publicKey: { toString(), toBuffer(), toBytes() }
 *   signMessage(Uint8Array) => Promise<Uint8Array>
 *   signTransaction(tx) => Promise<tx>
 *
 * Privy wallet provides:
 *   address: string
 *   signMessage({ message: Uint8Array }) => Promise<{ signature: Uint8Array }>
 *   signTransaction({ transaction: Uint8Array }) => Promise<{ signedTransaction: Uint8Array }>
 */
function adaptPrivyWallet(wallet: PrivyWallet) {
	// Decode the base58 address once — reused by toBuffer/toBytes
	const pubkeyBytes = bs58.decode(wallet.address);

	return {
		publicKey: {
			toString: () => wallet.address,
			// Cast to satisfy SDK's Buffer type — Uint8Array is compatible at runtime
			// (Buffer extends Uint8Array) and avoids requiring the Buffer polyfill
			toBuffer: () => new Uint8Array(pubkeyBytes) as unknown as Buffer,
			toBytes: () => new Uint8Array(pubkeyBytes),
		},
		signMessage: async (message: Uint8Array): Promise<Uint8Array> => {
			const result = await wallet.signMessage({ message });
			return result.signature;
		},
		signTransaction: async (transaction: unknown): Promise<unknown> => {
			// The Turbo SDK passes a @solana/web3.js Transaction object.
			// We need to serialize it for Privy, then deserialize the signed result
			// back into a Transaction so the SDK can call .serialize() on it.
			const { Transaction } = await import("@solana/web3.js");

			let txBytes: Uint8Array;
			if (transaction instanceof Transaction) {
				txBytes = transaction.serialize({
					requireAllSignatures: false,
					verifySignatures: false,
				});
			} else if (transaction instanceof Uint8Array) {
				txBytes = transaction;
			} else {
				txBytes = new Uint8Array(transaction as ArrayBuffer);
			}

			const result = await wallet.signTransaction({
				transaction: txBytes,
			});

			// Deserialize back into a Transaction so the SDK can call .serialize()
			return Transaction.from(result.signedTransaction);
		},
	};
}

/**
 * Creates an authenticated Turbo client from a Privy connected Solana wallet.
 * Uses dynamic import to avoid loading the SDK until needed.
 */
export async function createTurboClientFromPrivy(
	privyWallet: PrivyWallet,
): Promise<TurboClient> {
	const { TurboFactory } = await import("@ardrive/turbo-sdk/web");

	const walletAdapter = adaptPrivyWallet(privyWallet);

	return TurboFactory.authenticated({
		walletAdapter,
		token: "solana",
		// Use the project's RPC proxy instead of the default public mainnet RPC
		// which is rate-limited and returns 403
		gatewayUrl: getClientRpcUrl(),
	});
}

/**
 * Top up Turbo credits by paying with SOL.
 * Converts SOL amount to lamports and calls topUpWithTokens.
 *
 * If the on-chain tx succeeds but the Turbo API submission fails,
 * automatically retries submitFundTransaction before throwing.
 *
 * @param turbo - Authenticated Turbo client
 * @param amountSol - Amount in SOL (e.g. 0.1 for 0.1 SOL)
 */
export async function topUpWithSol(
	turbo: TurboClient,
	amountSol: number,
): Promise<{ id: string; winc: string; status: string }> {
	const lamports = Math.floor(amountSol * 1_000_000_000);

	if (lamports <= 0) {
		throw new Error("Top-up amount must be greater than 0");
	}

	try {
		const result = await turbo.topUpWithTokens({
			tokenAmount: lamports,
		});

		return {
			id: result.id,
			winc: result.winc,
			status: result.status,
		};
	} catch (err) {
		const msg = err instanceof Error ? err.message : "";

		// The SDK error includes the tx ID when on-chain succeeds but API submission fails.
		// Extract it and retry submitFundTransaction.
		if (msg.includes("Failed to submit fund transaction")) {
			const txIdMatch = msg.match(
				/submitFundTransaction\(id\)':\s*(\S+)/,
			);
			const txId = txIdMatch?.[1];

			if (txId) {
				console.log(
					"[topUpWithSol] On-chain tx succeeded, retrying API submission for txId:",
					txId,
				);
				// Wait a bit for the tx to propagate
				await new Promise((r) => setTimeout(r, 3000));
				try {
					// Use direct REST call — SDK's submitFundTransaction uses Node Buffer
					return await retryFundSubmission(txId);
				} catch (retryErr) {
					console.warn(
						"[topUpWithSol] Retry also failed, returning pending with txId",
						retryErr,
					);
					// Return a pending result so the UI can track it
					return { id: txId, winc: "0", status: "pending" };
				}
			}
		}

		throw err;
	}
}

/** Turbo payment API base URL */
const TURBO_PAYMENT_URL = "https://payment.ardrive.io";

/**
 * Manually submit a fund transaction to the Turbo API via direct REST call.
 * Bypasses the SDK's submitFundTransaction which uses Node.js Buffer internally.
 *
 * Use this to recover credits when topUpWithTokens sent SOL on-chain
 * but failed to notify the Turbo API.
 *
 * @param txId - The Solana transaction signature
 */
export async function retryFundSubmission(
	txId: string,
): Promise<{ id: string; winc: string; status: string }> {
	const response = await fetch(
		`${TURBO_PAYMENT_URL}/account/balance/solana`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ tx_id: txId }),
		},
	);

	if (!response.ok) {
		const text = await response.text();
		throw new Error(
			`Turbo API error (${response.status}): ${text}`,
		);
	}

	const data = await response.json();

	if (data.creditedTransaction) {
		return {
			id: data.creditedTransaction.transactionId,
			winc: data.creditedTransaction.winstonCreditAmount,
			status: "confirmed",
		};
	}
	if (data.pendingTransaction) {
		return {
			id: data.pendingTransaction.transactionId,
			winc: data.pendingTransaction.winstonCreditAmount,
			status: "pending",
		};
	}

	// Fallback
	return { id: txId, winc: "0", status: "pending" };
}

/**
 * Share Turbo credits with the Desperse platform wallet.
 * This allows Desperse to upload on behalf of the user.
 *
 * @param turbo - Authenticated Turbo client
 * @param wincAmount - Amount of winc (smallest Turbo credit unit) to share
 * @param expirySeconds - Optional expiry in seconds (default: 30 days)
 */
export async function shareCreditsWithDesperse(
	turbo: TurboClient,
	wincAmount: string,
	expirySeconds: number = 30 * 24 * 60 * 60,
): Promise<{ approvalDataItemId: string; approvedWincAmount: string }> {
	if (!DESPERSE_TURBO_WALLET) {
		throw new Error(
			"VITE_DESPERSE_TURBO_WALLET is not configured. Cannot share credits.",
		);
	}

	const approval = await turbo.shareCredits({
		approvedAddress: DESPERSE_TURBO_WALLET,
		approvedWincAmount: wincAmount,
		expiresBySeconds: expirySeconds,
	});

	return {
		approvalDataItemId: approval.approvalDataItemId,
		approvedWincAmount: approval.approvedWincAmount,
	};
}

/** Shape of a credit share approval from the Turbo API */
export interface CreditApproval {
	approvalDataItemId: string;
	approvedAddress: string;
	approvedWincAmount: string;
	usedWincAmount: string;
	createdDate: string;
	expirationDate?: string;
}

/** Full balance response including approval details */
export interface TurboBalanceResult {
	winc: string;
	givenApprovals: CreditApproval[];
	receivedApprovals: CreditApproval[];
}

/**
 * Get the current Turbo credit balance for the authenticated wallet,
 * including credit share approval details.
 *
 * @param turbo - Authenticated Turbo client
 * @returns Balance in winc plus given/received approval arrays
 */
export async function getBalance(
	turbo: TurboClient,
): Promise<TurboBalanceResult> {
	const balance = await turbo.getBalance();
	return {
		winc: balance.winc,
		givenApprovals: (balance as Record<string, unknown>).givenApprovals as CreditApproval[] ?? [],
		receivedApprovals: (balance as Record<string, unknown>).receivedApprovals as CreditApproval[] ?? [],
	};
}

/**
 * Estimate the upload cost in winc for one or more byte sizes.
 *
 * @param turbo - Authenticated Turbo client
 * @param bytes - Array of byte sizes to estimate
 * @returns Total cost in winc
 */
export async function estimateCost(
	turbo: TurboClient,
	bytes: number[],
): Promise<{ winc: string }> {
	const costs = await turbo.getUploadCosts({ bytes });

	// Sum all winc costs
	const totalWinc = costs.reduce((sum, cost) => {
		return sum + BigInt(cost.winc);
	}, BigInt(0));

	return { winc: totalWinc.toString() };
}

/**
 * Revoke shared credits previously given to an address.
 * Reclaims any unused credits from the approval.
 *
 * @param turbo - Authenticated Turbo client
 * @param revokedAddress - The address whose approval to revoke
 */
export async function revokeSharedCredits(
	turbo: TurboClient,
	revokedAddress: string,
): Promise<void> {
	await turbo.revokeCredits({ revokedAddress });
}

/**
 * Format winc (smallest Turbo credit unit) to human-readable AR.
 * Shared utility used by settings page and inline funding section.
 */
export function formatCredits(winc: string): string {
	const val = BigInt(winc);
	if (val === BigInt(0)) return "0 AR";
	const ar = Number(val) / 1e12;
	if (ar >= 0.01) return `${ar.toFixed(4)} AR`;
	if (ar >= 0.0001) return `${ar.toFixed(6)} AR`;
	return `~${ar.toExponential(2)} AR`;
}

/**
 * Check how many Turbo credits the current wallet has shared with the
 * Desperse platform wallet. Mirrors the server-side `checkCreatorSharedBalance`
 * logic but runs entirely client-side.
 *
 * @param turbo - Authenticated Turbo client
 * @returns Shared winc remaining and whether an active approval exists
 */
export async function getSharedCreditsWithDesperse(
	turbo: TurboClient,
): Promise<{ sharedWinc: string; hasApproval: boolean }> {
	if (!DESPERSE_TURBO_WALLET) {
		return { sharedWinc: "0", hasApproval: false };
	}

	const approvals = await turbo.getCreditShareApprovals({});

	// Filter to approvals given TO the Desperse platform wallet
	const relevant = approvals.givenApprovals.filter(
		(a: { approvedAddress: string }) =>
			a.approvedAddress.toLowerCase() ===
			DESPERSE_TURBO_WALLET.toLowerCase(),
	);

	if (relevant.length === 0) {
		return { sharedWinc: "0", hasApproval: false };
	}

	// Sum remaining winc across all relevant approvals (approved - used)
	let totalSharedWinc = BigInt(0);
	for (const approval of relevant) {
		const approved = BigInt(
			(approval as { approvedWincAmount: string }).approvedWincAmount,
		);
		const used = BigInt(
			(approval as { usedWincAmount: string }).usedWincAmount,
		);
		const remaining = approved - used;
		if (remaining > BigInt(0)) {
			totalSharedWinc += remaining;
		}
	}

	return {
		sharedWinc: totalSharedWinc.toString(),
		hasApproval: totalSharedWinc > BigInt(0),
	};
}
