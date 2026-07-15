import { queryOptions } from '@tanstack/react-query'
import { getPost } from '@/server/functions/posts'

type PostQueryKey = readonly ['post', string, 'public' | 'viewer', string]

export const postQueryKeys = {
  all: (postId: string) => ['post', postId] as const,
  public: (postId: string): PostQueryKey => ['post', postId, 'public', 'anonymous'],
  viewer: (postId: string, privyId: string): PostQueryKey => ['post', postId, 'viewer', privyId],
}

async function fetchPost(postId: string, authorization?: string) {
  const result = await getPost({
    data: {
      postId,
      ...(authorization ? { _authorization: authorization } : {}),
    },
  } as any)

  if (!result.success) {
    throw new Error(result.error || 'Post not found')
  }

  return {
    post: result.post,
    user: result.user,
  }
}

export type PostQueryData = Awaited<ReturnType<typeof fetchPost>>

export function publicPostQueryOptions(postId: string) {
  return queryOptions({
    queryKey: postQueryKeys.public(postId),
    queryFn: () => fetchPost(postId),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export function viewerPostQueryOptions(
  postId: string,
  privyId: string,
  getAuthorization: () => Promise<string | null>,
) {
  return queryOptions({
    queryKey: postQueryKeys.viewer(postId, privyId),
    queryFn: async () => {
      const authorization = await getAuthorization()
      if (!authorization) {
        throw new Error('Authentication unavailable')
      }
      return fetchPost(postId, authorization)
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}
