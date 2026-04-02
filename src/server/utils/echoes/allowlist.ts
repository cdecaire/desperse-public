/**
 * Echoes PFP allowlist management
 * Loads and caches the whitelist, generates per-wallet Merkle proofs.
 */

// Placeholder — will be populated from PFP_ALLOWLIST_JSON env var or DB query
let cachedAllowlist: string[] | null = null

export interface MerkleProofResult {
	merkleRoot: Uint8Array
	proof: Uint8Array[]
}

/**
 * Load the allowlist from the configured source.
 * Caches in memory after first load.
 */
async function loadAllowlist(): Promise<string[]> {
	if (cachedAllowlist) return cachedAllowlist

	// TODO: Load from PFP_ALLOWLIST_JSON (file path, Vercel Blob URL, or DB query)
	// For now, return empty list — will be populated during CM setup
	console.warn('[echoes-allowlist] Allowlist not yet configured — returning empty list')
	cachedAllowlist = []
	return cachedAllowlist
}

/**
 * Check if a wallet is on the allowlist and return its Merkle proof.
 * Returns null if the wallet is not allowlisted.
 */
export async function getMerkleProofForWallet(walletAddress: string): Promise<MerkleProofResult | null> {
	const allowlist = await loadAllowlist()

	if (!allowlist.includes(walletAddress)) {
		return null
	}

	// TODO: Generate Merkle proof using @metaplex-foundation/mpl-core-candy-machine's getMerkleRoot/getMerkleProof
	// This requires the full allowlist to compute the tree
	// For now, return null — will be implemented during CM setup
	console.warn('[echoes-allowlist] Merkle proof generation not yet implemented')
	return null
}

/**
 * Reset the cached allowlist (for testing or hot-reload)
 */
export function resetAllowlistCache() {
	cachedAllowlist = null
}
