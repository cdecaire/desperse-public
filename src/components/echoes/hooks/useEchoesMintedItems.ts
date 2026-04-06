/**
 * TanStack Query hook for fetching which echo indices have been minted.
 * Returns minted indices + on-chain metadata for revealed items.
 */

import { useQuery } from "@tanstack/react-query"
import { setImageTokens } from "@/data/echoes-image-tokens"

export interface MintedItemMetadata {
	index: number
	name: string
	image: string
	attributes: { trait_type: string; value: string | number; display_type?: string }[]
	nftMintAddress?: string
}

interface MintedItemsResponse {
	mintedIndices: number[]
	total: number
	minted: number
	mintedMetadata: MintedItemMetadata[]
	imageTokens: Record<number, string>
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
			// Populate the global token store so image URL helpers can include tokens
			if (json.data.imageTokens) {
				setImageTokens(json.data.imageTokens)
			}
			return json.data
		},
		staleTime: 30_000,
		refetchOnMount: "always",
		refetchInterval: 60_000,
	})
}
