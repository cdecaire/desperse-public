/**
 * Arweave Balance Hook
 * Manages Turbo credit balance, top-ups, and credit sharing via TanStack Query.
 * Uses the client-side Turbo utility from @/lib/arweave/turbo-client.
 */

import { useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallets } from "@privy-io/react-auth/solana";
import {
	createTurboClientFromPrivy,
	topUpWithSol,
	shareCreditsWithDesperse,
	getBalance,
} from "@/lib/arweave/turbo-client";
import type { TurboClient } from "@/lib/arweave/turbo-client";

/**
 * Hook for managing Arweave/Turbo credit balance and operations.
 *
 * Provides:
 * - Real-time balance fetching (auto-refreshes when wallet is connected)
 * - SOL top-up mutation
 * - Credit sharing mutation (shares with Desperse platform wallet)
 *
 * Balance only fetches when a Solana wallet is connected via Privy.
 */
export function useArweaveBalance() {
	const { wallets, ready } = useWallets();
	const queryClient = useQueryClient();
	const turboClientRef = useRef<TurboClient | null>(null);

	const wallet = wallets[0] ?? null;
	const walletAddress = wallet?.address ?? null;

	/**
	 * Get or create a cached Turbo client for the current wallet.
	 * Recreates if wallet address changes.
	 */
	const getTurboClient = useCallback(async (): Promise<TurboClient> => {
		if (!wallet) {
			throw new Error("No wallet connected");
		}

		// Reuse cached client if wallet hasn't changed
		if (turboClientRef.current) {
			return turboClientRef.current;
		}

		// Privy's ConnectedStandardSolanaWallet is compatible at runtime but TypeScript
		// can't reconcile the signMessage overload signatures, so we cast through unknown
		// biome-ignore lint: safe cast — Privy wallet shape matches at runtime
		const client = await createTurboClientFromPrivy(wallet as any);
		turboClientRef.current = client;
		return client;
	}, [wallet]);

	// Clear cached client when wallet changes
	const prevAddressRef = useRef<string | null>(null);
	if (walletAddress !== prevAddressRef.current) {
		turboClientRef.current = null;
		prevAddressRef.current = walletAddress;
	}

	// Fetch balance
	const {
		data: balance,
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: ["arweave-balance", walletAddress],
		queryFn: async () => {
			const turbo = await getTurboClient();
			return getBalance(turbo);
		},
		enabled: ready && !!walletAddress,
		staleTime: 30_000, // 30 seconds
		refetchInterval: 60_000, // Refresh every 60 seconds
	});

	// Top-up mutation: convert SOL to Turbo credits
	const topUpMutation = useMutation({
		mutationFn: async (amountSol: number) => {
			const turbo = await getTurboClient();
			return topUpWithSol(turbo, amountSol);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["arweave-balance", walletAddress],
			});
		},
	});

	// Share credits mutation: share winc with Desperse platform wallet
	const shareCreditsMutation = useMutation({
		mutationFn: async (wincAmount: string) => {
			const turbo = await getTurboClient();
			return shareCreditsWithDesperse(turbo, wincAmount);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["arweave-balance", walletAddress],
			});
		},
	});

	return {
		/** Current Turbo credit balance in winc, or null if not loaded */
		balance: balance ?? null,
		/** Whether the initial balance fetch is loading */
		isLoading,
		/** Error from the balance fetch, if any */
		error: error ?? null,
		/** Top up Turbo credits by paying SOL */
		topUp: topUpMutation.mutateAsync,
		/** Whether a top-up is in progress */
		isTopUpPending: topUpMutation.isPending,
		/** Share credits with the Desperse platform wallet */
		shareCredits: shareCreditsMutation.mutateAsync,
		/** Whether a credit share is in progress */
		isSharePending: shareCreditsMutation.isPending,
		/** Manually refetch the balance */
		refetch,
	};
}
