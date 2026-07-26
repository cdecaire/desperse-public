import { QueryClient } from '@tanstack/react-query'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: (failureCount, error) => {
          if (failureCount >= 3) return false

          const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
          return (
            errorMsg.includes('network') ||
            errorMsg.includes('connection') ||
            errorMsg.includes('fetch') ||
            errorMsg.includes('rpc') ||
            errorMsg.includes('timeout') ||
            errorMsg.includes('503') ||
            errorMsg.includes('502') ||
            errorMsg.includes('504') ||
            errorMsg.includes('500')
          )
        },
        retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 4000),
        refetchOnWindowFocus: import.meta.env.PROD,
      },
    },
  })
}
