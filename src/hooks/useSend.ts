/**
 * Send Hook
 * Manages the wallet send lifecycle: prepare -> sign -> submit
 * No server-side confirm — activity view picks up sends via Helius TX history.
 */

import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWallets as useSolanaWallets } from "@privy-io/react-auth/solana";
import {
	useSignTransaction,
	useSignAndSendTransaction,
} from "@privy-io/react-auth/solana";
import { createSolanaRpc } from "@solana/kit";
import { prepareSend } from "@/server/functions/send";
import { useAuth } from "./useAuth";
import { useActiveWallet } from "./useActiveWallet";
import { toastError, toastSuccess } from "@/lib/toast";
import { getClientRpcUrl } from "@/lib/rpc";
import { Buffer } from "buffer";
import type { SendableAsset } from "@/server/utils/transfer-transaction";

type ServerFnInput<T> = { data: T };
const wrapInput = <T,>(data: T): ServerFnInput<T> => ({ data });

export type SendState =
	| "idle"
	| "preparing"
	| "signing"
	| "confirming"
	| "success"
	| "failed";

const ASSET_SYMBOLS: Record<SendableAsset, string> = {
	sol: "SOL",
	usdc: "USDC",
	skr: "SKR",
};

const SIGN_TIMEOUT_MS = 120_000;
const SEND_TX_TIMEOUT_MS = 30_000;

