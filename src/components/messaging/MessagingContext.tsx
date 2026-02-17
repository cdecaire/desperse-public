/**
 * MessagingContext
 * Provides global messaging state for opening conversations from anywhere in the app
 * Also exposes Ably connection state for fallback polling
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Thread } from '@/hooks/useMessages'
import { useAblyMessages, type AblyConnectionState } from '@/hooks/useAblyMessages'

// User info for pre-selecting in new message view
export interface PendingMessageUser {
  id: string
  usernameSlug: string
  displayName: string | null
  avatarUrl: string | null
}

interface MessagingContextValue {
  // Open the messaging popover with an optional thread
  openMessaging: (thread?: Thread) => void
  // Open the messaging popover with a pre-selected user (for unlock scenarios)
  openMessagingWithUser: (user: PendingMessageUser) => void
  // Close the messaging popover
  closeMessaging: () => void
  // Current state
  isOpen: boolean
  activeThread: Thread | null
  pendingUser: PendingMessageUser | null
  // Clear the active thread (e.g., when going back to thread list)
  clearActiveThread: () => void
  // Clear the pending user
  clearPendingUser: () => void
  // Set active thread directly
  setActiveThread: (thread: Thread | null) => void
  // Ably connection state for fallback polling
  ablyConnectionState: AblyConnectionState
  shouldPollMessages: boolean
}

const MessagingContext = createContext<MessagingContextValue | null>(null)

export function MessagingProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeThread, setActiveThread] = useState<Thread | null>(null)
  const [pendingUser, setPendingUser] = useState<PendingMessageUser | null>(null)

  // Initialize Ably subscription for real-time messaging updates
  // Also get connection state for fallback polling
  const { connectionState: ablyConnectionState, shouldPoll: shouldPollMessages } = useAblyMessages()

  const openMessaging = useCallback((thread?: Thread) => {
    if (thread) {
      setActiveThread(thread)
    }
    setPendingUser(null)
    setIsOpen(true)
  }, [])

  const openMessagingWithUser = useCallback((user: PendingMessageUser) => {
    setPendingUser(user)
    setActiveThread(null)
    setIsOpen(true)
  }, [])

  const closeMessaging = useCallback(() => {
    setIsOpen(false)
    // Reset state after animation
    setTimeout(() => {
      setActiveThread(null)
      setPendingUser(null)
    }, 200)
  }, [])

  const clearActiveThread = useCallback(() => {
    setActiveThread(null)
  }, [])

  const clearPendingUser = useCallback(() => {
    setPendingUser(null)
  }, [])

  return (
    <MessagingContext.Provider
      value={{
        openMessaging,
        openMessagingWithUser,
        closeMessaging,
        isOpen,
        activeThread,
        pendingUser,
        clearActiveThread,
        clearPendingUser,
        setActiveThread,
        ablyConnectionState,
        shouldPollMessages,
      }}
    >
      {children}
    </MessagingContext.Provider>
  )
}

export function useMessaging() {
  const context = useContext(MessagingContext)
  if (!context) {
    throw new Error('useMessaging must be used within a MessagingProvider')
  }
  return context
}
