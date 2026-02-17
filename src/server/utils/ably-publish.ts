/**
 * Lightweight Ably publisher using REST API.
 * Avoids importing Ably SDK to prevent Buffer / SSR issues.
 * Fire-and-forget: logs errors but does not throw.
 */

import { env } from '@/config/env'

/**
 * Publish an event to an Ably channel using the REST API
 */
export async function publishToAbly(
  channelName: string,
  eventName: string,
  data: unknown
): Promise<void> {
  const apiKey = env.ABLY_API_KEY
  if (!apiKey) {
    console.warn('ABLY_API_KEY not configured, skipping publish')
    return
  }

  try {
    const basicAuth = Buffer.from(apiKey, 'utf8').toString('base64')

    const response = await fetch(
      `https://rest.ably.io/channels/${encodeURIComponent(channelName)}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          {
            name: eventName,
            data,
          },
        ]),
      }
    )

    if (!response.ok) {
      const text = await response.text()
      console.error('Failed to publish to Ably:', response.status, text)
    }
  } catch (error) {
    // Fire-and-forget: log only, do not throw
    console.error('Ably publish error:', error instanceof Error ? error.message : 'Unknown error')
  }
}

/**
 * Event types for messaging real-time updates
 */
export type AblyMessageEvent = {
  type: 'new_message'
  threadId: string
  messageId: string
  senderId: string
  createdAt: string
}

export type AblyReadReceiptEvent = {
  type: 'message_read'
  threadId: string
  readerId: string
  readAt: string
}

/**
 * Publish a new message notification to both thread participants
 */
export async function publishNewMessage(
  recipientUserId: string,
  threadId: string,
  messageId: string,
  senderId: string,
  createdAt: Date
): Promise<void> {
  const event: AblyMessageEvent = {
    type: 'new_message',
    threadId,
    messageId,
    senderId,
    createdAt: createdAt.toISOString(),
  }

  // Publish to recipient's personal channel
  await publishToAbly(`user:${recipientUserId}`, 'new_message', event)
}

/**
 * Publish a read receipt notification to the other participant
 */
export async function publishReadReceipt(
  otherUserId: string,
  threadId: string,
  readerId: string,
  readAt: Date
): Promise<void> {
  const event: AblyReadReceiptEvent = {
    type: 'message_read',
    threadId,
    readerId,
    readAt: readAt.toISOString(),
  }

  // Publish to the other user's personal channel
  await publishToAbly(`user:${otherUserId}`, 'message_read', event)
}
