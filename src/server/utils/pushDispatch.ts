import { db } from '@/server/db'
import { users } from '@/server/db/schema'
import { getUserPushTokens, deleteStaleToken } from './pushTokens'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

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

interface PushPayload {
  type: string
  title: string
  body: string
  deepLink: string
  actorAvatarUrl?: string
}

/**
 * Check if user has this notification type enabled in their preferences.
 * Default is true (enabled) if not explicitly set.
 */
async function isNotificationTypeEnabled(
  userId: string,
  type: string
): Promise<boolean> {
  const [user] = await db
    .select({ preferences: users.preferences })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user?.preferences) return true

  const prefs = user.preferences as any
  const notifPrefs = prefs?.notifications
  if (!notifPrefs) return true

  // Map push type to preference key
  const prefKeyMap: Record<string, string> = {
    like: 'likes',
    comment: 'comments',
    follow: 'follows',
    collect: 'collects',
    purchase: 'purchases',
    mention: 'mentions',
    message: 'messages',
  }

  const prefKey = prefKeyMap[type]
  if (!prefKey) return true

  // If explicitly set to false, disabled. Otherwise enabled.
  return notifPrefs[prefKey] !== false
}

/**
 * Send a push notification to a user's registered devices.
 * Uses FCM HTTP v1 API directly with Node.js native crypto.
 */
export async function sendPushNotification(
  recipientUserId: string,
  payload: PushPayload
) {
  // Check if user wants this type of notification
  const enabled = await isNotificationTypeEnabled(
    recipientUserId,
    payload.type
  )
  if (!enabled) return

  // Get user's registered push tokens
  const tokens = await getUserPushTokens(recipientUserId)
  if (tokens.length === 0) return

  const accessToken = await getAccessToken()
  const projectId = getProjectId()

  // Send to each device token via FCM HTTP v1 API
  for (const { token } of tokens) {
    try {
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
              android: {
                priority: 'high',
              },
            },
          }),
        }
      )

      if (response.ok) {
        // sent successfully
      } else {
        const errorData = await response.json().catch(() => ({})) as any
        const errorCode = errorData?.error?.details?.[0]?.errorCode || errorData?.error?.status

        if (
          errorCode === 'UNREGISTERED' ||
          errorCode === 'INVALID_ARGUMENT' ||
          response.status === 404
        ) {
          console.warn(`[push] Removing stale token: ${token.slice(0, 10)}...`)
          await deleteStaleToken(token).catch(() => {})
        } else {
          console.warn(
            `[push] Failed to send to token ${token.slice(0, 10)}...: ${response.status}`,
            JSON.stringify(errorData?.error || {})
          )
        }
      }
    } catch (error: any) {
      console.warn(
        `[push] Failed to send to token ${token.slice(0, 10)}...:`,
        error?.message || error
      )
    }
  }
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
