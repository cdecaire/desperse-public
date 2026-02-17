/**
 * SKR Balance Hook
 * Fetches the user's Seeker token balance directly from the RPC.
 * Lightweight client-side alternative to the full wallet overview.
 */

import { useQuery } from "@tanstack/react-query";
import { SKR_MINT } from "@/constants/tokens";

/**
 * Fetch SKR token balance for a wallet address via JSON-RPC
 */
async function fetchSkrBalance(walletAddress: string): Promise<number> {
	const heliusApiKey = import.meta.env.VITE_HELIUS_API_KEY;
	const rpcUrl = heliusApiKey
		? `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
		: "https://api.mainnet-beta.solana.com";

	const response = await fetch(rpcUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: `skr-balance-${Date.now()}`,
			method: "getTokenAccountsByOwner",
			params: [
				walletAddress,
				{ mint: SKR_MINT },
				{ encoding: "jsonParsed" },
			],
		}),
	});

	const data = await response.json();
	const accounts = data.result?.value;

	if (!Array.isArray(accounts) || accounts.length === 0) {
		return 0;
	}

	// Sum all token accounts (usually just one)
	return accounts.reduce((sum: number, acct: any) => {
		const amountStr =
			acct?.account?.data?.parsed?.info?.tokenAmount?.amount;
		const decimals =
			acct?.account?.data?.parsed?.info?.tokenAmount?.decimals;
		if (!amountStr || typeof decimals !== "number") return sum;
		return sum + Number(amountStr) / 10 ** decimals;
	}, 0);
}

/**
 * Hook to get the current user's SKR balance
 * @param walletAddress - The wallet address to check (null/undefined = disabled)
 */
export function useSkrBalance(walletAddress: string | null | undefined) {
	const { data, isLoading, error, refetch } = useQuery({
		queryKey: ["skr-balance", walletAddress],
		queryFn: () => fetchSkrBalance(walletAddress!),
		enabled: !!walletAddress,
		staleTime: 30_000, // 30 seconds
		refetchInterval: 60_000, // Refresh every 60 seconds while dialog is open
	});

	return {
		balance: data ?? 0,
		isLoading,
		error,
		refetch,
	};
}