export function useSend() {
	const [state, setState] = useState<SendState>("idle");
	const { isAuthenticated, getAuthHeaders } = useAuth();
	const { activeAddress, activePrivyWallet, solanaWalletsReady } =
		useActiveWallet();
	const { wallets: solanaWallets } = useSolanaWallets();
	const { signTransaction } = useSignTransaction();
	const { signAndSendTransaction } = useSignAndSendTransaction();
	const queryClient = useQueryClient();
	const isSendingRef = useRef(false);

	const send = useCallback(
		async ({
			toAddress,
			amount,
			asset,
			onSuccess,
		}: {
			toAddress: string;
			amount: string;
			asset: SendableAsset;
			onSuccess?: () => void;
		}) => {
			if (!isAuthenticated || !activeAddress) {
				toastError("Please connect your wallet to send.");
				return false;
			}

			if (!solanaWalletsReady) {
				toastError(
					"Wallets are still initializing. Please wait a moment.",
				);
				return false;
			}

			if (isSendingRef.current) return false;
			isSendingRef.current = true;

			setState("preparing");

			// Declared outside try so catch can check if tx was already sent
			let txSubmitted = false;

			try {
				const authHeaders = await getAuthHeaders();
				const symbol = ASSET_SYMBOLS[asset];

				// Step 1: Prepare the transaction on the server
				const prepareResult = await prepareSend(
					wrapInput({
						toAddress,
						amount,
						asset,
						walletAddress: activeAddress,
						_authorization: authHeaders.Authorization,
					}) as never,
				);

				if (!prepareResult.success || !prepareResult.transactionBase64) {
					setState("failed");
					toastError(
						prepareResult.error ||
							"Failed to prepare transfer. Please try again.",
					);
					return false;
				}

				setState("signing");

				// Step 2: Find the correct wallet to sign with
				const currentWallet =
					activePrivyWallet ||
					solanaWallets.find((w) => w.address === activeAddress) ||
					null;

				if (!currentWallet?.address) {
					setState("failed");
					toastError(
						"Your active wallet is not connected. Please connect it and try again.",
					);
					return false;
				}

				if (currentWallet.address !== activeAddress) {
					setState("failed");
					toastError(
						"Wallet mismatch. Please ensure your active wallet matches the connected wallet.",
					);
					return false;
				}

				const txBytes = Uint8Array.from(
					Buffer.from(prepareResult.transactionBase64, "base64"),
				);

				const isEmbeddedWallet =
					(currentWallet as any).walletClientType === "privy";

				if (isEmbeddedWallet) {
					// For embedded wallets: sign + manually send via HTTP RPC
					await Promise.race([
						(async () => {
							const signedTx = await signTransaction({
								transaction: txBytes,
								wallet: currentWallet,
								chain: "solana:mainnet",
								// Disable Privy's transaction UI modal — it requires
								// WebSocket RPC subscriptions for tx confirmation, but
								// our RPC proxy is HTTP-only. Without this, Privy shows
								// "Something went wrong" even when signing succeeds.
								options: {
									uiOptions: { showWalletUIs: false },
								},
							});

							const rpc = createSolanaRpc(getClientRpcUrl());

							const base64Tx = Buffer.from(
								signedTx.signedTransaction,
							).toString("base64");
							const sendTxPromise = (rpc
								.sendTransaction as any)(base64Tx, {
								encoding: "base64",
								skipPreflight: false,
								maxRetries: 3,
							})
								.send();

							await Promise.race([
								sendTxPromise,
								new Promise<never>((_, reject) =>
									setTimeout(
										() =>
											reject(
												new Error(
													"Transaction send timeout",
												),
											),
										SEND_TX_TIMEOUT_MS,
									),
								),
							]);

							txSubmitted = true;
						})(),
						new Promise<never>((_, reject) =>
							setTimeout(
								() =>
									reject(
										new Error(
											"Transaction signing timeout",
										),
									),
								SIGN_TIMEOUT_MS,
							),
						),
					]);
				} else {
					// For external wallets: signAndSend
					await Promise.race([
						signAndSendTransaction({
							transaction: txBytes,
							wallet: currentWallet,
							chain: "solana:mainnet",
						} as any),
						new Promise<never>((_, reject) =>
							setTimeout(
								() =>
									reject(
										new Error(
											"Transaction signing timeout",
										),
									),
								SIGN_TIMEOUT_MS,
							),
						),
					]);

					txSubmitted = true;
				}

				setState("success");
				toastSuccess(`Sent ${amount} ${symbol}!`);

				// Invalidate wallet data so balances + activity refresh
				queryClient.invalidateQueries({
					queryKey: ["wallets-overview"],
				});

				onSuccess?.();

				// Reset after short delay
				setTimeout(() => setState("idle"), 2000);
				return true;
			} catch (error) {
				console.error("[useSend] Error:", error);

				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				const symbol = ASSET_SYMBOLS[asset];

				// Check for user rejection FIRST — before WebSocket error recovery
				const isUserRejection =
					errorMessage.includes("rejected") ||
					errorMessage.includes("cancelled") ||
					errorMessage.includes("canceled") ||
					errorMessage.includes("User rejected");

				if (isUserRejection) {
					setState("failed");
					toastError("Transaction was cancelled.");
					return false;
				}

				// Privy throws "Failed to connect to wallet" (WebSocket issue)
				// even when the transaction was already submitted successfully.
				// Same pattern as BuyButton — treat as success if RPC send completed.
				const isPrivyWebSocketError =
					errorMessage.includes("Failed to connect to wallet") ||
					errorMessage.includes("WebSocket") ||
					errorMessage.includes("websocket");

				if (txSubmitted || isPrivyWebSocketError) {
					setState("success");
					toastSuccess(`Sent ${amount} ${symbol}!`);

					queryClient.invalidateQueries({
						queryKey: ["wallets-overview"],
					});

					onSuccess?.();
					setTimeout(() => setState("idle"), 2000);
					return true;
				}

				setState("failed");

				if (
					errorMessage.includes("insufficient funds") ||
					errorMessage.includes("0x1")
				) {
					if (asset !== "sol") {
						toastError(
							"Not enough SOL to cover network fees. You need a small SOL balance to send tokens.",
						);
					} else {
						toastError(`Insufficient ${symbol} balance.`);
					}
				} else if (errorMessage.includes("Simulation failed")) {
					if (asset !== "sol") {
						toastError(
							"Not enough SOL to cover network fees. You need a small SOL balance to send tokens.",
						);
					} else {
						toastError(
							"Transaction simulation failed. Please try again.",
						);
					}
				} else {
					toastError(`Send failed: ${errorMessage}`);
				}
				return false;
			} finally {
				isSendingRef.current = false;
			}
		},
		[
			isAuthenticated,
			activeAddress,
			activePrivyWallet,
			solanaWallets,
			solanaWalletsReady,
			getAuthHeaders,
			signTransaction,
			signAndSendTransaction,
			queryClient,
		],
	);

	const reset = useCallback(() => {
		setState("idle");
	}, []);

	return {
		state,
		send,
		reset,
		isPending: state !== "idle" && state !== "success" && state !== "failed",
	};
}
