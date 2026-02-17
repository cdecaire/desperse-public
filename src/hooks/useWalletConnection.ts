/**
 * Wallet connection monitoring hook
 * Handles wallet disconnection events and state management
 */

import { useEffect, useCallback, useRef } from 'react'
import { useWallets } from '@privy-io/react-auth/solana'
import { toastError } from '@/lib/toast'

export interface UseWalletConnectionReturn {
  isWalletConnected: boolean
  onWalletDisconnect: (callback: () => void) => void
}

/**
 * Hook to monitor wallet connection state and handle disconnections
 * Provides callbacks for when wallet disconnects
 */
export function useWalletConnection(): UseWalletConnectionReturn {
  const { wallets: solanaWallets, ready } = useWallets()
  const disconnectCallbacksRef = useRef<Set<() => void>>(new Set())
  const prevWalletCountRef = useRef<number>(0)
  const hasShownDisconnectToastRef = useRef(false)

  // Check if wallet is connected
  const isWalletConnected = ready && solanaWallets.length > 0

  // Register a callback to be called on wallet disconnect
  const onWalletDisconnect = useCallback((callback: () => void) => {
    disconnectCallbacksRef.current.add(callback)
    
    // Return cleanup function
    return () => {
      disconnectCallbacksRef.current.delete(callback)
    }
  }, [])

  // Monitor wallet connection changes
  useEffect(() => {
    if (!ready) {
      return
    }

    const currentWalletCount = solanaWallets.length
    const prevWalletCount = prevWalletCountRef.current

    // Detect disconnection: had wallets, now don't
    if (prevWalletCount > 0 && currentWalletCount === 0) {
      // Show toast (only once per disconnect event)
      if (!hasShownDisconnectToastRef.current) {
        toastError('Wallet disconnected. Please reconnect to continue.')
        hasShownDisconnectToastRef.current = true
      }

      // Call all registered callbacks
      disconnectCallbacksRef.current.forEach((callback) => {
        try {
          callback()
        } catch (error) {
          console.error('Error in wallet disconnect callback:', error)
        }
      })
    }

    // Reset toast flag when wallet reconnects
    if (currentWalletCount > 0 && prevWalletCount === 0) {
      hasShownDisconnectToastRef.current = false
    }

    prevWalletCountRef.current = currentWalletCount
  }, [ready, solanaWallets.length])

  return {
    isWalletConnected,
    onWalletDisconnect,
  }
}

export default useWalletConnection

