/**
 * Echoes-specific environment variable access
 * Completely isolated from mainnet env config in env.ts
 *
 * All Echoes blockchain operations use devnet via separate Helius API key
 * and fee payer keypair. This ensures zero interference with mainnet.
 */

import { getEnvVar } from './env'

export const echoesEnv = {
	ECHOES_HELIUS_API_KEY: getEnvVar('ECHOES_HELIUS_API_KEY', ''),
	ECHOES_FEE_PAYER_PRIVATE_KEY: getEnvVar('ECHOES_FEE_PAYER_PRIVATE_KEY', ''),
	PFP_CANDY_MACHINE_ADDRESS: getEnvVar('PFP_CANDY_MACHINE_ADDRESS', ''),
	PFP_COLLECTION_ADDRESS: getEnvVar('PFP_COLLECTION_ADDRESS', ''),
	PFP_ALLOWLIST_JSON: getEnvVar('PFP_ALLOWLIST_JSON', ''),
	PFP_MINT_ENABLED: getEnvVar('VITE_PFP_MINT_ENABLED', 'false') === 'true',
	PFP_MINT_PHASE: getEnvVar('VITE_PFP_MINT_PHASE', 'closed') as 'whitelist' | 'public' | 'closed',
	PFP_PAYMENT_WALLET: getEnvVar('PFP_PAYMENT_WALLET', ''),
	/** Server-only base URL for echo images. Local: echoes-dev/assets (relative to project root), Staging: Vercel Blob URL */
	ECHOES_IMAGE_BASE_URL: getEnvVar('ECHOES_IMAGE_BASE_URL', 'echoes-dev/assets'),
} as const

/**
 * Get the Helius devnet RPC URL for Echoes (server-side only)
 * Uses ECHOES_HELIUS_API_KEY — completely separate from mainnet HELIUS_API_KEY
 */
export function getEchoesHeliusRpcUrl(): string {
	const apiKey = echoesEnv.ECHOES_HELIUS_API_KEY
	if (apiKey) {
		return `https://devnet.helius-rpc.com/?api-key=${apiKey}`
	}
	console.warn('[echoes] ECHOES_HELIUS_API_KEY not set, using public devnet RPC')
	return 'https://api.devnet.solana.com'
}
