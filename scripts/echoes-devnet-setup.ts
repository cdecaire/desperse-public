/**
 * Echoes Devnet Setup Script
 *
 * Creates everything needed for devnet testing:
 * 1. Generates a fee payer keypair (or uses existing)
 * 2. Airdrops devnet SOL
 * 3. Creates a Core Collection
 * 4. Creates a Core Candy Machine with guard groups
 * 5. Inserts test items (10 for initial testing)
 * 6. Outputs env vars to add to .env.local
 *
 * Usage: npx tsx scripts/echoes-devnet-setup.ts
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { mplCore } from '@metaplex-foundation/mpl-core'
import {
	mplCandyMachine,
	create as createCandyMachine,
	addConfigLines,
} from '@metaplex-foundation/mpl-core-candy-machine'
import {
	createCollectionV2,
} from '@metaplex-foundation/mpl-core'
import {
	generateSigner,
	createSignerFromKeypair,
	signerIdentity,
	sol,
	some,
} from '@metaplex-foundation/umi'
import { pluginAuthorityPair } from '@metaplex-foundation/mpl-core'
import bs58 from 'bs58'
import fs from 'node:fs'
import path from 'node:path'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEVNET_RPC = process.env.ECHOES_HELIUS_API_KEY
	? `https://devnet.helius-rpc.com/?api-key=${process.env.ECHOES_HELIUS_API_KEY}`
	: 'https://api.devnet.solana.com'

const TEST_ITEM_COUNT = 10
const KEYPAIR_FILE = path.join(process.cwd(), 'echoes-fee-payer.json')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg: string) {
	console.log(`[echoes-setup] ${msg}`)
}

async function airdrop(_umi: ReturnType<typeof createUmi>, address: string, amount: number) {
	log(`Airdropping ${amount} SOL to ${address.slice(0, 8)}...`)
	try {
		// Use raw RPC airdrop
		const response = await fetch(DEVNET_RPC, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: 1,
				method: 'requestAirdrop',
				params: [address, amount * 1_000_000_000],
			}),
		})
		const data = await response.json() as any
		if (data.error) {
			throw new Error(data.error.message)
		}
		log(`Airdrop tx: ${data.result}`)

		// Wait for confirmation
		log('Waiting for airdrop confirmation...')
		await new Promise(resolve => setTimeout(resolve, 15000))
	} catch (err) {
		log(`Airdrop failed: ${err instanceof Error ? err.message : err}`)
		log('You may need to manually fund the wallet via https://faucet.solana.com')
	}
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	log('=== Echoes Devnet Setup ===')
	log(`RPC: ${DEVNET_RPC.includes('helius') ? 'Helius devnet' : 'public devnet'}`)

	// 1. Initialize Umi
	const umi = createUmi(DEVNET_RPC)
		.use(mplCore())
		.use(mplCandyMachine())

	// 2. Load or generate fee payer keypair
	let secretKey: Uint8Array

	if (fs.existsSync(KEYPAIR_FILE)) {
		log(`Loading existing keypair from ${KEYPAIR_FILE}`)
		const raw = JSON.parse(fs.readFileSync(KEYPAIR_FILE, 'utf-8'))
		secretKey = new Uint8Array(raw)
	} else {
		log('Generating new fee payer keypair...')
		const kp = umi.eddsa.generateKeypair()
		secretKey = kp.secretKey
		// Save as JSON array (compatible with Solana CLI)
		fs.writeFileSync(KEYPAIR_FILE, JSON.stringify(Array.from(secretKey)))
		log(`Keypair saved to ${KEYPAIR_FILE}`)
	}

	const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey)
	const signer = createSignerFromKeypair(umi, keypair)
	umi.use(signerIdentity(signer))

	const feePayerAddress = signer.publicKey.toString()
	log(`Fee payer address: ${feePayerAddress}`)

	// 3. Check balance and airdrop if needed
	const balance = await umi.rpc.getBalance(signer.publicKey)
	const balanceSol = Number(balance.basisPoints) / 1_000_000_000
	log(`Current balance: ${balanceSol} SOL`)

	if (balanceSol < 2) {
		await airdrop(umi, feePayerAddress, 2)
		// Check again
		const newBalance = await umi.rpc.getBalance(signer.publicKey)
		log(`Balance after airdrop: ${Number(newBalance.basisPoints) / 1_000_000_000} SOL`)
	}

	// 4. Create Core Collection
	log('Creating Core Collection...')
	const collectionSigner = generateSigner(umi)

	// TODO: For mainnet, replace this address with the actual creator/team wallet
	const creatorAddress = signer.publicKey

	const createCollectionTx = createCollectionV2(umi, {
		collection: collectionSigner,
		name: 'Echoes (Devnet Test)',
		uri: 'https://arweave.net/placeholder-collection-metadata',
		plugins: [
			pluginAuthorityPair({
				type: 'Royalties',
				data: {
					basisPoints: 500, // 5% royalties
					creators: [
						{ address: creatorAddress, percentage: 100 },
					],
					ruleSet: { __kind: 'None' },
				},
			}),
		],
	})
	await createCollectionTx.sendAndConfirm(umi)

	const collectionAddress = collectionSigner.publicKey.toString()
	log(`Collection created: ${collectionAddress}`)
	log(`Explorer: https://core.metaplex.com/explorer/${collectionAddress}?env=devnet`)

	// 5. Create Candy Machine
	log(`Creating Candy Machine with ${TEST_ITEM_COUNT} items...`)
	const candyMachineSigner = generateSigner(umi)

	const createCmTx = await createCandyMachine(umi, {
		candyMachine: candyMachineSigner,
		collection: collectionSigner.publicKey,
		collectionUpdateAuthority: signer,
		itemsAvailable: TEST_ITEM_COUNT,
		isMutable: true,
		configLineSettings: some({
			prefixName: 'Echo #',
			nameLength: 4,
			prefixUri: 'https://arweave.net/',
			uriLength: 47,
			isSequential: false,
		}),
		guards: {
			botTax: some({ lamports: sol(0.01), lastInstruction: true }),
			solPayment: some({ lamports: sol(0.01), destination: signer.publicKey }),
			startDate: some({ date: BigInt(Math.floor(Date.now() / 1000)) }),
		},
		groups: [],
	})
	await createCmTx.sendAndConfirm(umi)

	const candyMachineAddress = candyMachineSigner.publicKey.toString()
	log(`Candy Machine created: ${candyMachineAddress}`)
	log(`Explorer: https://core.metaplex.com/explorer/${candyMachineAddress}?env=devnet`)

	// 6. Insert test items
	log(`Inserting ${TEST_ITEM_COUNT} test items...`)

	const items = Array.from({ length: TEST_ITEM_COUNT }, (_, i) => ({
		name: String(i).padStart(4, ' '),
		uri: `placeholder-echo-${i}`.padEnd(47, '-'),
	}))

	const addLinesTx = addConfigLines(umi, {
		candyMachine: candyMachineSigner.publicKey,
		index: 0,
		configLines: items,
	})
	await addLinesTx.sendAndConfirm(umi)

	log(`${TEST_ITEM_COUNT} items inserted!`)

	// 7. Output env vars
	const feePayerBase58 = bs58.encode(secretKey)

	console.log('\n' + '='.repeat(60))
	console.log('Add these to your .env.local:')
	console.log('='.repeat(60))
	console.log(`ECHOES_FEE_PAYER_PRIVATE_KEY=${feePayerBase58}`)
	console.log(`PFP_CANDY_MACHINE_ADDRESS=${candyMachineAddress}`)
	console.log(`PFP_COLLECTION_ADDRESS=${collectionAddress}`)
	console.log(`PFP_PAYMENT_WALLET=${feePayerAddress}`)
	console.log(`VITE_PFP_MINT_ENABLED=true`)
	console.log(`VITE_PFP_MINT_PHASE=public`)
	console.log('='.repeat(60))
	console.log('\nAlso ensure ECHOES_HELIUS_API_KEY is set (your existing Helius key works for devnet)')
	console.log(`\nFee payer address: ${feePayerAddress}`)
	console.log(`Collection: https://core.metaplex.com/explorer/${collectionAddress}?env=devnet`)
	console.log(`Candy Machine: https://core.metaplex.com/explorer/${candyMachineAddress}?env=devnet`)
}

main().catch((err) => {
	console.error('Setup failed:', err)
	process.exit(1)
})
