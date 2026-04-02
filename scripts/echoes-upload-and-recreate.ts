/**
 * Echoes Devnet: Upload assets to Irys + recreate CM with real metadata URIs
 *
 * 1. Uploads images + JSON metadata to Irys (devnet — free)
 * 2. Withdraws the old CM
 * 3. Creates a new CM with real URIs
 * 4. Inserts items with uploaded metadata URIs
 *
 * Usage: npx tsx scripts/echoes-upload-and-recreate.ts
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { mplCore } from '@metaplex-foundation/mpl-core'
import {
	mplCandyMachine,
	create as createCandyMachine,
	addConfigLines,
	deleteCandyMachine,
	deleteCandyGuard,
	fetchCandyMachine,
} from '@metaplex-foundation/mpl-core-candy-machine'
import {
	updateCollectionV1,
	createCollectionV2,
} from '@metaplex-foundation/mpl-core'
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys'
import {
	generateSigner,
	createSignerFromKeypair,
	signerIdentity,
	sol,
	some,
	createGenericFile,
} from '@metaplex-foundation/umi'
import { pluginAuthorityPair } from '@metaplex-foundation/mpl-core'
import { getDb } from '../src/server/db/index.ts'
import { pfpMints } from '../src/server/db/schema.ts'
import { eq, and } from 'drizzle-orm'
import fs from 'node:fs'
import path from 'node:path'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEVNET_RPC = 'https://api.devnet.solana.com'
const ASSETS_DIR = 'd:/dev/ai-art/ComfyUI/output/assets'
const ITEM_COUNT = 100 // Upload 100 for testing
const KEYPAIR_FILE = path.join(process.cwd(), 'echoes-fee-payer.json')
const ENV_LOCAL_PATH = path.join(process.cwd(), '.env.local')

const NEW_COLLECTION = process.argv.includes('--new-collection')

// Read current addresses from .env.local
function readEnvAddress(key: string): string {
	const envContent = fs.readFileSync(ENV_LOCAL_PATH, 'utf-8')
	const match = envContent.match(new RegExp(`^${key}=(.+)$`, 'm'))
	return match?.[1]?.trim() ?? ''
}

function updateEnvLocal(updates: Record<string, string>) {
	let content = fs.readFileSync(ENV_LOCAL_PATH, 'utf-8')
	for (const [key, value] of Object.entries(updates)) {
		const regex = new RegExp(`^${key}=.*$`, 'm')
		if (regex.test(content)) {
			content = content.replace(regex, `${key}=${value}`)
		}
	}
	fs.writeFileSync(ENV_LOCAL_PATH, content)
}

const OLD_CM_ADDRESS = readEnvAddress('PFP_CANDY_MACHINE_ADDRESS')
let COLLECTION_ADDRESS = readEnvAddress('PFP_COLLECTION_ADDRESS')

function log(msg: string) {
	console.log(`[echoes-upload] ${msg}`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	log('=== Echoes Devnet: Upload + Recreate CM ===')

	// 0. Pre-flight: ensure all required assets exist
	log('Running pre-flight checks...')
	const requiredFiles = ['collection.png', 'collection.json']
	const missing: string[] = []
	for (const file of requiredFiles) {
		const filePath = path.join(ASSETS_DIR, file)
		if (!fs.existsSync(filePath)) {
			missing.push(filePath)
		}
	}
	// Also check that at least the first item asset exists
	for (const ext of ['png', 'json']) {
		const filePath = path.join(ASSETS_DIR, `0.${ext}`)
		if (!fs.existsSync(filePath)) {
			missing.push(filePath)
		}
	}
	if (missing.length > 0) {
		console.error('\n❌ Pre-flight check failed! Missing required files:')
		for (const f of missing) {
			console.error(`   - ${f}`)
		}
		console.error(`\nMake sure all assets are in: ${ASSETS_DIR}`)
		process.exit(1)
	}
	log('Pre-flight checks passed ✓')

	// 0b. Clear devnet pfp_mints records
	log('Clearing devnet pfp_mints records...')
	const db = getDb()
	const deleted = await db.delete(pfpMints).where(eq(pfpMints.network, 'devnet')).returning({ id: pfpMints.id })
	log(`Deleted ${deleted.length} devnet mint records`)

	// 1. Initialize Umi with Irys uploader
	const secretKey = new Uint8Array(JSON.parse(fs.readFileSync(KEYPAIR_FILE, 'utf-8')))
	const umi = createUmi(DEVNET_RPC)
		.use(mplCore())
		.use(mplCandyMachine())
		.use(irysUploader({ address: 'https://devnet.irys.xyz' }))

	const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey)
	const signer = createSignerFromKeypair(umi, keypair)
	umi.use(signerIdentity(signer))

	const feePayerAddress = signer.publicKey.toString()
	log(`Fee payer: ${feePayerAddress}`)

	const balance = await umi.rpc.getBalance(signer.publicKey)
	log(`Balance: ${Number(balance.basisPoints) / 1e9} SOL`)

	// 2. Upload images and metadata for each item
	const uploadedUris: string[] = []

	for (let i = 0; i < ITEM_COUNT; i++) {
		const imgPath = path.join(ASSETS_DIR, `${i}.png`)
		const jsonPath = path.join(ASSETS_DIR, `${i}.json`)

		if (!fs.existsSync(imgPath) || !fs.existsSync(jsonPath)) {
			throw new Error(`Missing asset files for item ${i}: ${imgPath} or ${jsonPath}`)
		}

		log(`Uploading item ${i}/${ITEM_COUNT - 1}...`)

		// Upload image
		const imgBuffer = fs.readFileSync(imgPath)
		const imgFile = createGenericFile(imgBuffer, `${i}.png`, { contentType: 'image/png' })
		const [imgUri] = await umi.uploader.upload([imgFile])
		log(`  Image: ${imgUri}`)

		// Update JSON with real image URI, then upload
		const metadata = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
		metadata.image = imgUri
		metadata.properties.files[0].uri = imgUri

		const [jsonUri] = await umi.uploader.upload([
			createGenericFile(
				Buffer.from(JSON.stringify(metadata)),
				`${i}.json`,
				{ contentType: 'application/json' },
			),
		])
		log(`  Metadata: ${jsonUri}`)

		uploadedUris.push(jsonUri)
	}

	log(`\nAll ${ITEM_COUNT} items uploaded!`)

	// 2b. Upload collection image + metadata
	const collectionImgPath = path.join(ASSETS_DIR, 'collection.png')
	const collectionJsonPath = path.join(ASSETS_DIR, 'collection.json')

	log('\nUploading collection image + metadata...')
	const collImgBuffer = fs.readFileSync(collectionImgPath)
	const collImgFile = createGenericFile(collImgBuffer, 'collection.png', { contentType: 'image/png' })
	const [collImgUri] = await umi.uploader.upload([collImgFile])
	log(`  Collection image: ${collImgUri}`)

	const collMeta = JSON.parse(fs.readFileSync(collectionJsonPath, 'utf-8'))
	collMeta.image = collImgUri
	if (collMeta.properties?.files?.[0]) {
		collMeta.properties.files[0].uri = collImgUri
	}

	const [collJsonUri] = await umi.uploader.upload([
		createGenericFile(
			Buffer.from(JSON.stringify(collMeta)),
			'collection.json',
			{ contentType: 'application/json' },
		),
	])
	log(`  Collection metadata: ${collJsonUri}`)

	if (NEW_COLLECTION) {
		// Create a brand new collection
		log('  Creating new collection...')
		const collectionSigner = generateSigner(umi)
		await createCollectionV2(umi, {
			collection: collectionSigner,
			name: collMeta.name || 'Echoes',
			uri: collJsonUri,
			plugins: [
				pluginAuthorityPair({
					type: 'Royalties',
					data: {
						basisPoints: 500,
						creators: [{ address: signer.publicKey, percentage: 100 }],
						ruleSet: { __kind: 'None' },
					},
				}),
			],
		}).sendAndConfirm(umi)
		COLLECTION_ADDRESS = collectionSigner.publicKey.toString()
		log(`  New collection created: ${COLLECTION_ADDRESS}`)
	} else {
		// Update existing collection's URI on-chain
		log('  Updating collection URI on-chain...')
		await updateCollectionV1(umi, {
			collection: COLLECTION_ADDRESS as any,
			newUri: collJsonUri,
		}).sendAndConfirm(umi)
		log('  Collection updated!')
	}

	// 3. Delete old CM (withdraw rent)
	log(`\nWithdrawing old CM: ${OLD_CM_ADDRESS}...`)
	try {
		const cmPk = OLD_CM_ADDRESS as any
		const oldCm = await fetchCandyMachine(umi, cmPk)
		if (oldCm) {
			const guardPk = oldCm.mintAuthority
			await deleteCandyGuard(umi, { candyGuard: guardPk }).sendAndConfirm(umi)
			await deleteCandyMachine(umi, { candyMachine: cmPk }).sendAndConfirm(umi)
			log('Old CM deleted')
		}
	} catch (err) {
		log(`Could not delete old CM (may already be gone): ${err instanceof Error ? err.message : err}`)
	}

	// 4. Create new CM with real URIs
	log('\nCreating new Candy Machine...')
	const candyMachineSigner = generateSigner(umi)

	// Calculate URI prefix and length from uploaded URIs
	// Irys devnet returns https://gateway.irys.xyz/<HASH>, mainnet returns https://arweave.net/<HASH>
	// Detect the common prefix from the first uploaded URI
	const firstUri = uploadedUris[0]
	const lastSlash = firstUri.lastIndexOf('/') + 1
	const prefix = firstUri.substring(0, lastSlash)
	log(`Detected URI prefix: ${prefix}`)
	const maxUriLength = Math.max(...uploadedUris.map(u => u.replace(prefix, '').length))

	const createCmTx = await createCandyMachine(umi, {
		candyMachine: candyMachineSigner,
		collection: COLLECTION_ADDRESS as any,
		collectionUpdateAuthority: signer,
		itemsAvailable: ITEM_COUNT,
		isMutable: true,
		configLineSettings: some({
			prefixName: 'Echo #',
			nameLength: 4,
			prefixUri: prefix,
			uriLength: maxUriLength,
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

	const newCmAddress = candyMachineSigner.publicKey.toString()
	log(`New CM created: ${newCmAddress}`)

	// 5. Insert items with real URIs (batched — ~10 per tx to stay within size limits)
	const BATCH_SIZE = 10
	const configLines = uploadedUris.map((uri, i) => ({
		name: String(i).padStart(4, ' '),
		uri: uri.replace(prefix, '').padEnd(maxUriLength, ' '),
	}))

	const totalBatches = Math.ceil(configLines.length / BATCH_SIZE)
	for (let batch = 0; batch < totalBatches; batch++) {
		const start = batch * BATCH_SIZE
		const end = Math.min(start + BATCH_SIZE, configLines.length)
		const chunk = configLines.slice(start, end)

		log(`Inserting items ${start}-${end - 1} (batch ${batch + 1}/${totalBatches})...`)
		const addLinesTx = addConfigLines(umi, {
			candyMachine: candyMachineSigner.publicKey,
			index: start,
			configLines: chunk,
		})
		await addLinesTx.sendAndConfirm(umi)
	}

	log(`${ITEM_COUNT} items inserted with real metadata!`)

	// 6. Update .env.local and output
	const envUpdates: Record<string, string> = {
		PFP_CANDY_MACHINE_ADDRESS: newCmAddress,
	}
	if (NEW_COLLECTION) {
		envUpdates.PFP_COLLECTION_ADDRESS = COLLECTION_ADDRESS
	}
	updateEnvLocal(envUpdates)
	log(`\n.env.local updated: ${Object.keys(envUpdates).join(', ')}`)

	console.log('\n' + '='.repeat(60))
	console.log(`PFP_CANDY_MACHINE_ADDRESS=${newCmAddress}`)
	if (NEW_COLLECTION) {
		console.log(`PFP_COLLECTION_ADDRESS=${COLLECTION_ADDRESS}`)
	}
	console.log('='.repeat(60))
	console.log(`\nCM: https://core.metaplex.com/explorer/${newCmAddress}?env=devnet`)
	console.log(`Collection: https://core.metaplex.com/explorer/${COLLECTION_ADDRESS}?env=devnet`)

	// Log all uploaded URIs for reference
	console.log('\nUploaded metadata URIs:')
	uploadedUris.forEach((uri, i) => console.log(`  ${i}: ${uri}`))
}

main().catch((err) => {
	console.error('Upload failed:', err)
	process.exit(1)
})
