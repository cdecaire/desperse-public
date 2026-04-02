import { getDb } from '../src/server/db/index.ts'
import { pfpMints } from '../src/server/db/schema.ts'

const d = getDb()
const rows = await d.select().from(pfpMints)

for (const r of rows) {
	console.log({
		id: r.id,
		status: r.status,
		nftMint: r.nftMintAddress,
		txSig: r.txSignature,
		network: r.network,
		createdAt: r.createdAt,
	})
}

process.exit(0)
