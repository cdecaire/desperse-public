/**
 * Tip Hook
 * Manages the tip transaction lifecycle: prepare -> sign -> submit -> confirm
 */

import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
	useWallets as useSolanaWallets,
} from "@privy-io/react-auth/solana";
import {
	useSignTransaction,
	useSignAndSendTransaction,
} from "@privy-io/react-auth/solana";
import { createSolanaRpc } from "@solana/kit";
import { prepareTip, confirmTip } from "@/server/functions/tips";
import { useAuth } from "./useAuth";
import { useActiveWallet } from "./useActiveWallet";
import { toastError, toastSuccess } from "@/lib/toast";
import { Buffer } from "buffer";
import bs58 from "bs58";

type ServerFnInput<T> = { data: T };
const wrapInput = <T,>(data: T): ServerFnInput<T> => ({ data });

export type TipState =
	| "idle"
	| "preparing"
	| "signing"
	| "confirming"
	| "success"
	| "failed";

const SIGN_TIMEOUT_MS = 120_000;
const SEND_TX_TIMEOUT_MS = 30_000;

export function useTip() {
	const [state, setState] = useState<TipState>("idle");
	const { isAuthenticated, getAuthHeaders } = useAuth();
	const { activeAddress, activePrivyWallet, solanaWalletsReady } =
		useActiveWallet();
	const { wallets: solanaWallets } = useSolanaWallets();
	const { signTransaction } = useSignTransaction();
	const { signAndSendTransaction } = useSignAndSendTransaction();
	const queryClient = useQueryClient();
	const isTippingRef = useRef(false);

	const sendTip = useCallback(
		async ({
			toUserId,
			amount,
			context,
			onSuccess,
		}: {
			toUserId: string;
			amount: number;
			context: "profile" | "message_unlock";
			onSuccess?: () => void;
		}) => {
			if (!isAuthenticated || !activeAddress) {
				toastError("Please connect your wallet to send a tip.");
				return false;
			}

			if (!solanaWalletsReady) {
				toastError(
					"Wallets are still initializing. Please wait a moment.",
				);
				return false;
			}

			if (isTippingRef.current) return false;
			isTippingRef.current = true;

			setState("preparing");

			try {
				const authHeaders = await getAuthHeaders();

				// Step 1: Prepare the transaction on the server
				const prepareResult = await prepareTip(
					wrapInput({
						toUserId,
						amount,
						context,
						walletAddress: activeAddress,
						_authorization: authHeaders.Authorization,
					}) as never,
				);

				if (
					!prepareResult.success ||
					!prepareResult.transaction ||
					!prepareResult.tipId
				) {
					setState("failed");
					toastError(
						prepareResult.error ||
							"Failed to prepare tip. Please try again.",
					);
					return false;
				}

				setState("signing");

				// Step 2: Find the correct wallet to sign with
				// The transaction is built for activeAddress, so we must sign with a wallet matching that address
				const currentWallet =
					activePrivyWallet ||
					solanaWallets.find((w) => w.address === activeAddress) ||
					null;

				if (!currentWallet?.address) {
					// The active wallet's address doesn't match any connected Privy wallet
					// This typically means an external wallet is set as active but not connected to the site
					setState("failed");
					toastError(
						"Your active wallet is not connected. Please connect it via your browser extension and try again.",
					);
					return false;
				}

				// Verify the signing wallet matches the transaction's sender address
				if (currentWallet.address !== activeAddress) {
					console.warn(
						`[useTip] Wallet mismatch: transaction built for ${activeAddress}, but signing with ${currentWallet.address}`,
					);
					setState("failed");
					toastError(
						"Wallet mismatch. Please ensure your active wallet matches the connected wallet.",
					);
					return false;
				}

				const txBytes = Uint8Array.from(
					Buffer.from(prepareResult.transaction, "base64"),
				);

				const modalUiOptions = {
					title: "Sign tip transaction",
					description: `Sending ${amount} SKR tip`,
					showWalletUIs: true,
				};

				const isEmbeddedWallet =
					(currentWallet as any).walletClientType === "privy";
				let signature: string;

				if (isEmbeddedWallet) {
					// For embedded wallets: sign + manually send via RPC
					const signed = await Promise.race([
						(async () => {
							const signedTx = await signTransaction({
								transaction: txBytes,
								wallet: currentWallet,
								chain: "solana:mainnet",
								options: { uiOptions: modalUiOptions },
							});

							const heliusApiKey =
								import.meta.env.VITE_HELIUS_API_KEY;
							const rpcUrl = heliusApiKey
								? `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
								: "https://api.mainnet-beta.solana.com";
							const rpc = createSolanaRpc(rpcUrl);

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

							const txSignature = await Promise.race([
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

							return {
								signature: bs58.decode(
									txSignature,
								),
							};
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

					signature = bs58.encode(signed.signature);
				} else {
					// For external wallets: signAndSend
					const signed = await Promise.race([
						signAndSendTransaction({
							transaction: txBytes,
							wallet: currentWallet,
							chain: "solana:mainnet",
							options: { uiOptions: modalUiOptions },
						}),
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

					signature = bs58.encode(signed.signature);
				}

				// Step 3: Confirm on server
				setState("confirming");

				const confirmResult = await confirmTip(
					wrapInput({
						tipId: prepareResult.tipId,
						txSignature: signature,
						_authorization: authHeaders.Authorization,
					}) as never,
				);

				if (!confirmResult.success) {
					setState("failed");
					toastError(
						confirmResult.error || "Tip sent but confirmation failed.",
					);
					return false;
				}

				setState("success");
				toastSuccess(`Sent ${amount} SKR tip!`);

				// Invalidate eligibility queries so the UI updates
				queryClient.invalidateQueries({
					queryKey: ["dm-eligibility"],
				});
				queryClient.invalidateQueries({
					queryKey: ["tip-stats"],
				});

				onSuccess?.();

				// Reset after short delay
				setTimeout(() => setState("idle"), 2000);
				return true;
			} catch (error) {
				console.error("[useTip] Error:", error);
				setState("failed");

				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";

				// Check for user rejection
				if (
					errorMessage.includes("rejected") ||
					errorMessage.includes("cancelled") ||
					errorMessage.includes("canceled") ||
					errorMessage.includes("User rejected")
				) {
					toastError("Transaction was cancelled.");
				} else if (
					errorMessage.includes("insufficient funds") ||
					errorMessage.includes("0x1")
				) {
					toastError(
						"Insufficient SKR balance. Please add funds and try again.",
					);
				} else if (errorMessage.includes("Simulation failed")) {
					toastError(
						"Transaction simulation failed. This may be a temporary issue — please try again.",
					);
				} else {
					toastError(`Tip failed: ${errorMessage}`);
				}
				return false;
			} finally {
				isTippingRef.current = false;
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
		sendTip,
		reset,
		isPending: state !== "idle" && state !== "success" && state !== "failed",
	};
}
