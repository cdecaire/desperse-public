/**
 * Profile Query Hooks
 * Handles fetching profile data, posts, collections, for-sale listings, follow stats, and follow actions
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getUserBySlug,
  getUserPosts,
  getUserCollections,
  getUserForSale,
  getCollectorsList,
  updateProfile,
  uploadAvatar,
  uploadHeaderBg,
} from '@/server/functions/profile'
import { getFollowStats, followUser, unfollowUser, getFollowersList, getFollowingList } from '@/server/functions/follows'
import { getUserLikes } from '@/server/functions/likes'
import { getUserComments } from '@/server/functions/comments'
import { currentUserQueryKey, useCurrentUser } from './useCurrentUser'
import { useAuth } from './useAuth'

/**
 * Fetch profile user by slug
 */
export function useProfileUser(slug: string | undefined) {
  return useQuery({
    queryKey: ['profile', slug],
    queryFn: async () => {
      const result = await getUserBySlug({ data: { slug: slug! } } as never)
      if (!result.success) {
        throw new Error(result.error || 'User not found')
      }
      return result
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch follow stats for a user
 */
export function useFollowStats(userId: string | undefined, currentUserId: string | undefined) {
  return useQuery({
    queryKey: ['followStats', userId, currentUserId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required')
      
      const result = await getFollowStats({
        data: {
          userId,
          currentUserId: currentUserId || undefined,
        },
      } as never)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch follow stats')
      }
      
      return {
        followerCount: result.followerCount,
        followingCount: result.followingCount,
        isFollowing: result.isFollowing,
      }
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Fetch posts for a user's profile with infinite scroll
 */
export function useUserPosts(userId: string | undefined) {
  const { user: currentUser } = useCurrentUser()

  return useInfiniteQuery({
    queryKey: ['userPosts', userId, currentUser?.id],
    queryFn: async ({ pageParam }) => {
      if (!userId) throw new Error('User ID required')

      const result = await getUserPosts({
        data: {
          userId,
          limit: 20,
          cursor: pageParam,
          currentUserId: currentUser?.id,
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch user posts')
      }

      return {
        posts: result.posts,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Fetch collected items for a user's profile with infinite scroll
 */
export function useUserCollections(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['userCollections', userId],
    queryFn: async ({ pageParam }) => {
      if (!userId) throw new Error('User ID required')

      const result = await getUserCollections({
        data: {
          userId,
          limit: 20,
          cursor: pageParam,
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch collections')
      }

      return {
        posts: result.posts,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Follow/unfollow mutation hook
 */
export function useFollowMutation(targetUserId: string, currentUserId: string) {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()
  
  return useMutation({
    mutationFn: async ({ action }: { action: 'follow' | 'unfollow' }) => {
      const authHeaders = await getAuthHeaders()
      const authorization = authHeaders.Authorization
      if (action === 'follow') {
        const result = await followUser({
          data: {
            followingId: targetUserId,
            _authorization: authorization,
          },
        } as never)
        if (!result.success) {
          throw new Error(result.error || 'Failed to follow user')
        }
        return result
      } else {
        const result = await unfollowUser({
          data: {
            followingId: targetUserId,
            _authorization: authorization,
          },
        } as never)
        if (!result.success) {
          throw new Error(result.error || 'Failed to unfollow user')
        }
        return result
      }
    },
    onMutate: async ({ action }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['followStats', targetUserId] })
      
      // Snapshot previous value
      const previousStats = queryClient.getQueryData(['followStats', targetUserId, currentUserId])
      
      // Optimistically update
      queryClient.setQueryData(
        ['followStats', targetUserId, currentUserId],
        (old: { followerCount: number; followingCount: number; isFollowing: boolean } | undefined) => {
          if (!old) return old
          return {
            ...old,
            isFollowing: action === 'follow',
            followerCount: action === 'follow' 
              ? old.followerCount + 1 
              : Math.max(0, old.followerCount - 1),
          }
        }
      )
      
      return { previousStats }
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousStats) {
        queryClient.setQueryData(
          ['followStats', targetUserId, currentUserId],
          context.previousStats
        )
      }
    },
    onSettled: () => {
      // Invalidate to refetch
      queryClient.invalidateQueries({ queryKey: ['followStats', targetUserId] })
      // Also invalidate feed queries since following feed content changes
      queryClient.invalidateQueries({ queryKey: ['feed', 'following'] })
      // Invalidate followers list queries (since isFollowingBack status changes)
      queryClient.invalidateQueries({ queryKey: ['followersList'] })
    },
  })
}

/**
 * Fetch for-sale editions for a user's profile with infinite scroll
 */
export function useUserForSale(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['userForSale', userId],
    queryFn: async ({ pageParam }) => {
      if (!userId) throw new Error('User ID required')

      const result = await getUserForSale({
        data: {
          userId,
          limit: 20,
          cursor: pageParam,
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch editions for sale')
      }

      return {
        posts: result.posts,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    enabled: !!userId,
    staleTime: 60 * 1000,
  })
}

/**
 * Fetch liked posts for a user's profile
 */
export function useUserLikes(userId: string | undefined) {
  return useQuery({
    queryKey: ['userLikes', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required')
      
      const result = await getUserLikes({
        data: {
          userId,
          limit: 50,
        },
      } as never)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch liked posts')
      }
      
      return result.posts
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Get all posts a user has commented on
 */
export function useUserComments(userId: string | undefined) {
  return useQuery({
    queryKey: ['userComments', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required')
      
      const result = await getUserComments({
        data: {
          userId,
          limit: 50,
        },
      } as never)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch commented posts')
      }
      
      return result.posts
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Update profile mutation
 */
export function useProfileUpdate() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()
  return useMutation({
    mutationFn: async (payload: {
      displayName?: string
      bio?: string
      avatarUrl?: string | null
      headerBgUrl?: string | null
      link?: string | null
      slug?: string
    }) => {
      const authHeaders = await getAuthHeaders()
      const authorization = authHeaders.Authorization
      const result = await updateProfile({ data: { ...payload, _authorization: authorization } } as never)
      if (!result.success) {
        const error = result.error || 'Failed to update profile'
        const status = (result as { status?: number }).status
        const nextUsernameChangeAt = (result as { nextUsernameChangeAt?: string | Date }).nextUsernameChangeAt
        const err: Error & { status?: number; nextUsernameChangeAt?: string | Date } = new Error(error)
        err.status = status
        err.nextUsernameChangeAt = nextUsernameChangeAt
        throw err
      }
      return {
        user: result.user,
        nextUsernameChangeAt: (result as { nextUsernameChangeAt?: string | Date }).nextUsernameChangeAt,
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile', data.user.slug] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: currentUserQueryKey })
    },
  })
}

/**
 * Upload avatar (file or URL) mutation
 */
export function useAvatarUpload(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (
      payload:
        | { fileData: string; fileName: string; mimeType: string; fileSize: number }
        | { url: string }
    ) => {
      if (!userId) throw new Error('User ID required')
      const result = await uploadAvatar({ data: { userId, ...payload } } as never)
      if (!result.success) {
        const error = result.error || 'Failed to upload avatar'
        const status = (result as { status?: number }).status
        const err: Error & { status?: number } = new Error(error)
        err.status = status
        throw err
      }
      return result.url
    },
    onSuccess: () => {
      // Invalidate profile queries to refresh avatar
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['profile', userId] })
    },
  })
}

/**
 * Upload header background (file or URL) mutation
 */
export function useHeaderBgUpload(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (
      payload:
        | { fileData: string; fileName: string; mimeType: string; fileSize: number }
        | { url: string }
    ) => {
      if (!userId) throw new Error('User ID required')
      const result = await uploadHeaderBg({ data: { userId, ...payload } } as never)
      if (!result.success) {
        const error = result.error || 'Failed to upload header background'
        const status = (result as { status?: number }).status
        const err: Error & { status?: number } = new Error(error)
        err.status = status
        throw err
      }
      return result.url
    },
    onSuccess: () => {
      // Invalidate profile queries to refresh header background
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['profile', userId] })
    },
  })
}

/**
 * Fetch followers list for a user
 */
export function useFollowersList(userId: string | undefined, currentUserId: string | undefined) {
  return useQuery({
    queryKey: ['followersList', userId, currentUserId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required')
      
      const result = await getFollowersList({
        data: {
          userId,
          currentUserId: currentUserId || undefined,
        },
      } as never)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch followers list')
      }
      
      return result.followers
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Fetch following list for a user
 */
export function useFollowingList(userId: string | undefined, currentUserId: string | undefined) {
  return useQuery({
    queryKey: ['followingList', userId, currentUserId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required')

      const result = await getFollowingList({
        data: {
          userId,
          currentUserId: currentUserId || undefined,
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch following list')
      }

      return result.following
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Fetch collectors list for a user (users who collected their creations)
 */
export function useCollectorsList(userId: string | undefined, currentUserId: string | undefined) {
  return useQuery({
    queryKey: ['collectorsList', userId, currentUserId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required')

      const result = await getCollectorsList({
        data: {
          userId,
          currentUserId: currentUserId || undefined,
        },
      } as never)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch collectors list')
      }

      return result.collectors
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

export default useProfileUser

