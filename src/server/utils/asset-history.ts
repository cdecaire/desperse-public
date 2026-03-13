/**
 * Asset transfer history utility
 * Uses Helius DAS API to fetch transfer history for NFT assets
 */

import { getHeliusRpcUrl } from '@/config/env'
import { db } from '@/server/db'
import { users } from '@/server/db/schema'
import { inArray } from 'drizzle-orm'

export interface TransferEvent {
	from: string | null
	to: string
	timestamp: string | null
	txSignature: string
	type: 'minted' | 'collected' | 'transferred' | 'sale'
	fromProfile?: { usernameSlug: string; displayName: string | null } | null
	toProfile?: { usernameSlug: string; displayName: string | null } | null
}

/**
 * Fetch transfer history for a given asset using Helius DAS getSignaturesForAsset
 */
export async function getAssetTransferHistory(
	assetId: string,
): Promise<TransferEvent[]> {
	const rpcUrl = getHeliusRpcUrl()

	try {
		const response = await fetch(rpcUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: 'transfer-history',
				method: 'getSignaturesForAsset',
				params: {
					id: assetId,
					page: 1,
					limit: 50,
				},
			}),
		})

		if (!response.ok) {
			console.warn(
				'[getAssetTransferHistory] Helius API error:',
				response.status,
			)
			return []
		}

		const data = await response.json()

		if (data.error) {
			console.warn(
				'[getAssetTransferHistory] RPC error:',
				data.error.message,
			)
			return []
		}

		const items = data.result?.items || data.result || []
		if (!Array.isArray(items) || items.length === 0) return []

		// Parse signatures into transfer events
		// Helius returns [signature, type, slot] tuples or full objects
		const events: TransferEvent[] = []

		for (const item of items) {
			if (Array.isArray(item)) {
				// Tuple format: [signature, type]
				events.push({
					from: null,
					to: '',
					timestamp: null,
					txSignature: item[0],
					type: inferEventType(item[1]),
				})
			} else if (typeof item === 'string') {
				// Just a signature
				events.push({
					from: null,
					to: '',
					timestamp: null,
					txSignature: item,
					type: 'transferred',
				})
			}
		}

		return events
	} catch (error) {
		console.warn(
			'[getAssetTransferHistory] Error:',
			error instanceof Error ? error.message : 'Unknown',
		)
		return []
	}
}

function inferEventType(
	typeStr?: string,
): 'minted' | 'collected' | 'transferred' | 'sale' {
	if (!typeStr) return 'transferred'
	const lower = typeStr.toLowerCase()
	if (lower.includes('mint') || lower.includes('create')) return 'minted'
	if (lower.includes('sale') || lower.includes('sell')) return 'sale'
	if (lower.includes('transfer')) return 'transferred'
	return 'transferred'
}

/**
 * Enrich wallet addresses with Desperse user profiles where possible
 */
export async function enrichWalletsWithProfiles(
	wallets: string[],
): Promise<
	Map<string, { usernameSlug: string; displayName: string | null }>
> {
	const unique = [...new Set(wallets.filter(Boolean))]
	if (unique.length === 0) return new Map()

	const profiles = await db
		.select({
			walletAddress: users.walletAddress,
			usernameSlug: users.usernameSlug,
			displayName: users.displayName,
		})
		.from(users)
		.where(inArray(users.walletAddress, unique))

	const map = new Map<
		string,
		{ usernameSlug: string; displayName: string | null }
	>()
	for (const p of profiles) {
		map.set(p.walletAddress, {
			usernameSlug: p.usernameSlug,
			displayName: p.displayName,
		})
	}

	return map
}
