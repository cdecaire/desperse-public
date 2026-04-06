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
	getMerkleRoot,
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
import { eq } from 'drizzle-orm'
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
	OG_FREE_START_DATE,
	OG_FREE_END_DATE,
	OG_DISCOUNT_START_DATE,
	OG_DISCOUNT_END_DATE,
	WL_START_DATE,
	WL_END_DATE,
	PUBLIC_START_DATE,
	BOT_TAX_SOL,
} from './echoes-guard-config'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEVNET_RPC = 'https://api.devnet.solana.com'
const ASSETS_DIR = 'd:/dev/ai-art/ComfyUI/output/assets'
const KEYPAIR_FILE = path.join(process.cwd(), 'echoes-fee-payer.json')
const ENV_LOCAL_PATH = path.join(process.cwd(), '.env.local')

const NEW_COLLECTION = process.argv.includes('--new-collection')

// --count N: number of items to upload (auto-detected from assets/ if omitted)
function parseCount(): number {
	const idx = process.argv.indexOf('--count')
	if (idx !== -1 && process.argv[idx + 1]) {
		const n = parseInt(process.argv[idx + 1], 10)
		if (Number.isNaN(n) || n <= 0) throw new Error(`Invalid --count: ${process.argv[idx + 1]}`)
		return n
	}
	// Auto-detect: count N.png files in assets dir (exclude collection.png)
	const pngs = fs.readdirSync(ASSETS_DIR).filter(f => /^\d+\.png$/.test(f))
	if (pngs.length === 0) throw new Error(`No numbered .png files found in ${ASSETS_DIR}`)
	return pngs.length
}

const ITEM_COUNT = parseCount()

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

const MAX_UPLOAD_RETRIES = 5
const UPLOAD_PROGRESS_FILE = path.join(ASSETS_DIR, '.upload-progress.json')

interface UploadProgress {
	uploadedUris: (string | null)[]
	collectionImgUri?: string
	collectionJsonUri?: string
}

function loadProgress(): UploadProgress | null {
	if (!fs.existsSync(UPLOAD_PROGRESS_FILE)) return null
	try {
		return JSON.parse(fs.readFileSync(UPLOAD_PROGRESS_FILE, 'utf-8'))
	} catch { return null }
}

function saveProgress(progress: UploadProgress) {
	fs.writeFileSync(UPLOAD_PROGRESS_FILE, JSON.stringify(progress, null, 2))
}

function clearProgress() {
	if (fs.existsSync(UPLOAD_PROGRESS_FILE)) fs.unlinkSync(UPLOAD_PROGRESS_FILE)
}

