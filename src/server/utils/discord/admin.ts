/**
 * Admin slash-command logic (server-only). Each function returns the ephemeral
 * reply text for a staff command. Permission gating happens at the interaction
 * boundary (default_member_permissions + a hasStaffPermission check).
 */

import { db } from '@/server/db'
import {
	discordLinks,
	discordVerifiedWallets,
	discordMemberRoles,
	discordAuditLog,
} from '@/server/db/schema'
import { eq, and } from 'drizzle-orm'
import { ECHOES_FACTIONS } from '@/config/discord-env'
import { reconcileRoles } from './roles'
import { reverifyMember } from '@/server/jobs/discord-reverify'

function truncWallet(w: string): string {
	return `${w.slice(0, 4)}…${w.slice(-4)}`
}

/** /verify-status <user> */
export async function getVerifyStatus(discordUserId: string): Promise<string> {
	const [link] = await db
		.select()
		.from(discordLinks)
		.where(eq(discordLinks.discordUserId, discordUserId))
		.limit(1)
	if (!link) return `<@${discordUserId}> is not verified (no link).`

	const wallets = await db
		.select({ w: discordVerifiedWallets.walletPubkey })
		.from(discordVerifiedWallets)
		.where(eq(discordVerifiedWallets.discordUserId, discordUserId))
	const [snap] = await db
		.select()
		.from(discordMemberRoles)
		.where(eq(discordMemberRoles.discordUserId, discordUserId))
		.limit(1)

	return [
		`**Status for <@${discordUserId}>**`,
		`Linked Desperse account: \`${link.desperseUserId}\``,
		`Holder role: ${snap?.hasHolderRole ? 'yes' : 'no'}`,
		`Factions: ${snap?.factions?.length ? snap.factions.join(', ') : 'none'}`,
		`Proven wallets (${wallets.length}): ${wallets.map((x) => truncWallet(x.w)).join(', ') || 'none'}`,
		`Empty re-check cycles: ${snap?.emptyCycles ?? 0}`,
		`Last verified: ${link.lastVerifiedAt ? new Date(link.lastVerifiedAt).toISOString() : 'n/a'}`,
	].join('\n')
}

/** /force-recheck <user> */
export async function forceRecheck(discordUserId: string): Promise<string> {
	const [link] = await db
		.select({ id: discordLinks.discordUserId })
		.from(discordLinks)
		.where(eq(discordLinks.discordUserId, discordUserId))
		.limit(1)
	if (!link) return `<@${discordUserId}> is not verified (no link).`

	const r = await reverifyMember(discordUserId)
	return `Re-checked <@${discordUserId}>: **${r.action}** — ${r.echoCount} Echo(es)${
		r.factions.length ? `, factions: ${r.factions.join(', ')}` : ''
	}.`
}

/** /unlink <user> [wallet] */
export async function unlinkUser(discordUserId: string, wallet?: string): Promise<string> {
	const [link] = await db
		.select({ id: discordLinks.discordUserId })
		.from(discordLinks)
		.where(eq(discordLinks.discordUserId, discordUserId))
		.limit(1)
	if (!link) return `<@${discordUserId}> is not verified (no link).`

	if (wallet) {
		const deleted = await db
			.delete(discordVerifiedWallets)
			.where(
				and(
					eq(discordVerifiedWallets.discordUserId, discordUserId),
					eq(discordVerifiedWallets.walletPubkey, wallet),
				),
			)
			.returning({ w: discordVerifiedWallets.walletPubkey })
		if (deleted.length === 0) {
			return `\`${truncWallet(wallet)}\` is not among <@${discordUserId}>'s proven wallets.`
		}
		// Reconcile roles against the remaining proven wallets.
		const r = await reverifyMember(discordUserId)
		await auditUnlink(discordUserId, { wallet: truncWallet(wallet), result: r.action })
		return `Unlinked \`${truncWallet(wallet)}\` from <@${discordUserId}>. Now: **${r.action}** (${r.echoCount} Echo(es)).`
	}

	// Unlink all: strip roles, remove all records.
	await reconcileRoles({ discordUserId, holdsEcho: false, factions: [] })
	await db.delete(discordVerifiedWallets).where(eq(discordVerifiedWallets.discordUserId, discordUserId))
	await db.delete(discordMemberRoles).where(eq(discordMemberRoles.discordUserId, discordUserId))
	await db.delete(discordLinks).where(eq(discordLinks.discordUserId, discordUserId))
	await auditUnlink(discordUserId, { all: true })
	return `Unlinked **all** wallets from <@${discordUserId}> and removed Echoes roles.`
}

async function auditUnlink(discordUserId: string, detail: Record<string, unknown>): Promise<void> {
	try {
		await db.insert(discordAuditLog).values({ discordUserId, action: 'unlink', detail })
	} catch {
		/* non-critical */
	}
}

/** /stats */
export async function getStats(): Promise<string> {
	const links = await db.select({ id: discordLinks.discordUserId }).from(discordLinks)
	const wallets = await db.select({ id: discordVerifiedWallets.id }).from(discordVerifiedWallets)
	const members = await db
		.select({ hasHolder: discordMemberRoles.hasHolderRole, factions: discordMemberRoles.factions })
		.from(discordMemberRoles)

	const holders = members.filter((m) => m.hasHolder).length
	const factionCounts: Record<string, number> = {}
	for (const f of ECHOES_FACTIONS) factionCounts[f] = 0
	for (const m of members) {
		for (const f of m.factions ?? []) {
			if (f in factionCounts) factionCounts[f]++
		}
	}

	return [
		'**Echoes verification stats**',
		`Linked members: ${links.length}`,
		`Proven wallets: ${wallets.length}`,
		`Current holders: ${holders}`,
		'By faction:',
		...ECHOES_FACTIONS.map((f) => `  ${f}: ${factionCounts[f]}`),
	].join('\n')
}
