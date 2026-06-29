/**
 * Discord interaction request verification + response helpers (server-only).
 *
 * Discord signs every interaction request with Ed25519; we verify it against the
 * app's public key before trusting the payload. Reuses @noble/ed25519 (the same
 * lib SIWS uses) — no extra dependency.
 */

import * as ed25519 from '@noble/ed25519'
import { discordEnv } from '@/config/discord-env'

/** Inbound interaction types (subset we handle). */
export const InteractionType = {
	PING: 1,
	APPLICATION_COMMAND: 2,
	MESSAGE_COMPONENT: 3,
	MODAL_SUBMIT: 5,
} as const

/** Outbound interaction response types. */
export const InteractionResponseType = {
	PONG: 1,
	CHANNEL_MESSAGE_WITH_SOURCE: 4,
} as const

/** Message flags. EPHEMERAL = only visible to the invoking user. */
export const MessageFlags = { EPHEMERAL: 1 << 6 } as const

function hexToBytes(hex: string): Uint8Array {
	const clean = hex.trim()
	const bytes = new Uint8Array(clean.length / 2)
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16)
	}
	return bytes
}

/**
 * Verify the Ed25519 signature Discord attaches to every interaction request.
 * The signed payload is `timestamp + rawBody`. Returns false on any malformed
 * or missing input rather than throwing.
 */
export async function verifyInteractionSignature(params: {
	rawBody: string
	signature: string
	timestamp: string
}): Promise<boolean> {
	const { rawBody, signature, timestamp } = params
	try {
		if (!discordEnv.PUBLIC_KEY || !signature || !timestamp) return false
		const sigBytes = hexToBytes(signature)
		const pubKeyBytes = hexToBytes(discordEnv.PUBLIC_KEY)
		const msgBytes = new TextEncoder().encode(timestamp + rawBody)
		return await ed25519.verifyAsync(sigBytes, msgBytes, pubKeyBytes)
	} catch (err) {
		console.warn(
			'[discordInteractions] Signature verify failed:',
			err instanceof Error ? err.message : err,
		)
		return false
	}
}

/** Build an ephemeral channel-message interaction response. */
export function ephemeralResponse(content: string) {
	return {
		type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
		data: { content, flags: MessageFlags.EPHEMERAL },
	}
}

/** The PING -> PONG handshake response. */
export const pongResponse = { type: InteractionResponseType.PONG }

const ADMINISTRATOR = 1n << 3n
const MANAGE_ROLES = 1n << 28n

/**
 * True if the interaction member has Manage Roles or Administrator. Defense in
 * depth on top of the command's default_member_permissions.
 */
export function hasStaffPermission(permissions?: string): boolean {
	if (!permissions) return false
	try {
		const p = BigInt(permissions)
		return (p & ADMINISTRATOR) !== 0n || (p & MANAGE_ROLES) !== 0n
	} catch {
		return false
	}
}
