import { db } from '@/server/db'
import { users } from '@/server/db/schema'
import { getUserPushTokens, deleteStaleToken } from './pushTokens'
import { getApnsJwt, clearApnsJwtCache } from './apns-jwt'
import { isNotificationTypeEnabled } from './notificationPrefs'
import { getUnreadNotificationCountDirect } from './notifications'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'
import http2 from 'http2'

// Cache the access token to avoid re-signing JWT on every call
let cachedAccessToken: { token: string; expiresAt: number } | null = null

/**
 * Get a Google OAuth2 access token using the service account JWT flow.
 * Uses Node.js native crypto — no firebase-admin dependency.
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 60_000) {
    return cachedAccessToken.token
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON env var not set')
  }

  const serviceAccount = JSON.parse(serviceAccountJson)
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n')
  }

  const now = Math.floor(Date.now() / 1000)
  const expiry = now + 3600 // 1 hour

  // Build JWT header and claim set
  const header = { alg: 'RS256', typ: 'JWT' }
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: expiry,
  }

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedClaims = Buffer.from(JSON.stringify(claimSet)).toString('base64url')
  const signatureInput = `${encodedHeader}.${encodedClaims}`

  // Sign with RSA-SHA256 using Node.js native crypto
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(signatureInput)
  const signature = signer.sign(serviceAccount.private_key, 'base64url')

  const jwt = `${signatureInput}.${signature}`

  // Exchange JWT for access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to get access token: ${response.status} ${errorText}`)
  }

  const data = await response.json() as { access_token: string; expires_in: number }

  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }

  return data.access_token
}

/**
 * Get the Firebase project ID from the service account.
 */
function getProjectId(): string {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON env var not set')
  }
  return JSON.parse(serviceAccountJson).project_id
}

import type { NotificationType } from './notificationPrefs'

interface PushPayload {
  type: NotificationType
  title: string
  body: string
  deepLink: string
  actorId?: string
  /// Auto-resolved from `actorId` when provided. iOS NSE renders this
  /// thumbnail next to the notification text. Used as the fallback when
  /// `imageUrl` is omitted.
  actorAvatarUrl?: string
  /// Preferred image — set for post-related notifications so the post
  /// thumbnail renders instead of the actor avatar.
  imageUrl?: string
}

interface PushOptions {
  /// Caller has already gated this delivery on
  /// `isNotificationTypeEnabled` (e.g. immediately before
  /// `notifications.insert`). Skips the redundant SELECT inside
  /// `sendPushNotification` — halves DB round-trips per notification.
  prefChecked?: boolean
}

/**
 * Trim user-provided text to a max length suitable for an APNs alert
 * body. Hard limit per character (not byte) so multi-byte content
 * stays under the 4KB payload ceiling. Adds an ellipsis when trimmed.
 */
export function truncate(text: string, max: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return trimmed.slice(0, max - 1).trimEnd() + '…'
}

/**
 * Pick the image rendered next to the iOS notification. Post media wins
 * when present (more useful context for like/comment/collect/purchase);
 * actor avatar is the fallback for follow/mention/message.
 *
 * Routes through the Vercel image proxy so the NSE downloads a small
 * thumbnail instead of the original media — slow connections still get
 * the notification thumbnail attached within the NSE's 30s budget.
 */
function pickNotificationImageUrl(payload: PushPayload): string | undefined {
  const raw = payload.imageUrl ?? payload.actorAvatarUrl
  if (!raw) return undefined
  return getOptimizedImageUrl(raw, 640)
}

/**
 * Build a Vercel image-proxy URL when the source matches the allowed
 * remote pattern; otherwise pass through untouched. Mirrors the
 * client-side `imageUrl.ts` helper without importing it (avoids
 * pulling client lib into server bundle).
 */
function getOptimizedImageUrl(url: string, width: number): string {
  // Already proxied — leave as-is
  if (url.includes('/_vercel/image?')) return url
  // Format types the proxy can't handle
  const lower = url.toLowerCase()
  if (lower.includes('.gif') || lower.includes('.svg')) return url
  // Only proxy our blob storage CDN
  if (!url.includes('.blob.vercel-storage.com')) return url
  return `https://desperse.com/_vercel/image?url=${encodeURIComponent(url)}&w=${width}&q=75`
}

// `isNotificationTypeEnabled` lives in `notificationPrefs.ts` so the
// in-app notification insert and the push dispatch share one source of
// truth. Both surfaces respect the same per-type toggles.

