/**
 * RPC health check hook
 * Periodically checks RPC endpoint health and exposes status
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { checkRpcHealth } from '@/server/functions/rpc'

export interface UseRpcHealthReturn {
  isRpcHealthy: boolean
  isChecking: boolean
  checkHealth: () => Promise<void>
}

const HEALTH_CHECK_INTERVAL_MS = 30_000 // 30 seconds
// Require 2 consecutive failures before marking as unhealthy (prevents false positives)
const FAILURE_THRESHOLD = 2

/**
 * Hook to monitor RPC health
 * Checks RPC endpoint every 30 seconds while authenticated
 */
export function useRpcHealth(isAuthenticated: boolean): UseRpcHealthReturn {
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

  return {
    isRpcHealthy,
    isChecking,
    checkHealth,
  }
}

export default useRpcHealth

