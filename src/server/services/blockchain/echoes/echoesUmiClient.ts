/**
 * Umi client configured for Echoes PFP mint on Solana devnet.
 * Server-only: uses devnet fee payer keypair and Echoes-specific env vars.
 *
 * Completely isolated from mainnet Umi clients in ../compressed/ and ../editions/.
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { mplCandyMachine } from '@metaplex-foundation/mpl-core-candy-machine'
import { mplCore } from '@metaplex-foundation/mpl-core'
import {
	signerIdentity,
	publicKey as umiPublicKey,
	createSignerFromKeypair,
} from '@metaplex-foundation/umi'
import bs58 from 'bs58'
import { getEchoesHeliusRpcUrl, echoesEnv } from '@/config/echoes-env'

let umiInstance: ReturnType<typeof createUmi> | null = null

/**
 * Parse a private key from env.
 * Supports base58 string or JSON array of numbers.
 */
function parsePrivateKey(raw: string): Uint8Array {
	const trimmed = raw.trim()
	if (!trimmed) {
		throw new Error('ECHOES_FEE_PAYER_PRIVATE_KEY is missing')
	}

	if (trimmed.startsWith('[')) {
		try {
			const arr = JSON.parse(trimmed)
			if (!Array.isArray(arr)) {
				throw new Error('Invalid key format: expected array')
			}
			return new Uint8Array(arr)
		} catch {
			throw new Error('Invalid JSON array for ECHOES_FEE_PAYER_PRIVATE_KEY')
		}
	}

	try {
		return bs58.decode(trimmed)
	} catch {
		throw new Error('Invalid base58 for ECHOES_FEE_PAYER_PRIVATE_KEY')
	}
}

/**
 * Get a devnet Umi instance configured for Echoes PFP minting.
 * Uses Core Candy Machine + Core plugins.
 * Singleton — cached after first initialization.
 */
export function getEchoesUmi() {
	if (umiInstance) return umiInstance

	const rpcUrl = getEchoesHeliusRpcUrl()
	const secretKey = parsePrivateKey(echoesEnv.ECHOES_FEE_PAYER_PRIVATE_KEY)

	const umi = createUmi(rpcUrl)
		.use(mplCandyMachine())
		.use(mplCore())

	const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey)
	const signer = createSignerFromKeypair(umi, keypair)

	umi.use(signerIdentity(signer))

	umiInstance = umi

	console.info('[echoes-umi] Initialized with devnet RPC:', rpcUrl)

	return umiInstance
}

/**
 * Get the Candy Machine public key from env
 */
export function getCandyMachinePublicKey() {
	const { PFP_CANDY_MACHINE_ADDRESS } = echoesEnv
	if (!PFP_CANDY_MACHINE_ADDRESS?.trim()) {
		throw new Error('PFP_CANDY_MACHINE_ADDRESS env is missing')
	}
	return umiPublicKey(PFP_CANDY_MACHINE_ADDRESS.trim())
}

/**
 * Get the Collection public key from env
 */
export function getCollectionPublicKey() {
	const { PFP_COLLECTION_ADDRESS } = echoesEnv
	if (!PFP_COLLECTION_ADDRESS?.trim()) {
		throw new Error('PFP_COLLECTION_ADDRESS env is missing')
	}
	return umiPublicKey(PFP_COLLECTION_ADDRESS.trim())
}

/**
 * Reset the cached Umi instance (for testing)
 */
export function resetEchoesUmiInstance() {
	umiInstance = null
}
