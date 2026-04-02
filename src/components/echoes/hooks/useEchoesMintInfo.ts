/**
 * TanStack Query hook for PFP mint status.
 * Fetches supply, phase, price, eligibility from GET /api/v1/pfp/status.
 */

import { useQuery } from "@tanstack/react-query"
import { usePrivy } from "@privy-io/react-auth"

export interface PfpMintStatus {
	phase: "whitelist" | "public" | "closed"
	isEligible: boolean
	mintCount: number
	supply: { total: number; minted: number; remaining: number }
	price: { lamports: number; sol: number; display: string } | null
	windows: { wlStart: string | null; wlEnd: string | null; publicStart: string | null }
	collection: { name: string; description: string; imageUrl: string }
}

export function useEchoesMintInfo() {
	const { authenticated, getAccessToken } = usePrivy()

	return useQuery({
		queryKey: ["pfp-mint-status"],
		queryFn: async (): Promise<PfpMintStatus | null> => {
			const token = await getAccessToken()
			if (!token) return null

			const res = await fetch("/api/v1/pfp/status", {
				headers: { Authorization: `Bearer ${token}` },
			})

			if (!res.ok) return null

			const json = await res.json() as { success: boolean; data?: PfpMintStatus }
			return json.success ? json.data ?? null : null
		},
		enabled: authenticated,
		staleTime: 15_000,
		refetchInterval: 30_000,
	})
}
