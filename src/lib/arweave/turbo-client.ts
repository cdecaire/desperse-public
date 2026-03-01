/**
 * Client-side Turbo utility — funding + credit management only (NOT uploads).
 * Uses dynamic import to avoid bundle bloat from @ardrive/turbo-sdk/web.
 *
 * This is CLIENT-SIDE code. No Node.js or server imports allowed.
 */

import type { TurboAuthenticatedClient } from "@ardrive/turbo-sdk/web";

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
const DESPERSE_TURBO_WALLET = import.meta.env.VITE_DESPERSE_TURBO_WALLET || "";

/**
 * Adapts a Privy connected Solana wallet into the SolanaWalletAdapter shape
 * expected by TurboFactory.authenticated().
 *
 * Turbo SDK expects:
 *   publicKey: { toString() }
 *   signMessage(Uint8Array) => Promise<Uint8Array>
 *   signTransaction(tx) => Promise<tx>
 *
 * Privy wallet provides:
 *   address: string
 *   signMessage({ message: Uint8Array }) => Promise<{ signature: Uint8Array }>
 *   signTransaction({ transaction: Uint8Array }) => Promise<{ signedTransaction: Uint8Array }>
 */
function adaptPrivyWallet(wallet: PrivyWallet) {
	return {
		publicKey: {
			toString: () => wallet.address,
		},
		signMessage: async (message: Uint8Array): Promise<Uint8Array> => {
			const result = await wallet.signMessage({ message });
			return result.signature;
		},
		signTransaction: async (transaction: unknown): Promise<unknown> => {
			// Turbo SDK passes the transaction object through; Privy expects { transaction: Uint8Array }
			const txBytes = transaction instanceof Uint8Array
				? transaction
				: new Uint8Array(transaction as ArrayBuffer);
			const result = await wallet.signTransaction({ transaction: txBytes });
			return result.signedTransaction;
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
	});
}

/**
 * Top up Turbo credits by paying with SOL.
 * Converts SOL amount to lamports and calls topUpWithTokens.
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

	const result = await turbo.topUpWithTokens({
		tokenAmount: lamports,
	});

	return {
		id: result.id,
		winc: result.winc,
		status: result.status,
	};
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

/**
 * Get the current Turbo credit balance for the authenticated wallet.
 *
 * @param turbo - Authenticated Turbo client
 * @returns Balance in winc (smallest unit)
 */
export async function getBalance(
	turbo: TurboClient,
): Promise<{ winc: string }> {
	const balance = await turbo.getBalance();
	return { winc: balance.winc };
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
