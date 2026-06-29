/**
 * Discord verification sessions (server-only).
 *
 * A session binds a Discord user to a one-time nonce with a short TTL. The nonce
 * is embedded in the message the wallet signs, which prevents replay and ties the
 * signature to this specific Discord user + attempt.
 */

import { db } from '@/server/db'
import {
	discordVerificationSessions,
	type DiscordVerificationSession,
} from '@/server/db/schema'
import { eq, and, gt, count } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import { discordEnv } from '@/config/discord-env'

export async function createVerificationSession(
	discordUserId: string,
): Promise<DiscordVerificationSession> {
	const nonce = randomBytes(32).toString('hex')
	const expiresAt = new Date(Date.now() + discordEnv.SESSION_TTL_MINUTES * 60 * 1000)
	const [session] = await db
		.insert(discordVerificationSessions)
		.values({ discordUserId, nonce, status: 'pending', expiresAt })
		.returning()
	return session
}

export async function getVerificationSession(
	id: string,
): Promise<DiscordVerificationSession | null> {
	const [session] = await db
		.select()
		.from(discordVerificationSessions)
		.where(eq(discordVerificationSessions.id, id))
		.limit(1)
	return session ?? null
}

/**
 * Atomically mark a pending session consumed. Returns true only if THIS call
 * transitioned it from pending -> consumed (guards against double-submit).
 */
export async function consumeSession(id: string): Promise<boolean> {
	const updated = await db
		.update(discordVerificationSessions)
		.set({ status: 'consumed' })
		.where(
			and(
				eq(discordVerificationSessions.id, id),
				eq(discordVerificationSessions.status, 'pending'),
			),
		)
		.returning({ id: discordVerificationSessions.id })
	return updated.length > 0
}

/** The human-readable message a wallet signs. Embeds the nonce; states no tx. */
export function buildVerificationMessage(nonce: string): string {
	return [
		'Desperse — verify Echoes holder',
		'',
		'Sign to prove you own this wallet and link it to your Discord.',
		'You are NOT approving a transaction. No funds will move.',
		'',
		`Nonce: ${nonce}`,
	].join('\n')
}

export function isSessionUsable(session: DiscordVerificationSession): boolean {
	return session.status === 'pending' && session.expiresAt.getTime() > Date.now()
}

/** How many sessions this Discord user created within the last `sinceMs`. */
export async function countRecentSessions(discordUserId: string, sinceMs: number): Promise<number> {
	const since = new Date(Date.now() - sinceMs)
	const [row] = await db
		.select({ n: count() })
		.from(discordVerificationSessions)
		.where(
			and(
				eq(discordVerificationSessions.discordUserId, discordUserId),
				gt(discordVerificationSessions.createdAt, since),
			),
		)
	return Number(row?.n ?? 0)
}
