/**
 * Hook for making authenticated server function calls
 * Automatically attaches Privy access token to requests
 */

import { useCallback } from 'react'
import { useAuth } from './useAuth'

/**
 * Type for a server function that accepts headers in its options
 */
type ServerFnWithHeaders<TInput, TOutput> = {
  (options: { data?: TInput; headers?: HeadersInit }): Promise<TOutput>
  (options: { data: TInput; headers?: HeadersInit }): Promise<TOutput>
}

/**
 * Hook that provides a wrapper for calling server functions with authentication
 * 
 * Usage:
 * ```tsx
 * const { callWithAuth } = useAuthenticatedFn()
 * 
 * // Call a server function with auth headers
 * const result = await callWithAuth(myServerFn, { myData: 'value' })
 * ```
 */
export function useAuthenticatedFn() {
  const { getAuthHeaders, isAuthenticated } = useAuth()

  /**
   * Call a server function with authentication headers
   * If not authenticated, still calls the function but without auth headers
   */
  const callWithAuth = useCallback(
    async <TInput, TOutput>(
      fn: ServerFnWithHeaders<TInput, TOutput>,
      data?: TInput
    ): Promise<TOutput> => {
      const headers = await getAuthHeaders()
      
      if (data !== undefined) {
        return fn({ data, headers })
      }
      return fn({ headers })
    },
    [getAuthHeaders]
  )

  /**
   * Get auth headers for manual use
   * Useful when you need more control over the request
   */
  const getHeaders = useCallback(async () => {
    return getAuthHeaders()
  }, [getAuthHeaders])

  return {
    callWithAuth,
    getHeaders,
    isAuthenticated,
  }
}

/**
 * Helper to wrap server function input with auth headers
 * Use this in components to prepare data for server function calls
 * 
 * Usage:
 * ```tsx
 * const { wrapWithAuth } = useServerFnAuth()
 * const result = await createPost(await wrapWithAuth({ ...postData }))
 * ```
 */
export function useServerFnAuth() {
  const { getAuthHeaders, isAuthenticated } = useAuth()

  /**
   * Wrap input data with authentication headers for server function calls
   */
  const wrapWithAuth = useCallback(
    async <T extends object>(data: T): Promise<{ data: T; headers: HeadersInit }> => {
      const headers = await getAuthHeaders()
      return { data, headers }
    },
    [getAuthHeaders]
  )

  return {
    wrapWithAuth,
    getAuthHeaders,
    isAuthenticated,
  }
}

export default useAuthenticatedFn

