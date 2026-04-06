/**
 * TanStack Query hook for the authenticated user's confirmed Echoes PFP mints.
 */

import { useQuery } from "@tanstack/react-query"
import { usePrivy } from "@privy-io/react-auth"

export interface UserEchoesMint {
	id: string
	nftMintAddress: string
	confirmedAt: string | null
	createdAt: string
}

export function useUserEchoesMints() {
	const { authenticated, getAccessToken } = usePrivy()

	return useQuery({
		queryKey: ["pfp-user-mints"],
		queryFn: async (): Promise<UserEchoesMint[]> => {
			const token = await getAccessToken()
			if (!token) return []

			const res = await fetch("/api/v1/pfp/mints", {
				headers: { Authorization: `Bearer ${token}` },
			})

			if (!res.ok) return []

			const json = (await res.json()) as {
				success: boolean
				data?: { mints: UserEchoesMint[] }
			}
			return json.success ? json.data?.mints ?? [] : []
		},
		enabled: authenticated,
		staleTime: 30_000,
		refetchOnMount: "always",
		refetchInterval: 60_000,
	})
}
