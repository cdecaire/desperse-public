/**
 * Backfill user_wallets table from users.walletAddress
 *
 * Every user has an embedded wallet address stored in users.wallet_address.
 * This script ensures each user has at least one row in user_wallets
 * (type='embedded', isPrimary=true) so the multi-wallet UI works.
 *
 * Safe to run multiple times — skips users who already have a user_wallets row.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-user-wallets.ts
 *   pnpm tsx scripts/backfill-user-wallets.ts --dry-run
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { users, userWallets } from '../src/server/db/schema'
import { sql } from 'drizzle-orm'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = resolve(__dirname, '..')

dotenv.config({ path: resolve(projectRoot, '.env.local') })
dotenv.config({ path: resolve(projectRoot, '.env') })

function getDatabaseUrl(): string {
	const url = process.env.DATABASE_URL
	if (!url) {
		console.error('DATABASE_URL environment variable is not set')
		process.exit(1)
	}
	return url
}

const dryRun = process.argv.includes('--dry-run')

async function main() {
	const databaseUrl = getDatabaseUrl()
	const client = postgres(databaseUrl)
	const db = drizzle(client)

	try {
		// Find all users who do NOT already have a row in user_wallets
		const usersWithoutWallets = await db
			.select({
				id: users.id,
				walletAddress: users.walletAddress,
			})
			.from(users)
			.where(
				sql`${users.id} NOT IN (
					SELECT DISTINCT ${userWallets.userId} FROM ${userWallets}
				)`
			)

		console.log(`Found ${usersWithoutWallets.length} users without user_wallets rows`)

		if (usersWithoutWallets.length === 0) {
			console.log('Nothing to backfill.')
			return
		}

		if (dryRun) {
			console.log('\n[DRY RUN] Would insert:')
			for (const u of usersWithoutWallets) {
				console.log(`  userId=${u.id}  address=${u.walletAddress}`)
			}
			return
		}

		// Batch insert
		const rows = usersWithoutWallets.map((u) => ({
			userId: u.id,
			address: u.walletAddress,
			type: 'embedded' as const,
			connector: 'privy' as const,
			label: 'Desperse Wallet',
			isPrimary: true,
		}))

		const BATCH_SIZE = 500
		let inserted = 0
		for (let i = 0; i < rows.length; i += BATCH_SIZE) {
			const batch = rows.slice(i, i + BATCH_SIZE)
			await db.insert(userWallets).values(batch).onConflictDoNothing()
			inserted += batch.length
			console.log(`  Inserted batch ${Math.floor(i / BATCH_SIZE) + 1} (${inserted}/${rows.length})`)
		}

		console.log(`\nBackfill complete. Inserted ${inserted} user_wallets rows.`)
	} finally {
		await client.end()
	}
}

main().catch((err) => {
	console.error('Backfill failed:', err)
	process.exit(1)
})
