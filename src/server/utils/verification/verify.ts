/**
 * Verify-flow orchestration (server-only).
 *
 * Validates the wallet signature against the session nonce, links the proven
 * wallet to the Desperse account, computes holdings across ALL proven wallets,
 * and reconciles Discord roles. Roles are gated ONLY on signature-proven wallets
 * (discord_verified_wallets) — never on unproven userWallets links.
 */

import { db } from '@/server/db'
import { discordLinks, discordVerifiedWallets, discordAuditLog } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { validateAddress } from '@/server/services/blockchain/addressUtils'
import {
	getVerificationSession,
	consumeSession,
	buildVerificationMessage,
	isSessionUsable,
} from './sessions'
import { getEchoesHoldings, verifyWalletSignature } from './holdings'
import { reconcileRoles } from '@/server/utils/discord/roles'
import { postAuditMessage } from '@/server/utils/discord/rest'

export interface VerificationResult {
	success: boolean
	error?: string
	holdsEcho?: boolean
	echoCount?: number
	factions?: string[]
	holderGranted?: boolean
}

export async function processVerification(params: {
	desperseUserId: string
	sessionId: string
	walletAddress: string
	signature: string
	message: string
}): Promise<VerificationResult> {
	const { desperseUserId, sessionId, walletAddress, signature, message } = params

	if (!validateAddress(walletAddress)) {
		return { success: false, error: 'Invalid wallet address' }
	}

	// 1. Load + validate the session
	const session = await getVerificationSession(sessionId)
	if (!session) return { success: false, error: 'Verification session not found' }
	if (!isSessionUsable(session)) {
		return {
			success: false,
			error: 'Verification link expired or already used. Start again from Discord.',
		}
	}

	// 2. The signed message must be exactly the one we issued for this nonce
	if (message !== buildVerificationMessage(session.nonce)) {
		return { success: false, error: 'Message does not match this verification session' }
	}

	// 3. Verify the wallet signature
	const validSig = await verifyWalletSignature(walletAddress, message, signature)
	if (!validSig) return { success: false, error: 'Invalid signature' }

	const discordUserId = session.discordUserId

	// 4. Guard: a wallet binds to one Discord user at a time
	const [existingWallet] = await db
		.select({ discordUserId: discordVerifiedWallets.discordUserId })
		.from(discordVerifiedWallets)
		.where(eq(discordVerifiedWallets.walletPubkey, walletAddress))
		.limit(1)
	if (existingWallet && existingWallet.discordUserId !== discordUserId) {
		return { success: false, error: 'This wallet is already linked to a different Discord account.' }
	}

	// 5. Link Discord <-> Desperse account (one-to-one)
	try {
		await db
			.insert(discordLinks)
			.values({ discordUserId, desperseUserId, lastVerifiedAt: new Date() })
			.onConflictDoUpdate({
				target: discordLinks.discordUserId,
				set: { desperseUserId, lastVerifiedAt: new Date() },
			})
	} catch (err) {
		// e.g. desperse_user_id unique violation -> account linked to another Discord user
		console.warn('[discordVerify] link conflict:', err instanceof Error ? err.message : err)
		return {
			success: false,
			error: 'This Desperse account is already linked to a different Discord user.',
		}
	}

	// 6. Record the proven wallet (idempotent)
	try {
		await db
			.insert(discordVerifiedWallets)
			.values({
				discordUserId,
				walletPubkey: walletAddress,
				provedAt: new Date(),
				lastVerifiedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: discordVerifiedWallets.walletPubkey,
				set: { provedAt: new Date(), lastVerifiedAt: new Date() },
			})
	} catch (err) {
		console.warn(
			'[discordVerify] verified-wallet upsert failed:',
			err instanceof Error ? err.message : err,
		)
	}

	// 7. Compute holdings across ALL proven wallets for this Discord user
	const provenWallets = await db
		.select({ walletPubkey: discordVerifiedWallets.walletPubkey })
		.from(discordVerifiedWallets)
		.where(eq(discordVerifiedWallets.discordUserId, discordUserId))

	const factionSet = new Set<string>()
	let totalCount = 0
	for (const w of provenWallets) {
		const h = await getEchoesHoldings(w.walletPubkey)
		totalCount += h.count
		for (const f of h.factions) factionSet.add(f)
	}
	const holdsEcho = totalCount > 0
	const factions = Array.from(factionSet)

	// 8. Reconcile Discord roles (Echoes Holder + faction roles)
	const reconcile = await reconcileRoles({ discordUserId, holdsEcho, factions })

	// 9. Consume the session (single-use)
	await consumeSession(sessionId)

	// 10. Audit (best-effort)
	try {
		await db.insert(discordAuditLog).values({
			discordUserId,
			action: 'verify',
			detail: {
				desperseUserId,
				wallet: `${walletAddress.slice(0, 8)}...`,
				holdsEcho,
				echoCount: totalCount,
				factions,
				reconcile,
			},
		})
		if (holdsEcho) {
			await postAuditMessage(
				`✅ <@${discordUserId}> verified — ${totalCount} Echo(es)${
					factions.length ? `, factions: ${factions.join(', ')}` : ''
				}`,
			)
		}
	} catch (err) {
		console.warn('[discordVerify] audit failed:', err instanceof Error ? err.message : err)
	}

	return {
		success: true,
		holdsEcho,
		echoCount: totalCount,
		factions,
		holderGranted: reconcile.holderGranted,
	}
}

/**
 * Public session info for the verify page (no auth — the session id is the
 * secret). Returns the message to sign and the expiry, or { valid: false }.
 */
export async function loadVerificationSessionPublic(sessionId: string): Promise<{
	valid: boolean
	message?: string
	expiresAt?: string
}> {
	const session = await getVerificationSession(sessionId)
	if (!session || !isSessionUsable(session)) return { valid: false }
	return {
		valid: true,
		message: buildVerificationMessage(session.nonce),
		expiresAt: session.expiresAt.toISOString(),
	}
}