/**
 * Send a push notification to a user's registered devices.
 * Uses FCM HTTP v1 API directly with Node.js native crypto.
 */
export async function sendPushNotification(
  recipientUserId: string,
  payload: PushPayload,
  options: PushOptions = {}
) {
  // Skip the prefs check when the caller already gated immediately
  // before `notifications.insert`. Halves DB round-trips per
  // notification creation.
  if (!options.prefChecked) {
    const enabled = await isNotificationTypeEnabled(
      recipientUserId,
      payload.type
    )
    if (!enabled) return
  }

  // Get user's registered push tokens
  const tokens = await getUserPushTokens(recipientUserId)
  if (tokens.length === 0) return

  // Auto-resolve actor avatar if actorId provided but no explicit avatarUrl
  if (payload.actorId && !payload.actorAvatarUrl) {
    try {
      const [actor] = await db
        .select({ avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.id, payload.actorId))
        .limit(1)
      if (actor?.avatarUrl) {
        payload.actorAvatarUrl = actor.avatarUrl
      }
    } catch {
      // Non-critical, continue without avatar
    }
  }

  // Lazily acquire FCM access token only if we have Android tokens —
  // pure iOS deployments shouldn't fail when FCM env vars aren't set.
  const hasAndroid = tokens.some(t => t.platform === 'android')
  const fcmAccessToken = hasAndroid ? await getAccessToken() : null
  const fcmProjectId = hasAndroid ? getProjectId() : null

  // Resolve unread count once for the APNs `badge` field. iOS silently
  // drops badge updates without it, so the home-screen icon never moves
  // off zero. Fetched only when at least one iOS token is present.
  const hasIos = tokens.some(t => t.platform === 'ios')
  const badgeCount = hasIos
    ? (await getUnreadNotificationCountDirect(recipientUserId).catch(() => ({ count: 0 }))).count
    : 0

  // Pool APNs HTTP/2 sessions per host for this dispatch — Apple
  // explicitly supports request multiplexing on a single connection,
  // so a user with N iOS devices on the same env hits one TCP/TLS/H2
  // handshake instead of N. Sessions are closed after fanout.
  const apnsSessions = new Map<string, http2.ClientHttp2Session>()

  await Promise.allSettled(
    tokens.map(async t => {
      try {
        if (t.platform === 'ios') {
          await sendApnsNotification(t.token, t.environment, payload, apnsSessions, badgeCount)
        } else {
          await sendFcmNotification(t.token, fcmAccessToken!, fcmProjectId!, payload)
        }
      } catch (error: any) {
        console.warn(
          `[push] Failed to send to token ${t.token.slice(0, 10)}...:`,
          error?.message || error
        )
      }
    })
  )

  for (const session of apnsSessions.values()) {
    session.close()
  }
}

/**
 * Send a push to a single FCM (Android) device token.
 * Extracted from the original inline loop so the dispatcher can branch
 * cleanly between FCM and APNs.
 */
async function sendFcmNotification(
  token: string,
  accessToken: string,
  projectId: string,
  payload: PushPayload
) {
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          data: {
            type: payload.type,
            title: payload.title,
            body: payload.body,
            deepLink: payload.deepLink,
            ...(payload.actorAvatarUrl
              ? { actorAvatarUrl: payload.actorAvatarUrl }
              : {}),
          },
          android: { priority: 'high' },
        },
      }),
    }
  )

  if (response.ok) return

  const errorData = await response.json().catch(() => ({})) as any
  const errorCode = errorData?.error?.details?.[0]?.errorCode || errorData?.error?.status

  if (
    errorCode === 'UNREGISTERED' ||
    errorCode === 'INVALID_ARGUMENT' ||
    response.status === 404
  ) {
    console.warn(`[push] Removing stale FCM token: ${token.slice(0, 10)}...`)
    await deleteStaleToken(token).catch(() => {})
  } else {
    console.warn(
      `[push] FCM send failed for ${token.slice(0, 10)}...: ${response.status}`,
      JSON.stringify(errorData?.error || {})
    )
  }
}

type ApnsEnvironment = 'sandbox' | 'production'

const APNS_HOSTS: Record<ApnsEnvironment, string> = {
  sandbox: 'api.sandbox.push.apple.com',
  production: 'api.push.apple.com',
}

