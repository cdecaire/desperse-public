/**
 * Retry fulfillment for stuck purchases
 *
 * Usage:
 *   pnpm tsx scripts/retry-fulfillment.ts <purchaseId> [<purchaseId2> ...]
 *   pnpm tsx scripts/retry-fulfillment.ts --tx <txSignature>
 *   pnpm tsx scripts/retry-fulfillment.ts --status awaiting_fulfillment
 *
 * Add --yes or -y to skip confirmation prompt.
 *
 * Examples:
 *   pnpm tsx scripts/retry-fulfillment.ts 0798bdb6-5b67-4246-83c3-17a03316449e
 *   pnpm tsx scripts/retry-fulfillment.ts --tx 41TBGAqSiYPP9hGrkboV...
 *   pnpm tsx scripts/retry-fulfillment.ts --status awaiting_fulfillment
 */

import dotenv from 'dotenv'
import * as readline from 'readline'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { purchases } from '../src/server/db/schema'
import { eq, like } from 'drizzle-orm'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = resolve(__dirname, '..')

dotenv.config({ path: resolve(projectRoot, '.env.local') })
dotenv.config({ path: resolve(projectRoot, '.env') })

function getDatabaseUrl(): string {
	const url = process.env.DATABASE_URL
	if (!url) {
		throw new Error('DATABASE_URL is required')
	}
	return url
}

async function resolvePurchaseIds(args: string[]): Promise<string[]> {
	const client = postgres(getDatabaseUrl())
	const db = drizzle(client)
	const ids: string[] = []

	try {
		if (args.includes('--tx')) {
			const txIdx = args.indexOf('--tx')
			const txSig = args[txIdx + 1]
			if (!txSig) {
				throw new Error('--tx requires a transaction signature')
			}
			const results = await db
				.select({ id: purchases.id, status: purchases.status, txSignature: purchases.txSignature })
				.from(purchases)
				.where(eq(purchases.txSignature, txSig))
				.limit(1)

			if (results.length === 0) {
				// Try prefix match
				const prefixResults = await db
					.select({ id: purchases.id, status: purchases.status, txSignature: purchases.txSignature })
					.from(purchases)
					.where(like(purchases.txSignature, `${txSig}%`))
					.limit(5)

				if (prefixResults.length === 0) {
					console.error(`No purchase found for tx signature: ${txSig}`)
				} else {
					for (const r of prefixResults) {
						ids.push(r.id)
						console.log(`  Found: ${r.id} (status=${r.status})`)
					}
				}
			} else {
				ids.push(results[0].id)
			}
		} else if (args.includes('--status')) {
			const statusIdx = args.indexOf('--status')
			const status = args[statusIdx + 1]
			if (!status) {
				throw new Error('--status requires a value')
			}
			const results = await db
				.select({ id: purchases.id, status: purchases.status, txSignature: purchases.txSignature })
				.from(purchases)
				.where(eq(purchases.status, status))
				.limit(20)

			for (const r of results) {
				ids.push(r.id)
				console.log(`  Found: ${r.id} (tx=${r.txSignature?.slice(0, 20)}...)`)
			}
		} else {
			// Direct purchase IDs
			for (const arg of args) {
				if (arg.match(/^[0-9a-f]{8}-/)) {
					ids.push(arg)
				}
			}
		}
	} finally {
		await client.end()
	}

	return ids
}

async function retryFulfillment(purchaseId: string) {
	// Dynamic import to get the fulfillment function with full server context
	const { fulfillPurchaseDirect } = await import('../src/server/utils/fulfillment')

	console.log(`\nRetrying fulfillment for: ${purchaseId}`)
	console.log('─'.repeat(80))

	try {
		const result = await fulfillPurchaseDirect(purchaseId)
		if (result.success) {
			console.log(`  SUCCESS — status=${result.status}, nftMint=${result.nftMint || 'N/A'}`)
		} else {
			console.log(`  FAILED — status=${result.status}, error=${result.error}`)
		}
		return result
	} catch (error) {
		console.error(`  ERROR — ${error instanceof Error ? error.message : error}`)
		return null
	}
}

// Parse args
const args = process.argv.slice(2)

if (args.length === 0) {
	console.log('Usage:')
	console.log('  pnpm retry:fulfillment <purchaseId> [<purchaseId2> ...]')
	console.log('  pnpm retry:fulfillment --tx <txSignature>')
	console.log('  pnpm retry:fulfillment --status awaiting_fulfillment')
	process.exit(1)
}

console.log('Resolving purchase IDs...')

function confirm(message: string): Promise<boolean> {
	return new Promise((resolve) => {
		const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
		rl.question(`${message} [y/N] `, (answer) => {
			rl.close()
			resolve(answer.trim().toLowerCase() === 'y')
		})
	})
}

const skipConfirm = args.includes('--yes') || args.includes('-y')

resolvePurchaseIds(args)
	.then(async (ids) => {
		if (ids.length === 0) {
			console.error('No purchases found.')
			process.exit(1)
		}

		console.log(`\nFound ${ids.length} purchase(s) to retry:\n`)
		for (const id of ids) {
			console.log(`  • ${id}`)
		}
		console.log()

		if (!skipConfirm) {
			const ok = await confirm(`Proceed with ${ids.length} mainnet fulfillment(s)?`)
			if (!ok) {
				console.log('Aborted.')
				process.exit(0)
			}
		}

		for (const id of ids) {
			await retryFulfillment(id)
		}

		console.log('\nDone!')
		process.exit(0)
	})
	.catch((error) => {
		console.error('Error:', error)
		process.exit(1)
	})
