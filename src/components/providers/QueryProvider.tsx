'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

interface QueryProviderProps {
  children: React.ReactNode
}

/**
 * TanStack Query provider wrapper
 * Creates a QueryClient instance for the app
 */
export function QueryProvider({ children }: QueryProviderProps) {
  // Create QueryClient instance inside component to avoid SSR issues
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we want to set a default stale time to avoid
            // refetching immediately on the client
            staleTime: 60 * 1000, // 1 minute
            // Retry with exponential backoff (max 3 retries: 1s, 2s, 4s)
            retry: (failureCount, error) => {
              // Only retry network/RPC errors, not business logic errors
              if (failureCount >= 3) return false
              
              // Check if error is retryable
              const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
              const isRetryable = 
                errorMsg.includes('network') ||
                errorMsg.includes('connection') ||
                errorMsg.includes('fetch') ||
                errorMsg.includes('rpc') ||
                errorMsg.includes('timeout') ||
                errorMsg.includes('503') ||
                errorMsg.includes('502') ||
                errorMsg.includes('504') ||
                errorMsg.includes('500')
              
              return isRetryable
            },
            retryDelay: (attemptIndex) => {
              // Exponential backoff: 1s, 2s, 4s
              return Math.min(1000 * Math.pow(2, attemptIndex), 4000)
            },
            // Don't refetch on window focus in development
            refetchOnWindowFocus: import.meta.env.PROD,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

export default QueryProvider

