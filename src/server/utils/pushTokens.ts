import { db } from '@/server/db'
import { pushTokens } from '@/server/db/schema'
import { authenticateWithToken } from '@/server/auth'
import { eq, and } from 'drizzle-orm'

export async function registerPushTokenDirect(
  authToken: string,
  pushToken: string,
  platform: string = 'android'
) {
  const auth = await authenticateWithToken(authToken)
  if (!auth?.userId) {
    return { success: false, error: 'Authentication required' }
  }

  const userId = auth.userId

  // Upsert: if the same FCM token exists (even for a different user), reassign it
  // This handles device transfers and re-logins
  const existing = await db
    .select()
    .from(pushTokens)
    .where(eq(pushTokens.token, pushToken))
    .limit(1)

  if (existing.length > 0) {
    await db
      .update(pushTokens)
      .set({ userId, platform, updatedAt: new Date() })
      .where(eq(pushTokens.token, pushToken))
  } else {
    await db.insert(pushTokens).values({
      userId,
      token: pushToken,
      platform,
    })
  }

  return { success: true }
}

export async function unregisterPushTokenDirect(
  authToken: string,
  pushToken: string
) {
  const auth = await authenticateWithToken(authToken)
  if (!auth?.userId) {
    return { success: false, error: 'Authentication required' }
  }

  await db
    .delete(pushTokens)
    .where(
      and(
        eq(pushTokens.userId, auth.userId),
        eq(pushTokens.token, pushToken)
      )
    )

  return { success: true }
}

export async function getUserPushTokens(userId: string) {
  return db
    .select({ token: pushTokens.token, platform: pushTokens.platform })
    .from(pushTokens)
    .where(eq(pushTokens.userId, userId))
}

export async function deleteStaleToken(token: string) {
  await db.delete(pushTokens).where(eq(pushTokens.token, token))
}