/**
 * Send a push to a single APNs (iOS) device token via HTTP/2. Sessions
 * are pooled per host across the dispatch loop so users with multiple
 * iOS devices share one TCP/TLS/H2 handshake.
 *
 * Stale tokens (410, BadDeviceToken, Unregistered, DeviceTokenNotForTopic)
 * are pruned. ExpiredProviderToken / InvalidProviderToken bust the JWT
 * cache and retry once.
 */
async function sendApnsNotification(
  token: string,
  environment: string | null,
  payload: PushPayload,
  sessionPool: Map<string, http2.ClientHttp2Session>,
  badge: number
) {
  const bundleId = process.env.APNS_BUNDLE_ID
  if (!bundleId) {
    console.warn('[push] APNS_BUNDLE_ID not set, skipping iOS dispatch')
    return
  }

  // Default to production when null — historical Android rows have null
  // environment, but at this point we know platform=ios.
  const env: ApnsEnvironment = environment === 'sandbox' ? 'sandbox' : 'production'
  const host = APNS_HOSTS[env]

  const imageUrl = pickNotificationImageUrl(payload)

  const apsBody = {
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: 'default',
      badge,
      'thread-id': payload.type,
      // mutable-content fires the iOS Notification Service Extension,
      // which downloads + attaches the image. Skip when there's no
      // image so the system delivers the alert without the round-trip.
      ...(imageUrl ? { 'mutable-content': 1 } : {}),
    },
    type: payload.type,
    deepLink: payload.deepLink,
    ...(imageUrl ? { imageUrl } : {}),
  }

  const send = async (): Promise<{ status: number; body: string }> => {
    const session = getApnsSession(sessionPool, host)
    const jwt = getApnsJwt()

    return new Promise((resolve, reject) => {
      const req = session.request({
        ':method': 'POST',
        ':path': `/3/device/${token}`,
        'authorization': `bearer ${jwt}`,
        'apns-topic': bundleId,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json',
      })
      let responseStatus = 0
      let responseBody = ''
      req.on('response', headers => { responseStatus = Number(headers[':status']) || 0 })
      req.on('data', chunk => { responseBody += chunk })
      req.on('end', () => resolve({ status: responseStatus, body: responseBody }))
      req.on('error', reject)
      req.end(JSON.stringify(apsBody))
    })
  }

  let result: { status: number; body: string }
  try {
    result = await send()
  } catch (error: any) {
    console.warn('[push] APNs JWT mint or session error:', error?.message || error)
    return
  }

  if (result.status === 200) return

  let reason: string
  try { reason = JSON.parse(result.body).reason } catch { reason = result.body }

  // ExpiredProviderToken is benign — Apple recommends minting a fresh
  // JWT and retrying. Bound to one retry so a persistent auth issue
  // doesn't spin.
  if (result.status === 403 &&
      (reason === 'ExpiredProviderToken' || reason === 'InvalidProviderToken')) {
    clearApnsJwtCache()
    try {
      result = await send()
      if (result.status === 200) return
      try { reason = JSON.parse(result.body).reason } catch { reason = result.body }
    } catch (error: any) {
      console.warn('[push] APNs retry failed:', error?.message || error)
      return
    }
  }

  if (
    result.status === 410 ||
    reason === 'BadDeviceToken' ||
    reason === 'Unregistered' ||
    reason === 'DeviceTokenNotForTopic'
  ) {
    console.warn(`[push] Removing stale APNs token: ${token.slice(0, 10)}... (${reason})`)
    await deleteStaleToken(token).catch(() => {})
    return
  }

  console.warn(
    `[push] APNs send failed for ${token.slice(0, 10)}...: ${result.status} ${reason || ''}`
  )
}

/// Get-or-open an HTTP/2 session for the given host. Sessions are
/// closed by the dispatch loop once all sends finish.
function getApnsSession(
  pool: Map<string, http2.ClientHttp2Session>,
  host: string
): http2.ClientHttp2Session {
  const existing = pool.get(host)
  if (existing && !existing.closed && !existing.destroyed) return existing

  const session = http2.connect(`https://${host}`)
  // Connection-level errors close the session — without this, a failed
  // handshake leaks the session until GC.
  session.on('error', () => session.close())
  pool.set(host, session)
  return session
}

/**
 * Helper to get actor display name for notification title.
 */
export async function getActorDisplayName(actorId: string): Promise<string> {
  const [actor] = await db
    .select({
      displayName: users.displayName,
      slug: users.usernameSlug,
    })
    .from(users)
    .where(eq(users.id, actorId))
    .limit(1)

  return actor?.displayName || actor?.slug || 'Someone'
}
