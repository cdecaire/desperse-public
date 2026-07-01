/**
 * Discord REST helpers (server-only).
 *
 * Authenticated bot calls via fetch — same style as the Helius DAS calls. The
 * bot needs only the Manage Roles permission, and its role must sit ABOVE every
 * role it assigns in the guild's role hierarchy. All calls are server-side, so
 * CSP does not apply.
 */

import { discordEnv } from '@/config/discord-env'

const API_BASE = 'https://discord.com/api/v10'

function botHeaders(): Record<string, string> {
	return {
		Authorization: `Bot ${discordEnv.BOT_TOKEN}`,
		'Content-Type': 'application/json',
	}
}

/** Grant a role to a guild member. Idempotent — Discord returns 204 either way. */
export async function addGuildRole(discordUserId: string, roleId: string): Promise<boolean> {
	if (!roleId || !discordEnv.GUILD_ID || !discordEnv.BOT_TOKEN) return false
	try {
		const res = await fetch(
			`${API_BASE}/guilds/${discordEnv.GUILD_ID}/members/${discordUserId}/roles/${roleId}`,
			{ method: 'PUT', headers: botHeaders() },
		)
		if (!res.ok && res.status !== 204) {
			console.warn(`[discordRest] addGuildRole ${roleId} -> ${res.status} ${res.statusText}`)
			return false
		}
		return true
	} catch (err) {
		console.error('[discordRest] addGuildRole error:', err instanceof Error ? err.message : err)
		return false
	}
}

/** Remove a role from a guild member. */
export async function removeGuildRole(discordUserId: string, roleId: string): Promise<boolean> {
	if (!roleId || !discordEnv.GUILD_ID || !discordEnv.BOT_TOKEN) return false
	try {
		const res = await fetch(
			`${API_BASE}/guilds/${discordEnv.GUILD_ID}/members/${discordUserId}/roles/${roleId}`,
			{ method: 'DELETE', headers: botHeaders() },
		)
		if (!res.ok && res.status !== 204) {
			console.warn(`[discordRest] removeGuildRole ${roleId} -> ${res.status} ${res.statusText}`)
			return false
		}
		return true
	} catch (err) {
		console.error('[discordRest] removeGuildRole error:', err instanceof Error ? err.message : err)
		return false
	}
}

/** Post a message to the staff audit channel. Best-effort — never throws. */
export async function postAuditMessage(content: string): Promise<void> {
	if (!discordEnv.AUDIT_CHANNEL_ID || !discordEnv.BOT_TOKEN) return
	try {
		await fetch(`${API_BASE}/channels/${discordEnv.AUDIT_CHANNEL_ID}/messages`, {
			method: 'POST',
			headers: botHeaders(),
			body: JSON.stringify({ content }),
		})
	} catch (err) {
		console.warn('[discordRest] postAuditMessage failed:', err instanceof Error ? err.message : err)
	}
}

/**
 * DM a guild member. Best-effort — never throws. Returns false if the user has
 * DMs closed or we otherwise can't deliver. Used for re-verify nudges.
 */
export async function sendDirectMessage(discordUserId: string, content: string): Promise<boolean> {
	if (!discordEnv.BOT_TOKEN) return false
	try {
		const dm = await fetch(`${API_BASE}/users/@me/channels`, {
			method: 'POST',
			headers: botHeaders(),
			body: JSON.stringify({ recipient_id: discordUserId }),
		})
		if (!dm.ok) {
			console.warn(`[discordRest] open DM -> ${dm.status} for user ${discordUserId}`)
			return false
		}
		const channel = (await dm.json()) as { id?: string }
		if (!channel.id) return false
		const res = await fetch(`${API_BASE}/channels/${channel.id}/messages`, {
			method: 'POST',
			headers: botHeaders(),
			body: JSON.stringify({ content }),
		})
		return res.ok
	} catch (err) {
		console.warn('[discordRest] sendDirectMessage failed:', err instanceof Error ? err.message : err)
		return false
	}
}
