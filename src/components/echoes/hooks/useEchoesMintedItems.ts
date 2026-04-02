/**
 * TanStack Query hook for fetching which echo indices have been minted.
 * Returns a Set<number> of minted item indices for reveal logic.
 */

import { useQuery } from "@tanstack/react-query"

interface MintedItemsResponse {
	mintedIndices: number[]
	total: number
	minted: number
}

export function useEchoesMintedItems() {
	return useQuery({
		queryKey: ["pfp-minted-items"],
		queryFn: async (): Promise<MintedItemsResponse> => {
			const res = await fetch("/api/v1/pfp/minted-items")
			if (!res.ok) {
				throw new Error("Failed to fetch minted items")
			}
			const json = (await res.json()) as {
				success: boolean
				data?: MintedItemsResponse
			}
			if (!json.success || !json.data) {
				throw new Error("Invalid response")
			}
			return json.data
		},
		staleTime: 30_000,
		refetchInterval: 60_000,
	})
}
