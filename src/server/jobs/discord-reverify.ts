/**
 * Discord re-verification job (server-only).
 *
 * Re-checks every linked member's holdings across their signature-proven wallets
 * and reconciles roles. When a member no longer holds any Echo, an emptyCycles
 * grace counter ticks; once it reaches DISCORD_VERIFY_REVERIFY_GRACE_CYCLES the
 * roles are revoked and the member is DM'd. Restores roles automatically if a
 * previously-empty member is holding again.
 *
 * Runs from the cron route server/routes/api/v1/discord/recheck.get.ts.
 */

import { db } from '@/server/db'
import {
	discordLinks,
	discordVerifiedWallets,
	discordMemberRoles,
	discordAuditLog,
} from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { discordEnv } from '@/config/discord-env'
import { getEchoesHoldings } from '@/server/utils/verification/holdings'
import { reconcileRoles } from '@/server/utils/discord/roles'
import { postAuditMessage, sendDirectMessage } from '@/server/utils/discord/rest'

export type ReverifyAction = 'kept' | 'restored' | 'grace' | 'revoked' | 'noop'

export interface ReverifyMemberResult {
	discordUserId: string
	action: ReverifyAction
	holdsEcho: boolean
	echoCount: number
	factions: string[]
	emptyCycles?: number
}

/**
 * Re-check a single linked member and reconcile their roles.
 * Shared by the cron job and the /force-recheck admin command.
 */
export async function reverifyMember(discordUserId: string): Promise<ReverifyMemberResult> {
	// 1. Holdings union across all signature-proven wallets
	const wallets = await db
		.select({ walletPubkey: discordVerifiedWallets.walletPubkey })
		.from(discordVerifiedWallets)
		.where(eq(discordVerifiedWallets.discordUserId, discordUserId))

	const factionSet = new Set<string>()
	let total = 0
	for (const w of wallets) {
		const h = await getEchoesHoldings(w.walletPubkey)
		total += h.count
		for (const f of h.factions) factionSet.add(f)
	}
	const holdsEcho = total > 0
	const factions = Array.from(factionSet)
	const now = new Date()

	// 2a. Still holding -> reconcile (restores anything missing, resets grace)
	if (holdsEcho) {
		const reconcile = await reconcileRoles({ discordUserId, holdsEcho: true, factions })
		await db
			.update(discordVerifiedWallets)
			.set({ lastVerifiedAt: now })
			.where(eq(discordVerifiedWallets.discordUserId, discordUserId))
		await db
			.update(discordLinks)
			.set({ lastVerifiedAt: now })
			.where(eq(discordLinks.discordUserId, discordUserId))

		const restored = reconcile.holderGranted || reconcile.factionsAdded.length > 0
		return {
			discordUserId,
			action: restored ? 'restored' : 'kept',
			holdsEcho: true,
			echoCount: total,
			factions,
		}
	}

	// 2b. No Echo found — only act if the member currently has bot-managed roles
	const [snap] = await db
		.select()
		.from(discordMemberRoles)
		.where(eq(discordMemberRoles.discordUserId, discordUserId))
		.limit(1)

	const hadRoles = !!snap && (snap.hasHolderRole || (snap.factions?.length ?? 0) > 0)
	if (!hadRoles) {
		return { discordUserId, action: 'noop', holdsEcho: false, echoCount: 0, factions: [] }
	}

	const cycles = (snap?.emptyCycles ?? 0) + 1
	const grace = Math.max(1, discordEnv.REVERIFY_GRACE_CYCLES)

	// 2b-i. Grace exhausted -> revoke
	if (cycles >= grace) {
		const reconcile = await reconcileRoles({ discordUserId, holdsEcho: false, factions: [] })
		try {
			await db.insert(discordAuditLog).values({
				discordUserId,
				action: 'revoke',
				detail: { reason: 'no_echo_after_grace', cycles, reconcile },
			})
		} catch {
			/* non-critical */
		}
		await postAuditMessage(
			`🔻 <@${discordUserId}> roles revoked — no Echo found across linked wallets.`,
		).catch(() => {})
		await sendDirectMessage(
			discordUserId,
			'Your Desperse Echoes Holder + faction roles were removed because we no longer detect an Echo in your linked wallets. If you moved it to another wallet, click **Verify Wallet** again and connect that wallet to restore your roles.',
		).catch(() => {})
		return { discordUserId, action: 'revoked', holdsEcho: false, echoCount: 0, factions: [], emptyCycles: cycles }
	}

	// 2b-ii. Within grace -> tick counter, warn, keep roles
	await db
		.update(discordMemberRoles)
		.set({ emptyCycles: cycles, lastCheckedAt: now, updatedAt: now })
		.where(eq(discordMemberRoles.discordUserId, discordUserId))
	await sendDirectMessage(
		discordUserId,
		'Heads up: we no longer detect an Echo in your linked Desperse wallets. If you moved it, click **Verify Wallet** again and connect that wallet — otherwise your Echoes roles will be removed on the next check.',
	).catch(() => {})
	return { discordUserId, action: 'grace', holdsEcho: false, echoCount: 0, factions: [], emptyCycles: cycles }
}

export interface ReverifySummary {
	processed: number
	kept: number
	restored: number
	grace: number
	revoked: number
	errors: number
}

/** Re-check every linked member. Sequential — sized for an early community. */
export async function runDiscordReverify(): Promise<ReverifySummary> {
	const links = await db.select({ discordUserId: discordLinks.discordUserId }).from(discordLinks)
	const summary: ReverifySummary = {
		processed: 0,
		kept: 0,
		restored: 0,
		grace: 0,
		revoked: 0,
		errors: 0,
	}

	console.log(`[discordReverify] starting — ${links.length} linked member(s)`)
	for (const link of links) {
		try {
			const r = await reverifyMember(link.discordUserId)
			summary.processed++
			if (r.action === 'kept') summary.kept++
			else if (r.action === 'restored') summary.restored++
			else if (r.action === 'grace') summary.grace++
			else if (r.action === 'revoked') summary.revoked++
		} catch (err) {
			summary.errors++
			console.warn(
				`[discordReverify] failed for ${link.discordUserId}:`,
				err instanceof Error ? err.message : err,
			)
		}
	}

	console.log('[discordReverify] done', JSON.stringify(summary))
	if (summary.restored > 0 || summary.revoked > 0) {
		await postAuditMessage(
			`🔁 Re-verify: ${summary.processed} checked · ${summary.restored} restored · ${summary.revoked} revoked · ${summary.grace} in grace.`,
		).catch(() => {})
	}
	return summary
}
