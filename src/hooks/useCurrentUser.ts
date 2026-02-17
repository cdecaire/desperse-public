/**
 * Hook for fetching current user data from database
 * Initializes user on first login and caches user data with TanStack Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { initAuth, getCurrentUser } from '@/server/functions/auth'
import type { User } from '@/server/db/schema'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toastError } from '@/lib/toast'

export interface UseCurrentUserReturn {
  // User data from DB
  user: User | null

  // Loading states
  isLoading: boolean
  /** True when Privy auth is still initializing (distinct from user DB loading) */
  isAuthInitializing: boolean
  /** True when creating user record in DB after first login */
  isInitializing: boolean
  isFetching: boolean

  // Error state
  error: Error | null

  // Actions
  refetch: () => void
}

// Query key for current user
export const currentUserQueryKey = ['currentUser'] as const

/**
 * Hook for managing current user state
 * Handles initial user creation and ongoing data fetching
 */
export function useCurrentUser(): UseCurrentUserReturn {
  const queryClient = useQueryClient()
  const {
    isAuthenticated,
    isReady,
    privyId,
    email,
    walletAddress,
    avatarUrl,
    displayName,
    getAccessToken,
  } = useAuth()

  // Track if we've attempted initialization
  const initAttemptedRef = useRef(false)

  // Track previous privyId to detect user switches
  const [prevPrivyId, setPrevPrivyId] = useState<string | null>(null)

  // Track previous wallet address for mismatch detection
  const prevWalletAddressRef = useRef<string | null>(null)

  const navigate = useNavigate()

  // For unauthenticated users, skip running queries/mutations
  const isUserAuthenticated = isReady && isAuthenticated && !!privyId

  // Mutation for initializing user (creates or updates user in DB)
  const initMutation = useMutation({
    mutationFn: async () => {
      if (!walletAddress) {
        throw new Error('Missing required auth data')
      }

      // Get the access token for server-side verification
      const accessToken = await getAccessToken()
      if (!accessToken) {
        throw new Error('Failed to get authentication token')
      }

      return initAuth({
        data: {
          _authorization: accessToken, // Server verifies this to get privyId
          email: email || undefined,
          name: displayName || undefined,
          walletAddress,
          avatarUrl: avatarUrl || undefined,
        },
      } as never)
    },
    onSuccess: (result) => {
      if (result.success && result.user) {
        // Update the cache with the initialized user
        queryClient.setQueryData(currentUserQueryKey, result.user)
      }
    },
  })

  // Query for fetching current user data (only runs for authenticated users)
  const userQuery = useQuery({
    queryKey: currentUserQueryKey,
    queryFn: async () => {
      // Get the access token for server-side verification
      const accessToken = await getAccessToken()
      if (!accessToken) {
        console.warn('[useCurrentUser] No access token available')
        return null
      }

      const result = await getCurrentUser({
        data: {
          _authorization: accessToken, // Server verifies this to get privyId
        },
      } as never)

      if (result.success) {
        return result.user // This can be null if user not in DB yet
      }

      // If the call failed, return null
      console.warn('[useCurrentUser] getCurrentUser failed, treating as unauthenticated')
      return null
    },
    enabled: isUserAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
  })

  // Initialize user when authenticated but not in DB
  // Only run for authenticated users
  useEffect(() => {
    if (
      isUserAuthenticated &&
      !userQuery.isLoading &&
      userQuery.data === null &&
      !initAttemptedRef.current &&
      !initMutation.isPending
    ) {
      initAttemptedRef.current = true
      initMutation.mutate()
    }
  }, [
    isUserAuthenticated,
    userQuery.isLoading,
    userQuery.data,
    initMutation.isPending,
    initMutation.mutate,
  ])

  // Reset init attempt and clear user-specific cached data when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      initAttemptedRef.current = false
      // Clear user-specific queries to prevent stale data from previous user
      // Keep public queries (like profile data, feed) to avoid unnecessary refetching
      queryClient.removeQueries({
        predicate: (query) => {
          const queryKey = query.queryKey
          // Remove current user query
          if (queryKey[0] === 'currentUser') return true
          // Remove followStats queries (contain current user context)
          if (queryKey[0] === 'followStats') return true
          // Remove followers/following list queries (contain current user context)
          if (queryKey[0] === 'followersList' || queryKey[0] === 'followingList') return true
          // Keep feed queries - they use 'public' key when unauthenticated
          // Keep public profile queries (profile, userPosts, userCollections, userForSale, userLikes, userComments)
          return false
        }
      })
      // Also reset the currentUser query data to null
      queryClient.setQueryData(currentUserQueryKey, null)
      setPrevPrivyId(null)
    }
  }, [isAuthenticated, queryClient])

  // Clear cache when user switches accounts (different privyId)
  useEffect(() => {
    if (privyId && prevPrivyId && privyId !== prevPrivyId) {
      // User switched accounts - clear all cached data
      initAttemptedRef.current = false
      queryClient.clear()
    }
    setPrevPrivyId(privyId)
  }, [privyId, prevPrivyId, queryClient])

  // Handle wallet address mismatch
  const handleWalletMismatch = useCallback(async () => {
    try {
      // Show error message
      toastError('Your connected wallet doesn\'t match this account. Please sign in again with the correct wallet.')

      // Clear all cached data first
      queryClient.clear()

      // Small delay to let toast show, then redirect and reload
      setTimeout(() => {
        // Navigate to home and reload to fully reset auth state
        navigate({ to: '/' }).then(() => {
          window.location.href = '/'
        })
      }, 1000)
    } catch (error) {
      console.error('Error handling wallet mismatch:', error)
      // Fallback: just redirect to home
      navigate({ to: '/' })
    }
  }, [navigate, queryClient])

  // Wallet address mismatch detection
  useEffect(() => {
    // Only check if authenticated and we have both wallet addresses
    if (!isReady || !isAuthenticated || !walletAddress || !userQuery.data) {
      prevWalletAddressRef.current = walletAddress
      return
    }

    const dbWalletAddress = userQuery.data.walletAddress
    const currentWalletAddress = walletAddress

    // Skip if this is the first load (no previous wallet to compare)
    if (prevWalletAddressRef.current === null) {
      prevWalletAddressRef.current = currentWalletAddress

      // On first load, check for mismatch immediately
      if (dbWalletAddress && currentWalletAddress && dbWalletAddress !== currentWalletAddress) {
        console.warn('Wallet address mismatch detected on load:', {
          db: dbWalletAddress,
          current: currentWalletAddress,
        })

        handleWalletMismatch()
      }
      return
    }

    // Check if wallet address changed
    if (prevWalletAddressRef.current !== currentWalletAddress) {
      // Wallet address changed - check if it matches DB
      if (dbWalletAddress && currentWalletAddress !== dbWalletAddress) {
        console.warn('Wallet address mismatch detected:', {
          db: dbWalletAddress,
          current: currentWalletAddress,
        })

        handleWalletMismatch()
      }

      prevWalletAddressRef.current = currentWalletAddress
    }
  }, [isReady, isAuthenticated, walletAddress, userQuery.data, handleWalletMismatch])

  // For unauthenticated users or auth still initializing
  // IMPORTANT: Distinguish between "auth initializing" and "confirmed logged out"
  if (!isReady || !isAuthenticated || !privyId) {
    const isAuthInitializing = !isReady
    return {
      user: null,
      // isLoading is true while auth is initializing (prevents logged-out UI flash)
      isLoading: isAuthInitializing,
      isAuthInitializing,
      isInitializing: false,
      isFetching: false,
      error: null,
      refetch: () => Promise.resolve(null),
    }
  }

  // Compute loading states for authenticated users
  const isInitializing = initMutation.isPending
  // Only show loading state if we don't have data yet
  // This fixes the issue where isLoading stays true on page refresh even after data loads
  const isLoading = !userQuery.data && (userQuery.isLoading || isInitializing)
  const isFetching = userQuery.isFetching

  // Get error from either query or mutation
  const error = userQuery.error || initMutation.error || null

  return {
    user: userQuery.data || null,
    isLoading,
    isAuthInitializing: false, // Auth is ready if we reach here
    isInitializing,
    isFetching,
    error: error as Error | null,
    refetch: userQuery.refetch,
  }
}

export default useCurrentUser

