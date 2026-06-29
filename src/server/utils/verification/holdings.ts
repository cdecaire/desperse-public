/**
 * Echoes holdings + wallet-signature verification (server-only).
 *
 * Reads on-chain holdings via Helius DAS (getAssetsByOwner), filtered to the
 * Echoes collection grouping, and extracts each Echo's Faction trait. Signature
 * verification mirrors the SIWS path (@noble/ed25519, base64/base58 detection).
 */

import * as ed25519 from '@noble/ed25519'
import { addressToBytes, validateAddress } from '@/server/services/blockchain/addressUtils'
import { getVerifyHeliusRpcUrl, getVerifyCollectionAddress } from '@/config/discord-env'

interface DasAttribute {
	trait_type?: string
	value?: string | number
}
interface DasGrouping {
	group_key?: string
	group_value?: string
}
interface DasAsset {
	id?: string
	grouping?: DasGrouping[]
	content?: { metadata?: { attributes?: DasAttribute[] } }
}

export interface EchoesHoldings {
	count: number
	factions: string[]
	assetIds: string[]
}

/**
 * Verify an ed25519 wallet signature over `message`. Accepts the signature in
 * base64 (contains +/=) or base58 encoding.
 */
export async function verifyWalletSignature(
	walletAddress: string,
	message: string,
	signatureEncoded: string,
): Promise<boolean> {
	try {
		if (!validateAddress(walletAddress)) return false
		const publicKeyBytes = addressToBytes(walletAddress)

		const isBase64 = /[+/=]/.test(signatureEncoded)
		let signatureBytes: Uint8Array
		if (isBase64) {
			signatureBytes = new Uint8Array(Buffer.from(signatureEncoded, 'base64'))
		} else {
			const bs58 = await import('bs58')
			signatureBytes = bs58.default.decode(signatureEncoded)
		}

		const messageBytes = new TextEncoder().encode(message)
		return await ed25519.verifyAsync(signatureBytes, messageBytes, publicKeyBytes)
	} catch (err) {
		console.error(
			'[discordHoldings] Signature verify error:',
			err instanceof Error ? err.message : err,
		)
		return false
	}
}

/**
 * Fetch a wallet's Echoes (matching the verified collection grouping) and their
 * factions via Helius DAS. Returns an empty result on any error.
 */
export async function getEchoesHoldings(walletAddress: string): Promise<EchoesHoldings> {
	const empty: EchoesHoldings = { count: 0, factions: [], assetIds: [] }
	const collection = getVerifyCollectionAddress()
	if (!collection || !validateAddress(walletAddress)) return empty

	try {
		const res = await fetch(getVerifyHeliusRpcUrl(), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: `echoes-holdings-${walletAddress.slice(0, 8)}`,
				method: 'getAssetsByOwner',
				params: {
					ownerAddress: walletAddress,
					displayOptions: { showFungible: false },
					limit: 1000,
				},
			}),
			signal: AbortSignal.timeout(10_000),
		})

		if (!res.ok) {
			console.warn(`[discordHoldings] DAS ${res.status} for ${walletAddress.slice(0, 8)}...`)
			return empty
		}

		const json = (await res.json()) as {
			result?: { items?: DasAsset[] }
			error?: { message?: string }
		}
		if (json.error) {
			console.warn('[discordHoldings] DAS error:', json.error.message)
			return empty
		}

		const items = json.result?.items ?? []
		const factions: string[] = []
		const assetIds: string[] = []
		for (const asset of items) {
			const inCollection = (asset.grouping ?? []).some(
				(g) => g.group_key === 'collection' && g.group_value === collection,
			)
			if (!inCollection) continue
			if (asset.id) assetIds.push(asset.id)
			const faction = (asset.content?.metadata?.attributes ?? []).find(
				(a) => a.trait_type === 'Faction',
			)?.value
			if (typeof faction === 'string') factions.push(faction)
		}

		return { count: assetIds.length, factions: Array.from(new Set(factions)), assetIds }
	} catch (err) {
		console.error(
			'[discordHoldings] getEchoesHoldings error:',
			err instanceof Error ? err.message : err,
		)
		return empty
	}
}
