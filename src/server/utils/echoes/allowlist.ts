/**
 * Echoes PFP allowlist management
 * Supports two separate allowlists (OG and WL) with independent caches.
 * Generates per-wallet Merkle proofs using the Metaplex Candy Machine SDK.
 */

import { getMerkleRoot, getMerkleProof } from '@metaplex-foundation/mpl-core-candy-machine'
import { echoesEnv } from '@/config/echoes-env'
import fs from 'node:fs'

export type AllowlistType = 'og' | 'wl'

export interface MerkleProofResult {
	merkleRoot: Uint8Array
	proof: Uint8Array[]
}

// Independent caches per list type — stores resolved values and in-flight promises
const cache: Record<AllowlistType, string[] | null> = { og: null, wl: null }
const inflight: Record<AllowlistType, Promise<string[]> | null> = { og: null, wl: null }

/**
 * Load an allowlist from the configured source.
 * Supports local file paths and URLs. Cached after first load.
 * Deduplicates concurrent requests.
 */
async function loadAllowlist(type: AllowlistType): Promise<string[]> {
	if (cache[type]) return cache[type]
	if (inflight[type]) return inflight[type]

	inflight[type] = loadAllowlistInner(type).finally(() => { inflight[type] = null })
	return inflight[type]!
}

async function loadAllowlistInner(type: AllowlistType): Promise<string[]> {

	const source = type === 'og' ? echoesEnv.PFP_OG_ALLOWLIST_JSON : echoesEnv.PFP_WL_ALLOWLIST_JSON
	if (!source) {
		console.warn(`[echoes-allowlist] PFP_${type.toUpperCase()}_ALLOWLIST_JSON not set — ${type} allowlist is empty`)
		cache[type] = []
		return cache[type]
	}

	let raw: string

	if (source.startsWith('http://') || source.startsWith('https://')) {
		console.log(`[echoes-allowlist] Loading ${type} allowlist from URL...`)
		const response = await fetch(source)
		if (!response.ok) {
			console.error(`[echoes-allowlist] Failed to fetch ${type} allowlist: ${response.status}`)
			cache[type] = []
			return cache[type]
		}
		raw = await response.text()
	} else {
		if (!fs.existsSync(source)) {
			console.warn(`[echoes-allowlist] ${type} allowlist file not found: ${source}`)
			cache[type] = []
			return cache[type]
		}
		raw = fs.readFileSync(source, 'utf-8')
	}

	const parsed = JSON.parse(raw)
	if (!Array.isArray(parsed) || !parsed.every((a: unknown) => typeof a === 'string')) {
		console.error(`[echoes-allowlist] ${type} allowlist must be a JSON array of wallet address strings`)
		cache[type] = []
		return cache[type]
	}

	cache[type] = parsed
	console.log(`[echoes-allowlist] Loaded ${parsed.length} ${type} wallet addresses`)
	return cache[type]
}

/**
 * Check if a wallet is on the specified allowlist and return its Merkle proof.
 * Returns null if the wallet is not allowlisted or the allowlist is empty.
 */
export async function getMerkleProofForWallet(walletAddress: string, type: AllowlistType): Promise<MerkleProofResult | null> {
	const allowlist = await loadAllowlist(type)

	if (allowlist.length === 0) {
		return null
	}

	if (!allowlist.includes(walletAddress)) {
		return null
	}

	const merkleRoot = getMerkleRoot(allowlist)
	const proof = getMerkleProof(allowlist, walletAddress)

	return { merkleRoot, proof }
}

/**
 * Reset cached allowlists (for testing or hot-reload)
 */
export function resetAllowlistCache() {
	cache.og = null
	cache.wl = null
}
