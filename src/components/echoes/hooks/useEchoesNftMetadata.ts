/**
 * Lazily fetches off-chain metadata for a single Echoes Core NFT by mint address.
 * Used by the archive card stack to load images only for visible cards.
 */

import { useQuery } from "@tanstack/react-query"

export interface EchoesNftMetadata {
	name: string
	description: string
	image: string
	attributes: Array<{ trait_type: string; value: string | number; display_type?: string }>
}

export function useEchoesNftMetadata(mintAddress: string | null) {
	return useQuery({
		queryKey: ["pfp-metadata", mintAddress],
		queryFn: async (): Promise<EchoesNftMetadata | null> => {
			const res = await fetch(`/api/v1/pfp/metadata?mint=${mintAddress}`)
			if (!res.ok) return null

			const json = (await res.json()) as {
				success: boolean
				data?: { name: string; uri: string; metadata: EchoesNftMetadata }
			}
			return json.success ? json.data?.metadata ?? null : null
		},
		enabled: !!mintAddress,
		staleTime: 5 * 60_000,
		gcTime: 30 * 60_000,
	})
}
