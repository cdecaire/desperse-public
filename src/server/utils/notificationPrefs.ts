/**
 * Per-type notification preferences.
 *
 * Used by both:
 * - In-app notification creation (gates `notifications.insert`)
 * - Push delivery (gates `sendPushNotification` / FCM/APNs dispatch)
 *
 * Single source of truth so the iOS Settings → Notifications toggle
 * silences the type everywhere — Notifications screen, bell badge, push.
 *
 * Moderation types (`content_hidden`, `content_deleted`) bypass — not
 * user-configurable.
 */

import { db } from '@/server/db'
import { users } from '@/server/db/schema'
import { eq, inArray } from 'drizzle-orm'

export type NotificationType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'collect'
  | 'purchase'
  | 'mention'
  | 'message'
  | 'content_hidden'
  | 'content_deleted'

const PREF_KEY_BY_TYPE: Partial<Record<NotificationType, string>> = {
  like: 'likes',
  comment: 'comments',
  follow: 'follows',
  collect: 'collects',
  purchase: 'purchases',
  mention: 'mentions',
  message: 'messages',
}

/**
 * Always-on types (moderation) bypass the toggle entirely.
 */
function isAlwaysOn(type: NotificationType): boolean {
  return type === 'content_hidden' || type === 'content_deleted'
}

/**
 * Returns true when the recipient has this notification type enabled,
 * or has not explicitly disabled it (defaults to enabled when prefs
 * are missing — preserves legacy behavior for users who haven't
 * touched any toggles).
 *
 * Single-recipient form. For batch queries (e.g. mentions with N
 * recipients) use `getEnabledRecipients` to avoid N+1 selects.
 */
export async function isNotificationTypeEnabled(
  userId: string,
  type: NotificationType
): Promise<boolean> {
  if (isAlwaysOn(type)) return true
  const prefKey = PREF_KEY_BY_TYPE[type]
  if (!prefKey) return true

  const [user] = await db
    .select({ preferences: users.preferences })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  return readPrefFlag(user?.preferences, prefKey)
}

/**
 * Batch form — one SELECT for all recipients. Returns the set of user
 * IDs that have the type enabled. Use over the per-id loop when the
 * call site knows it'll check >1 recipient (e.g. processMentions).
 */
export async function getEnabledRecipients(
  userIds: string[],
  type: NotificationType
): Promise<Set<string>> {
  if (userIds.length === 0) return new Set()
  if (isAlwaysOn(type)) return new Set(userIds)
  const prefKey = PREF_KEY_BY_TYPE[type]
  if (!prefKey) return new Set(userIds)

  const rows = await db
    .select({ id: users.id, preferences: users.preferences })
    .from(users)
    .where(inArray(users.id, userIds))

  const enabled = new Set<string>()
  for (const row of rows) {
    if (readPrefFlag(row.preferences, prefKey)) {
      enabled.add(row.id)
    }
  }
  return enabled
}

function readPrefFlag(preferences: unknown, prefKey: string): boolean {
  const notifPrefs = (preferences as any)?.notifications
  if (!notifPrefs) return true
  return notifPrefs[prefKey] !== false
}
