/**
 * TanStack Query hook for PFP mint status.
 * Fetches supply, phase, price, eligibility from GET /api/v1/pfp/status.
 */

import { useQuery } from "@tanstack/react-query"
import { usePrivy } from "@privy-io/react-auth"

export interface PfpMintStatus {
	phase: "og-free" | "og-discount" | "whitelist" | "public" | "closed"
	isEligible: boolean
	mintCount: number
	supply: { total: number; minted: number; remaining: number }
	price: { lamports: number; sol: number; display: string } | null
	windows: {
		ogFreeStart: string | null; ogFreeEnd: string | null
		ogDiscountStart: string | null; ogDiscountEnd: string | null
		wlStart: string | null; wlEnd: string | null
		publicStart: string | null
	}
	collection: { name: string; description: string; imageUrl: string }
}

export function useEchoesMintInfo() {
	const { authenticated, getAccessToken } = usePrivy()

	return useQuery({
		queryKey: ["pfp-mint-status", authenticated],
		queryFn: async (): Promise<PfpMintStatus | null> => {
			const headers: HeadersInit = {}
			if (authenticated) {
				const token = await getAccessToken()
				if (token) headers.Authorization = `Bearer ${token}`
			}

			const res = await fetch("/api/v1/pfp/status", { headers })
			if (!res.ok) return null

			const json = await res.json() as { success: boolean; data?: PfpMintStatus }
			return json.success ? json.data ?? null : null
		},
		staleTime: 15_000,
		refetchInterval: 30_000,
	})
}
