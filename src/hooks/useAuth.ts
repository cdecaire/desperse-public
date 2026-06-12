/**
 * Authentication hook for Privy auth state
 * Wraps Privy's usePrivy hook with app-specific logic
 */

import { usePrivy } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth/solana'
import { useCallback, useMemo } from 'react'

export interface UseAuthReturn {
  // Auth state
  isAuthenticated: boolean
  isLoading: boolean
  isReady: boolean
  
  // User info from Privy
  privyId: string | null
  email: string | null
  walletAddress: string | null
  avatarUrl: string | null
  displayName: string | null
  
  // Actions
  login: () => void
  logout: () => Promise<void>
  
  // Token access for server function calls
  getAccessToken: () => Promise<string | null>
  getAuthHeaders: () => Promise<Record<string, string>>
}

/**
 * Hook for accessing Privy authentication state
 * Provides simplified interface for common auth operations
 */
export function useAuth(): UseAuthReturn {
  const {
    ready,
    authenticated,
    user,
    login,
    logout: privyLogout,
    getAccessToken: privyGetAccessToken,
  } = usePrivy()
  
  const { wallets } = useWallets()

  // Get the Solana wallet address
  // Privy can have multiple wallets, we prioritize the embedded (Privy-created) wallet
  const solanaWallet = useMemo(() => {
    if (!user?.linkedAccounts) return null

    // First try to find the EMBEDDED Solana wallet (walletClientType === 'privy')
    // This is the wallet Privy creates for the user - should be the primary wallet
    const embeddedSolana = user.linkedAccounts.find(
      (account) =>
        account.type === 'wallet' &&
        account.chainType === 'solana' &&
        'walletClientType' in account &&
        account.walletClientType === 'privy'
    )
    if (embeddedSolana && 'address' in embeddedSolana) {
      return embeddedSolana.address
    }

    // Fall back to any linked Solana wallet (including external wallets)
    const linkedSolana = user.linkedAccounts.find(
      (account) => account.type === 'wallet' && account.chainType === 'solana'
    )
    if (linkedSolana && 'address' in linkedSolana) {
      return linkedSolana.address
    }

    // Fall back to any connected Solana wallet from useWallets()
    return wallets[0]?.address || null
  }, [user?.linkedAccounts, wallets])

  // Extract user info from Privy
  const privyId = user?.id || null
  
  const email = useMemo(() => {
    if (!user?.linkedAccounts) return null
    const emailAccount = user.linkedAccounts.find(a => a.type === 'email')
    return emailAccount && 'address' in emailAccount ? emailAccount.address : null
  }, [user?.linkedAccounts])

  const avatarUrl = useMemo(() => {
    if (!user?.linkedAccounts) return null
    // Try to get avatar from social accounts (Google, Twitter, etc.)
    const socialAccount = user.linkedAccounts.find(
      a => a.type === 'google_oauth' || a.type === 'twitter_oauth'
    )
    // @ts-expect-error - Privy types don't include all properties
    return socialAccount?.profilePictureUrl || null
  }, [user?.linkedAccounts])

  const displayName = useMemo(() => {
    if (!user?.linkedAccounts) return null
    // Try to get name from social accounts
    const socialAccount = user.linkedAccounts.find(
      a => a.type === 'google_oauth' || a.type === 'twitter_oauth'
    )
    return socialAccount?.name || null
  }, [user?.linkedAccounts])

  const handleLogout = useCallback(async () => {
    try {
      await privyLogout()
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }, [privyLogout])

  /**
   * Get the current Privy access token
   * Returns null if not authenticated or token unavailable
   */
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!authenticated || !ready) {
      return null
    }
    try {
      const token = await privyGetAccessToken()
      return token
    } catch (error) {
      console.error('Failed to get access token:', error)
      return null
    }
  }, [authenticated, ready, privyGetAccessToken])

  /**
   * Get headers object with Authorization: Bearer token
   * Use this when making authenticated server function calls
   */
  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const token = await getAccessToken()
    if (!token) return {}
    return { Authorization: `Bearer ${token}` }
  }, [getAccessToken])

  return {
    isAuthenticated: authenticated,
    isLoading: !ready,
    isReady: ready,
    privyId,
    email,
    walletAddress: solanaWallet,
    avatarUrl,
    displayName,
    login,
    logout: handleLogout,
    getAccessToken,
    getAuthHeaders,
  }
}

export default useAuth

