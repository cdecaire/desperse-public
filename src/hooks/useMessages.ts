/**
 * Messaging hooks
 * Provides access to DM threads and messages via TanStack Query
 */

import { useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import {
  getThreads,
  getOrCreateThread,
  getMessages,
  sendMessage,
  markThreadRead,
  archiveThread,
  blockInThread,
  deleteMessage,
} from '@/server/functions/messaging'
import { useAuth } from './useAuth'
import { useCurrentUser } from './useCurrentUser'

// Types for transformed thread data
export type ThreadUser = {
  id: string
  usernameSlug: string | null
  displayName: string | null
  avatarUrl: string | null
}

export type Thread = {
  id: string
  otherUser: ThreadUser
  lastMessageAt: Date | null
  lastMessagePreview: string | null
  hasUnread: boolean
  isBlocked: boolean
  isBlockedBy: boolean
  createdAt: Date
}

export type Message = {
  id: string
  threadId: string
  senderId: string
  content: string
  isDeleted: boolean
  createdAt: Date
}

// Query keys
export const threadQueryKeys = {
  all: ['threads'] as const,
  list: () => [...threadQueryKeys.all, 'list'] as const,
  detail: (id: string) => [...threadQueryKeys.all, 'detail', id] as const,
  messages: (threadId: string) => [...threadQueryKeys.all, 'messages', threadId] as const,
}

// Fallback polling interval when Ably is disconnected (30 seconds)
const FALLBACK_POLL_INTERVAL = 30 * 1000

/**
 * Hook to fetch user's thread list (paginated)
 * @param shouldPoll - Enable fallback polling when Ably is disconnected
 */
export function useThreads(shouldPoll = false) {
  const { isAuthenticated, getAuthHeaders } = useAuth()

  return useInfiniteQuery({
    queryKey: threadQueryKeys.list(),
    queryFn: async ({ pageParam }) => {
      const authHeaders = await getAuthHeaders()
      const result = await getThreads({
        data: {
          _authorization: authHeaders.Authorization,
          cursor: pageParam,
          limit: 20,
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch threads')
      }

      return {
        threads: result.threads as Thread[],
        nextCursor: result.nextCursor,
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
    // Fallback polling when Ably is disconnected
    refetchInterval: shouldPoll ? FALLBACK_POLL_INTERVAL : false,
    refetchIntervalInBackground: false,
  })
}

/**
 * Hook to get or create a thread with another user
 */
export function useGetOrCreateThread() {
  const { getAuthHeaders } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ otherUserId, contextCreatorId }: { otherUserId: string; contextCreatorId: string }) => {
      const authHeaders = await getAuthHeaders()
      const result = await getOrCreateThread({
        data: {
          _authorization: authHeaders.Authorization,
          otherUserId,
          contextCreatorId,
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to create thread')
      }

      // Transform to Thread type expected by components
      const thread: Thread = {
        id: result.thread.id,
        otherUser: result.otherUser as ThreadUser,
        lastMessageAt: result.thread.lastMessageAt ? new Date(result.thread.lastMessageAt) : null,
        lastMessagePreview: result.thread.lastMessagePreview,
        hasUnread: false,
        isBlocked: result.thread.userABlocked || result.thread.userBBlocked || false,
        isBlockedBy: false,
        createdAt: new Date(result.thread.createdAt),
      }

      return { ...result, thread }
    },
    onSuccess: () => {
      // Invalidate thread list to show new thread
      queryClient.invalidateQueries({ queryKey: threadQueryKeys.list() })
    },
  })
}

/**
 * Hook to fetch messages in a thread (paginated, infinite scroll)
 * @param threadId - The thread to fetch messages for
 * @param shouldPoll - Enable fallback polling when Ably is disconnected
 */
export function useMessages(threadId: string | null, shouldPoll = false) {
  const { isAuthenticated, getAuthHeaders } = useAuth()

  return useInfiniteQuery({
    queryKey: threadQueryKeys.messages(threadId || ''),
    queryFn: async ({ pageParam }) => {
      if (!threadId) throw new Error('No thread ID')

      const authHeaders = await getAuthHeaders()
      const result = await getMessages({
        data: {
          _authorization: authHeaders.Authorization,
          threadId,
          cursor: pageParam,
          limit: 50,
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch messages')
      }

      return {
        messages: result.messages as Message[],
        otherLastReadAt: result.otherLastReadAt,
        nextCursor: result.nextCursor,
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: isAuthenticated && !!threadId,
    staleTime: 10 * 1000, // 10 seconds
    // Fallback polling when Ably is disconnected
    refetchInterval: shouldPoll ? FALLBACK_POLL_INTERVAL : false,
    refetchIntervalInBackground: false,
  })
}

/**
 * Hook to send a message with optimistic updates
 */
export function useSendMessage() {
  const { getAuthHeaders } = useAuth()
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ threadId, content }: { threadId: string; content: string }) => {
      const authHeaders = await getAuthHeaders()
      const result = await sendMessage({
        data: {
          _authorization: authHeaders.Authorization,
          threadId,
          content,
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to send message')
      }

      return result.message as Message
    },
    onMutate: async ({ threadId, content }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: threadQueryKeys.messages(threadId) })

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData(threadQueryKeys.messages(threadId))

      // Optimistically add new message
      const optimisticMessage: Message = {
        id: `optimistic-${Date.now()}`,
        threadId,
        senderId: user?.id || '',
        content,
        isDeleted: false,
        createdAt: new Date(),
      }

      queryClient.setQueryData(
        threadQueryKeys.messages(threadId),
        (old: { pages: { messages: Message[]; otherLastReadAt: string | null; nextCursor: string | undefined }[] } | undefined) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page, index) =>
              index === 0
                ? { ...page, messages: [optimisticMessage, ...page.messages] }
                : page
            ),
          }
        }
      )

      return { previousMessages, threadId }
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          threadQueryKeys.messages(context.threadId),
          context.previousMessages
        )
      }
    },
    onSettled: (_data, _error, variables) => {
      // Refetch to ensure sync with server
      queryClient.invalidateQueries({ queryKey: threadQueryKeys.messages(variables.threadId) })
      // Update thread list preview and ordering
      queryClient.invalidateQueries({ queryKey: threadQueryKeys.list() })
    },
  })
}