async function uploadWithRetry(umi: any, file: any, label: string): Promise<string> {
	for (let attempt = 1; attempt <= MAX_UPLOAD_RETRIES; attempt++) {
		try {
			const [uri] = await umi.uploader.upload([file])
			if (uri) return uri
		} catch (err) {
			if (attempt === MAX_UPLOAD_RETRIES) throw err
		}
		if (attempt < MAX_UPLOAD_RETRIES) {
			const delay = 2000 * attempt
			log(`  Upload failed for ${label}, retrying in ${delay / 1000}s (${attempt}/${MAX_UPLOAD_RETRIES})...`)
			await new Promise(r => setTimeout(r, delay))
		}
	}
	throw new Error(`Upload failed after ${MAX_UPLOAD_RETRIES} attempts for ${label}`)
}

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

	// 2. Upload images and metadata for each item (with resume support)
	const progress = loadProgress()
	const uploadedUris: (string | null)[] = progress?.uploadedUris ?? new Array(ITEM_COUNT).fill(null)
	const alreadyUploaded = uploadedUris.filter(u => u != null).length

	if (alreadyUploaded > 0) {
		log(`Resuming upload — ${alreadyUploaded}/${ITEM_COUNT} items already uploaded`)
	}

	for (let i = 0; i < ITEM_COUNT; i++) {
		if (uploadedUris[i]) {
			continue // Already uploaded in previous run
		}

		const imgPath = path.join(ASSETS_DIR, `${i}.png`)
		const jsonPath = path.join(ASSETS_DIR, `${i}.json`)

		if (!fs.existsSync(imgPath) || !fs.existsSync(jsonPath)) {
			throw new Error(`Missing asset files for item ${i}: ${imgPath} or ${jsonPath}`)
		}

		log(`Uploading item ${i}/${ITEM_COUNT - 1}...`)

		// Upload image (with retry)
		const imgBuffer = fs.readFileSync(imgPath)
		const imgFile = createGenericFile(imgBuffer, `${i}.png`, { contentType: 'image/png' })
		const imgUri = await uploadWithRetry(umi, imgFile, `${i}.png`)
		log(`  Image: ${imgUri}`)

		// Update JSON with real image URI, then upload
		const metadata = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
		metadata.image = imgUri
		metadata.properties.files[0].uri = imgUri

		const jsonFile = createGenericFile(
			Buffer.from(JSON.stringify(metadata)),
			`${i}.json`,
			{ contentType: 'application/json' },
		)
		const jsonUri = await uploadWithRetry(umi, jsonFile, `${i}.json`)
		log(`  Metadata: ${jsonUri}`)

		uploadedUris[i] = jsonUri
		saveProgress({ uploadedUris })
	}

	log(`\nAll ${ITEM_COUNT} items uploaded!`)

	// 2b. Upload collection image + metadata
	const collectionImgPath = path.join(ASSETS_DIR, 'collection.png')
	const collectionJsonPath = path.join(ASSETS_DIR, 'collection.json')

	log('\nUploading collection image + metadata...')
	const collImgBuffer = fs.readFileSync(collectionImgPath)
	const collImgFile = createGenericFile(collImgBuffer, 'collection.png', { contentType: 'image/png' })
	const collImgUri = progress?.collectionImgUri ?? await uploadWithRetry(umi, collImgFile, 'collection.png')
	log(`  Collection image: ${collImgUri}`)

	const collMeta = JSON.parse(fs.readFileSync(collectionJsonPath, 'utf-8'))
	collMeta.image = collImgUri
	if (collMeta.properties?.files?.[0]) {
		collMeta.properties.files[0].uri = collImgUri
	}

	const collJsonFile = createGenericFile(
		Buffer.from(JSON.stringify(collMeta)),
		'collection.json',
		{ contentType: 'application/json' },
	)
	const collJsonUri = progress?.collectionJsonUri ?? await uploadWithRetry(umi, collJsonFile, 'collection.json')
	log(`  Collection metadata: ${collJsonUri}`)

	// Save final upload state before CM creation
	saveProgress({ uploadedUris, collectionImgUri: collImgUri, collectionJsonUri: collJsonUri })

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
	log('Guard groups: OG Free → OG Discount → Whitelist → Public')
	const candyMachineSigner = generateSigner(umi)

	// Calculate URI prefix and length from uploaded URIs
	const firstUri = uploadedUris[0]
	const lastSlash = firstUri.lastIndexOf('/') + 1
	const prefix = firstUri.substring(0, lastSlash)
	log(`Detected URI prefix: ${prefix}`)
	const maxUriLength = Math.max(...uploadedUris.map(u => u.replace(prefix, '').length))

	const nowTimestamp = BigInt(Math.floor(Date.now() / 1000))
	const configLineSettings = some({
		prefixName: 'Echo #',
		nameLength: 4,
		prefixUri: prefix,
		uriLength: maxUriLength,
		isSequential: false,
	})

	// Payment destination — use PFP_PAYMENT_WALLET from env to match mint server
	const paymentWallet = readEnvAddress('PFP_PAYMENT_WALLET')
	const paymentDest = paymentWallet ? (paymentWallet as any) : signer.publicKey
	log(`Payment destination: ${paymentWallet || feePayerAddress} ${paymentWallet ? '' : '(fee payer fallback)'}`)

	const ogWallets = loadOgAllowlistWallets()
	const wlWallets = loadWlAllowlistWallets()
	log(`OG allowlist: ${ogWallets.length} wallets`)
	log(`WL allowlist: ${wlWallets.length} wallets`)

	// OG Free
	const ogFreeGuards: Record<string, any> = {
		botTax: some({ lamports: sol(BOT_TAX_SOL), lastInstruction: true }),
		startDate: some({ date: dateToTimestamp(OG_FREE_START_DATE) ?? nowTimestamp }),
		mintLimit: some({ id: 1, limit: OG_FREE_MINT_LIMIT }),
	}
	if (OG_FREE_END_DATE) ogFreeGuards.endDate = some({ date: dateToTimestamp(OG_FREE_END_DATE)! })
	if (ogWallets.length > 0) ogFreeGuards.allowList = some({ merkleRoot: getMerkleRoot(ogWallets) })

	// OG Discount
	const ogDiscountGuards: Record<string, any> = {
		botTax: some({ lamports: sol(BOT_TAX_SOL), lastInstruction: true }),
		solPayment: some({ lamports: sol(OG_DISCOUNT_PRICE_SOL), destination: paymentDest }),
		startDate: some({ date: dateToTimestamp(OG_DISCOUNT_START_DATE) ?? nowTimestamp }),
	}
	if (OG_DISCOUNT_MINT_LIMIT != null) ogDiscountGuards.mintLimit = some({ id: 2, limit: OG_DISCOUNT_MINT_LIMIT })
	if (OG_DISCOUNT_END_DATE) ogDiscountGuards.endDate = some({ date: dateToTimestamp(OG_DISCOUNT_END_DATE)! })
	if (ogWallets.length > 0) ogDiscountGuards.allowList = some({ merkleRoot: getMerkleRoot(ogWallets) })

	// WL
	const wlGuards: Record<string, any> = {
		botTax: some({ lamports: sol(BOT_TAX_SOL), lastInstruction: true }),
		solPayment: some({ lamports: sol(WL_PRICE_SOL), destination: paymentDest }),
		startDate: some({ date: dateToTimestamp(WL_START_DATE) ?? nowTimestamp }),
		mintLimit: some({ id: 3, limit: WL_MINT_LIMIT }),
	}
	if (WL_END_DATE) wlGuards.endDate = some({ date: dateToTimestamp(WL_END_DATE)! })
	if (wlWallets.length > 0) wlGuards.allowList = some({ merkleRoot: getMerkleRoot(wlWallets) })

	// Public
	const publicGuards: Record<string, any> = {
		botTax: some({ lamports: sol(BOT_TAX_SOL), lastInstruction: true }),
		solPayment: some({ lamports: sol(PUBLIC_PRICE_SOL), destination: paymentDest }),
		startDate: some({ date: dateToTimestamp(PUBLIC_START_DATE) ?? nowTimestamp }),
	}

	log(`OG Free: free, ${OG_FREE_MINT_LIMIT}/wallet | OG Discount: ${OG_DISCOUNT_PRICE_SOL} SOL, ${OG_DISCOUNT_MINT_LIMIT ?? 'unlimited'}/wallet`)
	log(`WL: ${WL_PRICE_SOL} SOL, ${WL_MINT_LIMIT}/wallet | Public: ${PUBLIC_PRICE_SOL} SOL, unlimited`)

	const createCmTx = await createCandyMachine(umi, {
		candyMachine: candyMachineSigner,
		collection: COLLECTION_ADDRESS as any,
		collectionUpdateAuthority: signer,
		itemsAvailable: ITEM_COUNT,
		isMutable: true,
		configLineSettings,
		guards: {},
		groups: [
			{ label: 'ogfree', guards: ogFreeGuards },
			{ label: 'ogdisc', guards: ogDiscountGuards },
			{ label: 'wl', guards: wlGuards },
			{ label: 'public', guards: publicGuards },
		],
	})
	await createCmTx.sendAndConfirm(umi)

	const newCmAddress = candyMachineSigner.publicKey.toString()
	log(`New CM created: ${newCmAddress}`)

	// 5. Insert items with real URIs (batched — ~10 per tx to stay within size limits)
	const BATCH_SIZE = 10
	const configLines = uploadedUris.map((uri, i) => ({
		name: String(i).padStart(4, ' '),
		uri: uri!.replace(prefix, '').padEnd(maxUriLength, ' '),
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

	// Clear progress file on success
	clearProgress()
	log('Upload progress file cleared.')
}

main().catch((err) => {
	console.error('Upload failed:', err)
	process.exit(1)
})
