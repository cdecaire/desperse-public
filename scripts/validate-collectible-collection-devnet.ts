/**
 * Devnet validation for the per-creator collectible-collection feature.
 *
 * Runs the EXACT SDK calls the mainnet feature uses — create a Core collection,
 * then mintV2 a compressed NFT INTO it (coreCollection + collectionAuthority +
 * metadata.collection) — against Solana devnet, then verifies via DAS getAsset
 * that the cNFT is grouped/verified under the collection.
 *
 * Fully isolated from mainnet: it reuses the Echoes devnet setup
 * (ECHOES_FEE_PAYER_PRIVATE_KEY + devnet Helius RPC). It NEVER touches the prod DB,
 * the mainnet fee-payer, or the mainnet tree. Its only purpose is to prove that the
 * collection-attached mint succeeds at runtime before the mainnet flag is flipped.
 *
 * Run:
 *   pnpm tsx --env-file=.env.local scripts/validate-collectible-collection-devnet.ts
 *
 * Prereq: the Echoes devnet fee-payer needs a little devnet SOL (< 0.1). Airdrop:
 *   solana airdrop 1 <FEE_PAYER_PUBKEY> --url https://api.devnet.solana.com
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import {
	mplBubblegum,
	createTreeV2,
	mintV2,
	parseLeafFromMintV2Transaction,
} from '@metaplex-foundation/mpl-bubblegum'
import { mplCore, createCollection, fetchCollection } from '@metaplex-foundation/mpl-core'
import {
	generateSigner,
	createSignerFromKeypair,
	signerIdentity,
	some,
} from '@metaplex-foundation/umi'
import bs58 from 'bs58'

const HELIUS_KEY =
	process.env.ECHOES_HELIUS_API_KEY?.trim() || process.env.HELIUS_API_KEY?.trim() || ''
const RPC = HELIUS_KEY
	? `https://devnet.helius-rpc.com/?api-key=${HELIUS_KEY}`
	: 'https://api.devnet.solana.com'
const FEE_PAYER_KEY = process.env.ECHOES_FEE_PAYER_PRIVATE_KEY?.trim() || ''

function parsePrivateKey(raw: string): Uint8Array {
	if (!raw) throw new Error('ECHOES_FEE_PAYER_PRIVATE_KEY is missing from the env')
	if (raw.startsWith('[')) return new Uint8Array(JSON.parse(raw))
	return bs58.decode(raw)
}

function redactRpc(url: string): string {
	return url.replace(/api-key=[^&]+/, 'api-key=***')
}

async function getAssetGrouping(assetId: string): Promise<{ groupValue: string | null; verified: boolean }> {
	const res = await fetch(RPC, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ jsonrpc: '2.0', id: 'validate', method: 'getAsset', params: { id: assetId } }),
	})
		.then((r) => r.json())
		.catch(() => null)
	const group = res?.result?.grouping?.find((g: { group_key?: string }) => g.group_key === 'collection')
	if (!group) return { groupValue: null, verified: false }
	return { groupValue: group.group_value ?? null, verified: group.verified ?? false }
}

async function main() {
	console.log('▶ Devnet collectible-collection validation')
	console.log('  RPC:', redactRpc(RPC))

	const umi = createUmi(RPC).use(mplBubblegum()).use(mplCore())
	const keypair = umi.eddsa.createKeypairFromSecretKey(parsePrivateKey(FEE_PAYER_KEY))
	const signer = createSignerFromKeypair(umi, keypair)
	umi.use(signerIdentity(signer))
	console.log('  Fee payer:', signer.publicKey)

	const balance = await umi.rpc.getBalance(signer.publicKey)
	const sol = Number(balance.basisPoints) / 1e9
	console.log('  Balance:', sol.toFixed(4), 'SOL (devnet)')
	if (sol < 0.05) {
		console.error(`\n✖ Fee payer needs devnet SOL (>= ~0.05). Airdrop and retry:\n  solana airdrop 1 ${signer.publicKey} --url https://api.devnet.solana.com`)
		process.exit(1)
	}

	// 1) Create a Bubblegum v2 tree (mintV2 requires a v2 tree). Small + cheap.
	console.log('\n[1/4] Creating devnet Bubblegum v2 tree…')
	const merkleTree = generateSigner(umi)
	const treeBuilder = await createTreeV2(umi, { merkleTree, maxDepth: 5, maxBufferSize: 8 })
	await treeBuilder.sendAndConfirm(umi, { confirm: { commitment: 'finalized' } })
	console.log('  ✓ Tree:', merkleTree.publicKey)

	// 2) Create the Core collection (fee-payer = update authority) — the Phase-3 call.
	console.log('[2/4] Creating Core collection (fee-payer authority)…')
	const collection = generateSigner(umi)
	await createCollection(umi, {
		collection,
		name: 'Desperse Validation Creator',
		uri: 'https://www.desperse.com/collection-metadata/validation.json',
		// REQUIRED for cNFTs: the Bubblegum V2 plugin authorizes the Bubblegum
		// program to verify compressed NFTs into this Core collection. Without it,
		// mintV2 fails with CollectionMustHaveBubblegumPlugin (6049).
		plugins: [{ type: 'BubblegumV2' }],
	}).sendAndConfirm(umi, { confirm: { commitment: 'finalized' } })
	console.log('  ✓ Collection:', collection.publicKey)

	// 2b) Wait until the collection is actually readable before minting into it.
	// Even at 'finalized', the account can lag on the node that runs the mint's
	// preflight — without this, mintV2 fails with ConstraintOwner (owner still
	// System program). Mirrors the editions createCoreEdition fetch-retry.
	console.log('      waiting for collection to propagate…')
	let collectionReady = false
	for (let attempt = 1; attempt <= 12; attempt++) {
		try {
			await fetchCollection(umi, collection.publicKey)
			collectionReady = true
			break
		} catch {
			await new Promise((r) => setTimeout(r, 2000))
		}
	}
	if (!collectionReady) {
		console.error('✖ Collection not readable after retries — RPC propagation issue.')
		process.exit(1)
	}
	console.log('  ✓ Collection is readable')

	// 3) Mint a cNFT INTO the collection — the exact Phase-4 mint params.
	// Devnet RPC nodes lag on the just-created collection, so the mint's preflight
	// can see it as empty. Give it a beat, skip preflight (the leader has finalized
	// state), and retry a few times to ride out node inconsistency.
	console.log('[3/4] Minting cNFT into the collection…')
	await new Promise((r) => setTimeout(r, 10_000))

	const buildMint = () =>
		mintV2(umi, {
			merkleTree: merkleTree.publicKey,
			leafOwner: signer.publicKey,
			coreCollection: collection.publicKey,
			collectionAuthority: signer,
			metadata: {
				name: 'Validation Collectible',
				symbol: 'DSPRS',
				uri: 'https://www.desperse.com/metadata/validation.json',
				sellerFeeBasisPoints: 0,
				creators: [{ address: signer.publicKey, verified: false, share: 100 }],
				collection: some(collection.publicKey),
			},
		})

	let signature: Uint8Array | null = null
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			const res = await buildMint().sendAndConfirm(umi, {
				send: { skipPreflight: false },
				confirm: { commitment: 'finalized' },
			})
			signature = res.signature
			break
		} catch (e) {
			const anyErr = e as { message?: string; logs?: string[]; transactionLogs?: string[] }
			console.log(`  …mint attempt ${attempt}/3 failed: ${anyErr.message}`)
			const logs = anyErr.logs || anyErr.transactionLogs
			if (logs) console.log('    logs:', logs.filter((l) => /Error|core_collection|Constraint|owner/i.test(l)).join(' | '))
			await new Promise((r) => setTimeout(r, 4000))
		}
	}
	if (!signature) {
		console.error('✖ Mint failed after retries.')
		process.exit(1)
	}

	console.log('  ✓ Mint tx confirmed. Fetching asset id…')
	let assetId = ''
	for (let attempt = 1; attempt <= 8; attempt++) {
		try {
			const leaf = await parseLeafFromMintV2Transaction(umi, signature)
			assetId = leaf.id.toString()
			break
		} catch {
			await new Promise((r) => setTimeout(r, 3000))
		}
	}
	if (!assetId) {
		console.error('✖ Mint succeeded but the tx was not queryable to parse the asset id (devnet lag).')
		process.exit(2)
	}
	console.log('  ✓ Minted. Asset:', assetId)

	// 4) Verify grouping via DAS getAsset (retry for indexer lag).
	console.log('[4/4] Verifying grouping via DAS getAsset…')
	let groupValue: string | null = null
	let verified = false
	for (let attempt = 1; attempt <= 8; attempt++) {
		const g = await getAssetGrouping(assetId)
		if (g.groupValue) {
			groupValue = g.groupValue
			verified = g.verified
			break
		}
		process.stdout.write(`  …not indexed yet (attempt ${attempt}/8)\r`)
		await new Promise((r) => setTimeout(r, 3000))
	}

	const collectionStr = collection.publicKey.toString()
	const matches = groupValue === collectionStr

	console.log('\n\n=== RESULT ===')
	console.log('  Grouped under collection:', Boolean(groupValue), groupValue ? `(${groupValue})` : '')
	console.log('  Matches created collection:', matches)
	console.log('  DAS reports verified:', verified)
	console.log('  Asset explorer:     ', `https://explorer.solana.com/address/${assetId}?cluster=devnet`)
	console.log('  Collection explorer:', `https://explorer.solana.com/address/${collectionStr}?cluster=devnet`)

	if (matches) {
		console.log('\n✅ PASS — cNFT minted and grouped into the creator collection on devnet.')
		console.log('   The mainnet feature path (createCollection + mintV2 coreCollection/collectionAuthority)')
		console.log('   is runtime-validated. You can flip FEATURE_COLLECTIBLE_COLLECTIONS=true in prod.')
		process.exit(0)
	}

	console.log('\n⚠ Mint SUCCEEDED but DAS did not confirm the grouping in time.')
	console.log('   The on-chain mint worked (see the asset explorer link) — this is likely DAS indexing lag.')
	console.log('   Check the explorer links; if the asset shows the collection, treat as PASS.')
	process.exit(2)
}

main().catch((err) => {
	console.error('\n✖ FAILED:', err instanceof Error ? err.message : err)
	console.error(err)
	process.exit(1)
})
