/**
 * Delete Post - Direct utility function
 */

import { db } from '@/server/db'
import { posts, collections, purchases } from '@/server/db/schema'
import { eq, and, count } from 'drizzle-orm'
import { authenticateWithToken } from '@/server/auth'
import { deleteMentions } from '@/server/functions/mentions'

export interface DeletePostResult {
  success: boolean
  warning?: string
  error?: string
}

export async function deletePostDirect(postId: string, token: string): Promise<DeletePostResult> {
  const auth = await authenticateWithToken(token)
  if (!auth?.userId) return { success: false, error: 'Authentication required' }

  const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1)
  if (!post) return { success: false, error: 'Post not found.' }
  if (post.userId !== auth.userId) return { success: false, error: 'You do not have permission to delete this post.' }

  let hasCollects = false
  let hasPurchases = false

  if (post.type === 'collectible') {
    const c = await db.select({ count: count() }).from(collections).where(and(eq(collections.postId, postId), eq(collections.status, 'confirmed')))
    hasCollects = (c[0]?.count || 0) > 0
  }
  if (post.type === 'edition') {
    const p = await db.select({ count: count() }).from(purchases).where(and(eq(purchases.postId, postId), eq(purchases.status, 'confirmed')))
    hasPurchases = (p[0]?.count || 0) > 0
  }

  await deleteMentions('post', postId)

  await db.update(posts).set({ isDeleted: true, deletedAt: new Date(), updatedAt: new Date() }).where(eq(posts.id, postId))

  return {
    success: true,
    warning: (hasCollects || hasPurchases)
      ? `${hasCollects ? 'Collectibles' : 'Editions'} already exist on-chain. Deleting only hides the post in Desperse.`
      : undefined,
  }
}
