/**
 * RPC Health Provider
 * Provides a single shared RPC health check across the entire app
 * Prevents multiple components from each running their own health checks
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { checkRpcHealth } from '@/server/functions/rpc'

interface RpcHealthContextValue {
  isRpcHealthy: boolean
  isChecking: boolean
  checkHealth: () => Promise<void>
}

const RpcHealthContext = createContext<RpcHealthContextValue | undefined>(undefined)

// Health check interval: 5 minutes (reduced from 30 seconds to save API credits)
const HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
// Require 2 consecutive failures before marking as unhealthy
const FAILURE_THRESHOLD = 2

interface RpcHealthProviderProps {
  children: ReactNode
  isAuthenticated: boolean
}

/**
 * Provider that manages a single RPC health check for the entire app
 * Only one interval runs regardless of how many components need the health status
 */
export function RpcHealthProvider({ children, isAuthenticated }: RpcHealthProviderProps) {
  const [isRpcHealthy, setIsRpcHealthy] = useState(true) // Optimistically start as healthy
  const [isChecking, setIsChecking] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)
  const failureCountRef = useRef(0) // Track consecutive failures

  // Perform a single health check
  const checkHealth = useCallback(async () => {
    if (!isAuthenticated) {
      // Don't check if not authenticated
      return
    }

    setIsChecking(true)

    try {
      const result = await checkRpcHealth()
      
      if (result.healthy) {
        // RPC is healthy - reset failure count
        failureCountRef.current = 0
        if (mountedRef.current) {
          setIsRpcHealthy(true)
        }
      } else {
        // RPC check failed - increment failure count
        failureCountRef.current += 1
        console.warn('RPC health check failed:', result.error)
        
        // Only mark as unhealthy after multiple consecutive failures
        if (failureCountRef.current >= FAILURE_THRESHOLD && mountedRef.current) {
          setIsRpcHealthy(false)
        }
      }
    } catch (error) {
      // Network/request error - increment failure count
      failureCountRef.current += 1
      console.warn('RPC health check error:', error)
      
      // Only mark as unhealthy after multiple consecutive failures
      if (failureCountRef.current >= FAILURE_THRESHOLD && mountedRef.current) {
        setIsRpcHealthy(false)
      }
    } finally {
      if (mountedRef.current) {
        setIsChecking(false)
      }
    }
  }, [isAuthenticated])

  // Set up periodic health checks
  useEffect(() => {
    if (!isAuthenticated) {
      // Clear interval if not authenticated
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      // Reset to healthy state when not authenticated
      setIsRpcHealthy(true)
      return
    }

    // Perform initial check
    checkHealth()

    // Set up interval for periodic checks
    intervalRef.current = setInterval(() => {
      checkHealth()
    }, HEALTH_CHECK_INTERVAL_MS)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isAuthenticated, checkHealth])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const value: RpcHealthContextValue = {
    isRpcHealthy,
    isChecking,
    checkHealth,
  }

  return (
    <RpcHealthContext.Provider value={value}>
      {children}
    </RpcHealthContext.Provider>
  )
}

/**
 * Hook to access RPC health status
 * Use this instead of useRpcHealth directly
 */
export function useRpcHealthContext(): RpcHealthContextValue {
  const context = useContext(RpcHealthContext)
  if (context === undefined) {
    throw new Error('useRpcHealthContext must be used within RpcHealthProvider')
  }
  return context
}

export default RpcHealthProvider






















