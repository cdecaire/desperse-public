/**
 * One-off: refresh an existing creator-collection's off-chain metadata JSON and
 * repoint the on-chain Core collection `uri` at it.
 *
 * Why: `generateCreatorCollectionMetadata` gained a `properties` block (files +
 * category) after some collections were already minted with the thinner JSON.
 * `ensureCreatorCollection` never re-touches an existing collection (it returns
 * early once `users.collection_mint` is set), so those need a deliberate refresh.
 *
 * What it does (per collection mint):
 *   1) Load the owning creator from the DB.
 *   2) Regenerate the metadata via the SAME generator the mint path uses.
 *   3) Upload a fresh JSON (Vercel Blob — same as first-mint; NOT Arweave).
 *   4) `updateCollection` to repoint the on-chain `uri`. Authority = the server
 *      fee-payer (umi identity), which is this collection's update authority.
 *
 * Non-destructive: the collection is mutable and can be updated again. The old
 * blob JSON is left in place (orphaned). No re-mint; cNFTs already verified into
 * the collection are unaffected.
 *
 * Run (dry run prints the new JSON without touching chain):
 *   pnpm tsx --env-file=.env.local scripts/backfill-collection-metadata.ts <COLLECTION_MINT> --dry
 * Apply:
 *   pnpm tsx --env-file=.env.local scripts/backfill-collection-metadata.ts <COLLECTION_MINT>
 */

import { eq } from 'drizzle-orm'
import { publicKey } from '@metaplex-foundation/umi'
import { updateCollection, fetchCollection } from '@metaplex-foundation/mpl-core'

import { db } from '@/server/db'
import { users } from '@/server/db/schema'
import { generateCreatorCollectionMetadata } from '@/server/utils/nft-metadata'
import { uploadCollectionMetadataJson } from '@/server/storage/blob'
import { getUmi, getUmiRpcEndpoint } from '@/server/services/blockchain/compressed/umiClient'

async function main() {
	const collectionMint = process.argv[2]?.trim()
	const dryRun = process.argv.includes('--dry')

	if (!collectionMint) {
		console.error('Usage: backfill-collection-metadata.ts <COLLECTION_MINT> [--dry]')
		process.exit(1)
	}

	console.log('▶ Backfill creator-collection metadata')
	console.log('  RPC:', getUmiRpcEndpoint().replace(/api-key=[^&]+/, 'api-key=***'))
	console.log('  Collection:', collectionMint)
	console.log('  Mode:', dryRun ? 'DRY RUN (no chain writes)' : 'APPLY')

	// 1) Load the owning creator.
	const [creator] = await db
		.select({
			id: users.id,
			collectionMint: users.collectionMint,
			displayName: users.displayName,
			usernameSlug: users.usernameSlug,
			avatarUrl: users.avatarUrl,
			collectionName: users.collectionName,
			collectionImageUrl: users.collectionImageUrl,
		})
		.from(users)
		.where(eq(users.collectionMint, collectionMint))
		.limit(1)

	if (!creator) {
		console.error(`✖ No creator found with collection_mint = ${collectionMint}`)
		process.exit(1)
	}
	console.log('  Creator:', creator.id, `(@${creator.usernameSlug})`)

	// 2) Regenerate the metadata via the canonical generator.
	const metadata = generateCreatorCollectionMetadata(creator)
	console.log('\n  New metadata JSON:')
	console.log(JSON.stringify(metadata, null, 2))

	if (dryRun) {
		console.log('\n✓ Dry run — nothing uploaded or updated on-chain.')
		process.exit(0)
	}

	const umi = getUmi()

	// Sanity: confirm the collection is readable + we hold update authority.
	const onchain = await fetchCollection(umi, publicKey(collectionMint))
	const authority = umi.identity.publicKey.toString()
	if (onchain.updateAuthority.toString() !== authority) {
		console.error('✖ Fee-payer is NOT this collection\'s update authority — cannot update.', {
			updateAuthority: onchain.updateAuthority.toString(),
			feePayer: authority,
		})
		process.exit(1)
	}
	console.log('  Old on-chain uri:', onchain.uri)

	// 3) Upload the fresh JSON (Vercel Blob).
	const upload = await uploadCollectionMetadataJson(
		metadata as unknown as Record<string, unknown>,
		creator.id,
	)
	if (!upload.success) {
		console.error('✖ Metadata upload failed:', upload.error)
		process.exit(1)
	}
	console.log('  New uri:', upload.url)

	// 4) Repoint the on-chain collection uri.
	await updateCollection(umi, {
		collection: publicKey(collectionMint),
		uri: upload.url,
	}).sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } })

	console.log('\n✅ Done — collection uri repointed on-chain.')
	console.log('   Verify:', `https://explorer.solana.com/address/${collectionMint}`)
	process.exit(0)
}

main().catch((err) => {
	console.error('\n✖ FAILED:', err instanceof Error ? err.message : err)
	console.error(err)
	process.exit(1)
})
