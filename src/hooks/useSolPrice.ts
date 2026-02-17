import { useQuery } from '@tanstack/react-query'
import { getSolPrice } from '@/server/functions/wallets'

/**
 * Hook to get current SOL price in USD
 * Uses React Query with 60s stale time for client-side caching
 * Server also caches for 90s, so total cache is efficient
 */
export function useSolPrice() {
  return useQuery({
    queryKey: ['sol-price'],
    queryFn: async () => {
      const result = await getSolPrice()
      return result
    },
    staleTime: 60_000, // Consider fresh for 60s
    gcTime: 5 * 60_000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
  })
}