/**
 * Hook to mark a thread as read
 */
export function useMarkRead() {
  const { getAuthHeaders } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (threadId: string) => {
      const authHeaders = await getAuthHeaders()
      const result = await markThreadRead({
        data: {
          _authorization: authHeaders.Authorization,
          threadId,
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to mark thread as read')
      }

      return { threadId, readAt: result.readAt }
    },
    onSuccess: ({ threadId }) => {
      // Invalidate thread list to update unread status
      queryClient.invalidateQueries({ queryKey: threadQueryKeys.list() })
      // Invalidate messages to update read receipt display
      queryClient.invalidateQueries({ queryKey: threadQueryKeys.messages(threadId) })
    },
  })
}

/**
 * Hook to archive/unarchive a thread
 */
export function useArchiveThread() {
  const { getAuthHeaders } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ threadId, archived }: { threadId: string; archived: boolean }) => {
      const authHeaders = await getAuthHeaders()
      const result = await archiveThread({
        data: {
          _authorization: authHeaders.Authorization,
          threadId,
          archived,
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to archive thread')
      }

      return { threadId, archived: result.archived }
    },
    onSuccess: () => {
      // Invalidate thread list
      queryClient.invalidateQueries({ queryKey: threadQueryKeys.list() })
    },
  })
}

/**
 * Hook to block/unblock user in a thread
 */
export function useBlockInThread() {
  const { getAuthHeaders } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ threadId, blocked }: { threadId: string; blocked: boolean }) => {
      const authHeaders = await getAuthHeaders()
      const result = await blockInThread({
        data: {
          _authorization: authHeaders.Authorization,
          threadId,
          blocked,
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to block user')
      }

      return { threadId, blocked: result.blocked }
    },
    onSuccess: () => {
      // Invalidate thread list
      queryClient.invalidateQueries({ queryKey: threadQueryKeys.list() })
    },
  })
}

/**
 * Hook to delete a message
 */
export function useDeleteMessage() {
  const { getAuthHeaders } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ messageId, threadId }: { messageId: string; threadId: string }) => {
      const authHeaders = await getAuthHeaders()
      const result = await deleteMessage({
        data: {
          _authorization: authHeaders.Authorization,
          messageId,
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete message')
      }

      return { messageId, threadId }
    },
    onSuccess: ({ threadId }) => {
      // Invalidate messages for this thread
      queryClient.invalidateQueries({ queryKey: threadQueryKeys.messages(threadId) })
    },
  })
}

/**
 * Hook to compute total unread count from thread list
 * @param shouldPoll - Enable fallback polling when Ably is disconnected
 */
export function useUnreadCount(shouldPoll = false) {
  const { data } = useThreads(shouldPoll)

  if (!data) return 0

  return data.pages.reduce((count, page) => {
    return count + page.threads.filter(t => t.hasUnread).length
  }, 0)
}
