/**
 * Update Candy Machine guards in-place (no re-upload, no CM recreation).
 *
 * Reads guard config from echoes-guard-config.ts and calls updateCandyGuard.
 *
 * Usage: npx tsx --env-file=.env.local scripts/echoes-update-guards.ts
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { mplCore } from '@metaplex-foundation/mpl-core'
import {
	mplCandyMachine,
	fetchCandyMachine,
	fetchCandyGuard,
	updateCandyGuard,
	getMerkleRoot,
} from '@metaplex-foundation/mpl-core-candy-machine'
import {
	createSignerFromKeypair,
	signerIdentity,
	sol,
	some,
	publicKey as umiPublicKey,
} from '@metaplex-foundation/umi'
import fs from 'node:fs'
import path from 'node:path'
import {
	loadOgAllowlistWallets,
	loadWlAllowlistWallets,
	dateToTimestamp,
	OG_FREE_MINT_LIMIT,
	OG_DISCOUNT_MINT_LIMIT,
	OG_DISCOUNT_PRICE_SOL,
	WL_MINT_LIMIT,
	WL_PRICE_SOL,
	PUBLIC_PRICE_SOL,
	PUBLIC_MINT_LIMIT,
	OG_FREE_START_DATE,
	OG_FREE_END_DATE,
	OG_DISCOUNT_START_DATE,
	OG_DISCOUNT_END_DATE,
	WL_START_DATE,
	WL_END_DATE,
	PUBLIC_START_DATE,
	BOT_TAX_SOL,
} from './echoes-guard-config'

const DEVNET_RPC = 'https://api.devnet.solana.com'
const KEYPAIR_FILE = path.join(process.cwd(), 'echoes-fee-payer.json')
const ENV_LOCAL_PATH = path.join(process.cwd(), '.env.local')

function readEnvAddress(key: string): string {
	const envContent = fs.readFileSync(ENV_LOCAL_PATH, 'utf-8')
	const match = envContent.match(new RegExp(`^${key}=(.+)$`, 'm'))
	return match?.[1]?.trim() ?? ''
}

function log(msg: string) {
	console.log(`[echoes-update-guards] ${msg}`)
}

async function main() {
	log('=== Update Candy Machine Guards ===')

	const cmAddress = readEnvAddress('PFP_CANDY_MACHINE_ADDRESS')
	if (!cmAddress) {
		console.error('PFP_CANDY_MACHINE_ADDRESS not found in .env.local')
		process.exit(1)
	}

	const secretKey = new Uint8Array(JSON.parse(fs.readFileSync(KEYPAIR_FILE, 'utf-8')))
	const umi = createUmi(DEVNET_RPC)
		.use(mplCore())
		.use(mplCandyMachine())

	const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey)
	const signer = createSignerFromKeypair(umi, keypair)
	umi.use(signerIdentity(signer))

	const paymentWallet = readEnvAddress('PFP_PAYMENT_WALLET')
	if (!paymentWallet) {
		console.error('PFP_PAYMENT_WALLET not found in .env.local')
		process.exit(1)
	}
	const paymentDest = umiPublicKey(paymentWallet)

	log(`CM: ${cmAddress}`)
	log(`Fee payer: ${signer.publicKey.toString()}`)
	log(`Payment destination: ${paymentWallet}`)

	// Fetch CM + guard
	const cm = await fetchCandyMachine(umi, cmAddress as any)
	const guard = await fetchCandyGuard(umi, cm.mintAuthority)
	log(`Current guard groups: ${guard.groups.map(g => g.label).join(', ')}`)

	const nowTimestamp = BigInt(Math.floor(Date.now() / 1000))
	const ogWallets = loadOgAllowlistWallets()
	const wlWallets = loadWlAllowlistWallets()
	log(`OG allowlist: ${ogWallets.length} wallets`)
	log(`WL allowlist: ${wlWallets.length} wallets`)

	// Build guard groups (same structure as creation script)
	const ogFreeGuards: Record<string, any> = {
		botTax: some({ lamports: sol(BOT_TAX_SOL), lastInstruction: true }),
		startDate: some({ date: dateToTimestamp(OG_FREE_START_DATE) ?? nowTimestamp }),
		mintLimit: some({ id: 1, limit: OG_FREE_MINT_LIMIT }),
	}
	if (OG_FREE_END_DATE) ogFreeGuards.endDate = some({ date: dateToTimestamp(OG_FREE_END_DATE)! })
	if (ogWallets.length > 0) ogFreeGuards.allowList = some({ merkleRoot: getMerkleRoot(ogWallets) })

	const ogDiscountGuards: Record<string, any> = {
		botTax: some({ lamports: sol(BOT_TAX_SOL), lastInstruction: true }),
		solPayment: some({ lamports: sol(OG_DISCOUNT_PRICE_SOL), destination: paymentDest }),
		startDate: some({ date: dateToTimestamp(OG_DISCOUNT_START_DATE) ?? nowTimestamp }),
	}
	if (OG_DISCOUNT_MINT_LIMIT != null) ogDiscountGuards.mintLimit = some({ id: 2, limit: OG_DISCOUNT_MINT_LIMIT })
	if (OG_DISCOUNT_END_DATE) ogDiscountGuards.endDate = some({ date: dateToTimestamp(OG_DISCOUNT_END_DATE)! })
	if (ogWallets.length > 0) ogDiscountGuards.allowList = some({ merkleRoot: getMerkleRoot(ogWallets) })

	const wlGuards: Record<string, any> = {
		botTax: some({ lamports: sol(BOT_TAX_SOL), lastInstruction: true }),
		solPayment: some({ lamports: sol(WL_PRICE_SOL), destination: paymentDest }),
		startDate: some({ date: dateToTimestamp(WL_START_DATE) ?? nowTimestamp }),
		mintLimit: some({ id: 3, limit: WL_MINT_LIMIT }),
	}
	if (WL_END_DATE) wlGuards.endDate = some({ date: dateToTimestamp(WL_END_DATE)! })
	if (wlWallets.length > 0) wlGuards.allowList = some({ merkleRoot: getMerkleRoot(wlWallets) })

	const publicGuards: Record<string, any> = {
		botTax: some({ lamports: sol(BOT_TAX_SOL), lastInstruction: true }),
		solPayment: some({ lamports: sol(PUBLIC_PRICE_SOL), destination: paymentDest }),
		startDate: some({ date: dateToTimestamp(PUBLIC_START_DATE) ?? nowTimestamp }),
	}
	if (PUBLIC_MINT_LIMIT != null) publicGuards.mintLimit = some({ id: 4, limit: PUBLIC_MINT_LIMIT })

	log(`\nNew config:`)
	log(`  OG Free: free, ${OG_FREE_MINT_LIMIT}/wallet, start: ${OG_FREE_START_DATE ?? 'now'}`)
	log(`  OG Discount: ${OG_DISCOUNT_PRICE_SOL} SOL, ${OG_DISCOUNT_MINT_LIMIT ?? 'unlimited'}/wallet, start: ${OG_DISCOUNT_START_DATE ?? 'now'}`)
	log(`  WL: ${WL_PRICE_SOL} SOL, ${WL_MINT_LIMIT}/wallet, start: ${WL_START_DATE ?? 'now'}`)
	log(`  Public: ${PUBLIC_PRICE_SOL} SOL, ${PUBLIC_MINT_LIMIT ?? 'unlimited'}/wallet, start: ${PUBLIC_START_DATE ?? 'now'}`)

	// Update guards
	log('\nUpdating guards on-chain...')
	await updateCandyGuard(umi, {
		candyGuard: guard.publicKey,
		guards: {},
		groups: [
			{ label: 'ogfree', guards: ogFreeGuards },
			{ label: 'ogdisc', guards: ogDiscountGuards },
			{ label: 'wl', guards: wlGuards },
			{ label: 'public', guards: publicGuards },
		],
	}).sendAndConfirm(umi)

	log('Guards updated successfully!')
	log(`\nVerify: https://core.metaplex.com/explorer/${cmAddress}?env=devnet`)
}

main().catch((err) => {
	console.error('Update failed:', err)
	process.exit(1)
})
