/**
 * Ably subscription hook for real-time messaging updates.
 * Subscribes to user's personal channel and invalidates queries on events.
 * Exposes connection state for fallback polling when disconnected.
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import * as Ably from 'ably'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { useCurrentUser } from './useCurrentUser'
import { getAblyToken } from '@/server/functions/ably-auth'
import { threadQueryKeys } from './useMessages'

export type AblyConnectionState = 'connected' | 'disconnected' | 'connecting' | 'suspended' | 'failed'

// Event types (must match server-side types)
type AblyMessageEvent = {
  type: 'new_message'
  threadId: string
  messageId: string
  senderId: string
  createdAt: string
}

type AblyReadReceiptEvent = {
  type: 'message_read'
  threadId: string
  readerId: string
  readAt: string
}

type AblyEvent = AblyMessageEvent | AblyReadReceiptEvent

// Track auth failures across component lifecycle to prevent retry spam
const authFailureState = {
  consecutiveFailures: 0,
  lastFailureTime: 0,
  isDisabled: false,
}

// Reset failure state after successful connection or after cooldown
const AUTH_FAILURE_THRESHOLD = 3
const AUTH_COOLDOWN_MS = 60 * 1000 // 1 minute cooldown after too many failures

/**
 * Hook to subscribe to real-time messaging events.
 * Should be used once at the app level (e.g., in MessagingProvider).
 * Returns connection state for fallback polling when disconnected.
 */
export function useAblyMessages() {
  const { isAuthenticated, getAuthHeaders } = useAuth()
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()

  // Track connection state for fallback polling
  const [connectionState, setConnectionState] = useState<AblyConnectionState>('disconnected')

  // Track Ably client and channel
  const ablyRef = useRef<Ably.Realtime | null>(null)
  const channelRef = useRef<Ably.RealtimeChannel | null>(null)

  // Store getAuthHeaders in ref to avoid stale closures
  const getAuthHeadersRef = useRef(getAuthHeaders)
  getAuthHeadersRef.current = getAuthHeaders

  // Token auth callback for Ably - stable reference
  // Includes failure tracking to prevent retry spam when Ably is rate-limited
  const authCallback = useCallback(async (
    _tokenParams: Ably.TokenParams,
    callback: (error: Ably.ErrorInfo | string | null, tokenRequest: Ably.TokenRequest | null) => void
  ) => {
    // Check if we're in cooldown after too many failures
    if (authFailureState.isDisabled) {
      const timeSinceFailure = Date.now() - authFailureState.lastFailureTime
      if (timeSinceFailure < AUTH_COOLDOWN_MS) {
        // Still in cooldown - fail immediately without making a request
        callback('Ably auth temporarily disabled due to repeated failures', null)
        return
      }
      // Cooldown expired - reset and try again
      authFailureState.isDisabled = false
      authFailureState.consecutiveFailures = 0
    }

    try {
      const authHeaders = await getAuthHeadersRef.current()
      const result = await getAblyToken({
        data: {
          _authorization: authHeaders.Authorization,
        },
      } as never)

      if (result.success && result.tokenRequest) {
        // Success - reset failure count
        authFailureState.consecutiveFailures = 0
        callback(null, result.tokenRequest as Ably.TokenRequest)
      } else {
        // Auth failed - track it
        authFailureState.consecutiveFailures++
        authFailureState.lastFailureTime = Date.now()
        if (authFailureState.consecutiveFailures >= AUTH_FAILURE_THRESHOLD) {
          authFailureState.isDisabled = true
          console.warn(`[Ably] Auth disabled for ${AUTH_COOLDOWN_MS / 1000}s after ${AUTH_FAILURE_THRESHOLD} failures`)
        }
        callback(result.error || 'Failed to get token', null)
      }
    } catch (error) {
      // Request failed - track it
      authFailureState.consecutiveFailures++
      authFailureState.lastFailureTime = Date.now()
      if (authFailureState.consecutiveFailures >= AUTH_FAILURE_THRESHOLD) {
        authFailureState.isDisabled = true
        console.warn(`[Ably] Auth disabled for ${AUTH_COOLDOWN_MS / 1000}s after ${AUTH_FAILURE_THRESHOLD} failures`)
      }
      callback(error instanceof Error ? error.message : 'Token fetch failed', null)
    }
  }, []) // Empty deps - uses ref for getAuthHeaders

  // Store queryClient in a ref to avoid stale closures
  const queryClientRef = useRef(queryClient)
  queryClientRef.current = queryClient

  // Handle incoming events
  const handleMessage = useCallback((message: Ably.Message) => {
    // Parse data if it's a string (double-encoded JSON)
    let event = message.data as AblyEvent
    if (typeof message.data === 'string') {
      try {
        event = JSON.parse(message.data) as AblyEvent
      } catch {
        console.error('[Ably] Failed to parse message data')
        return
      }
    }

    if (event.type === 'new_message') {
      // New message received - refetch thread list and messages
      queryClientRef.current.refetchQueries({
        queryKey: threadQueryKeys.list(),
      })
      queryClientRef.current.refetchQueries({
        queryKey: threadQueryKeys.messages(event.threadId),
      })
    } else if (event.type === 'message_read') {
      // Read receipt received - only invalidate thread list for "Seen" indicator
      // Don't refetch messages (causes loop with markThreadRead)
      queryClientRef.current.invalidateQueries({
        queryKey: threadQueryKeys.list(),
      })
    }
  }, []) // Empty deps - uses ref for queryClient

  // Setup Ably connection
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      // Clean up if logged out
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
      if (ablyRef.current) {
        ablyRef.current.close()
        ablyRef.current = null
      }
      return
    }

    // Create Ably client with token auth
    const ably = new Ably.Realtime({
      authCallback,
      // Reconnection settings - longer timeouts to reduce retry spam
      disconnectedRetryTimeout: 15000, // 15 seconds before retry when disconnected
      suspendedRetryTimeout: 60000, // 1 minute before retry when suspended
    })

    ablyRef.current = ably

    // Subscribe to user's personal channel
    const channelName = `user:${user.id}`
    const channel = ably.channels.get(channelName)
    channelRef.current = channel

    // Subscribe to all events
    channel.subscribe('new_message', handleMessage)
    channel.subscribe('message_read', handleMessage)

    // Track all connection state changes for fallback polling
    ably.connection.on('connected', () => {
      // Reset failure state on successful connection
      authFailureState.consecutiveFailures = 0
      authFailureState.isDisabled = false
      setConnectionState('connected')
    })
    ably.connection.on('disconnected', () => {
      setConnectionState('disconnected')
    })
    ably.connection.on('connecting', () => {
      setConnectionState('connecting')
    })
    ably.connection.on('suspended', () => {
      setConnectionState('suspended')
    })
    ably.connection.on('failed', (err) => {
      console.error('[Ably] Connection failed:', err)
      setConnectionState('failed')
    })

    // Cleanup on unmount or user change
    return () => {
      channel.unsubscribe()
      ably.close()
      channelRef.current = null
      ablyRef.current = null
      setConnectionState('disconnected')
    }
  }, [isAuthenticated, user?.id, authCallback, handleMessage])

  // Return connection state for fallback polling
  // shouldPoll: true when not connected (disconnected, suspended, failed) or not authenticated
  const shouldPoll = !isAuthenticated || !user?.id || connectionState !== 'connected'

  return {
    isConnected: connectionState === 'connected',
    connectionState,
    shouldPoll,
  }
}
