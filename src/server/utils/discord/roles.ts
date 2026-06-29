/**
 * Faction-trait -> Discord role reconciliation (server-only).
 *
 * Single source of truth for which roles a verified member should hold. Used by
 * both the verify flow and (later) the scheduled re-check: it diffs the desired
 * roles (from current holdings) against the discord_member_roles snapshot, adds
 * what's missing, removes what's no longer held, and persists the new snapshot.
 * Only ever touches bot-managed roles (Echoes Holder + the five factions).
 */

import { db } from '@/server/db'
import { discordMemberRoles } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { discordEnv, type EchoesFaction } from '@/config/discord-env'
import { addGuildRole, removeGuildRole } from './rest'

/** Discord role ID for a faction value, or '' if unmapped/unconfigured. */
export function factionRoleId(faction: string): string {
	return discordEnv.FACTION_ROLE_IDS[faction as EchoesFaction] ?? ''
}

export interface ReconcileResult {
	holderGranted: boolean
	holderRevoked: boolean
	factionsAdded: string[]
	factionsRemoved: string[]
}

/**
 * Reconcile a member's Discord roles to match their current holdings.
 *
 * `holdsEcho` controls the Echoes Holder role; `factions` controls faction roles
 * (only those we have a configured role ID for). The snapshot is updated to
 * reflect what is actually granted, so a grant that fails (e.g. role ID not yet
 * configured) is retried on the next reconcile rather than being lost.
 */
export async function reconcileRoles(params: {
	discordUserId: string
	holdsEcho: boolean
	factions: string[]
}): Promise<ReconcileResult> {
	const { discordUserId, holdsEcho } = params
	const desiredFactions = Array.from(new Set(params.factions)).filter((f) => factionRoleId(f))

	const [snapshot] = await db
		.select()
		.from(discordMemberRoles)
		.where(eq(discordMemberRoles.discordUserId, discordUserId))
		.limit(1)

	const prevFactions = snapshot?.factions ?? []
	const prevHolder = snapshot?.hasHolderRole ?? false

	const result: ReconcileResult = {
		holderGranted: false,
		holderRevoked: false,
		factionsAdded: [],
		factionsRemoved: [],
	}

	// Echoes Holder role
	if (holdsEcho && !prevHolder) {
		if (await addGuildRole(discordUserId, discordEnv.ECHOES_HOLDER_ROLE_ID)) {
			result.holderGranted = true
		}
	} else if (!holdsEcho && prevHolder) {
		if (await removeGuildRole(discordUserId, discordEnv.ECHOES_HOLDER_ROLE_ID)) {
			result.holderRevoked = true
		}
	}

	// Faction roles
	const toAdd = holdsEcho ? desiredFactions.filter((f) => !prevFactions.includes(f)) : []
	const toRemove = prevFactions.filter((f) => !(holdsEcho && desiredFactions.includes(f)))
	for (const f of toAdd) {
		if (await addGuildRole(discordUserId, factionRoleId(f))) result.factionsAdded.push(f)
	}
	for (const f of toRemove) {
		if (await removeGuildRole(discordUserId, factionRoleId(f))) result.factionsRemoved.push(f)
	}

	// Final state = what we believe is actually granted now (self-healing).
	const finalHolder = holdsEcho && (prevHolder || result.holderGranted)
	const finalFactions = holdsEcho
		? [
				...prevFactions.filter((f) => desiredFactions.includes(f)),
				...result.factionsAdded,
			]
		: []

	await db
		.insert(discordMemberRoles)
		.values({
			discordUserId,
			hasHolderRole: finalHolder,
			factions: finalFactions,
			emptyCycles: 0,
			lastCheckedAt: new Date(),
			updatedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: discordMemberRoles.discordUserId,
			set: {
				hasHolderRole: finalHolder,
				factions: finalFactions,
				emptyCycles: 0,
				lastCheckedAt: new Date(),
				updatedAt: new Date(),
			},
		})

	return result
}
