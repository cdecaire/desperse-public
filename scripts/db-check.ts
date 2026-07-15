/**
 * db:check — Drizzle migration drift detector (READ-ONLY).
 *
 * Why this exists: our migrator (drizzle-kit migrate) decides what to apply
 * purely by the MAX `created_at` timestamp in `drizzle.__drizzle_migrations`,
 * NOT by which migration hashes are recorded. So whenever the migration folder
 * gets reordered/rebased — which happens when agents generate `00xx` files on
 * parallel branches and they merge in a different order than their `when`
 * timestamps — the "high-water mark" stops matching reality. The next
 * `db:migrate` then either re-runs an already-applied migration (duplicate
 * object → crash) or silently skips a genuinely-pending one.
 *
 * This script compares the on-disk journal (drizzle/meta/_journal.json) against
 * the recorded rows and flags trouble BEFORE you run `db:migrate`. It writes
 * nothing. Run it in CI and locally before every migrate.
 *
 * Usage:
 *   pnpm db:check
 *
 * Exit codes: 0 = clean, 1 = drift detected (or connection error).
 */

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import postgres from 'postgres'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
dotenv.config({ path: resolve(projectRoot, '.env.local') })
dotenv.config({ path: resolve(projectRoot, '.env') })

const MIGRATIONS_DIR = resolve(projectRoot, 'drizzle')

type JournalEntry = { idx: number; tag: string; when: number }
type RecordedRow = { hash: string; created_at: string }

function getDatabaseUrl(): string {
	const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
	if (!url) throw new Error('DATABASE_URL(_UNPOOLED) is required')
	return url
}

function loadJournal(): (JournalEntry & { hash: string })[] {
	const journalPath = resolve(MIGRATIONS_DIR, 'meta/_journal.json')
	const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as {
		entries: JournalEntry[]
	}
	return journal.entries.map((e) => {
		// Hash must match drizzle-orm's readMigrationFiles: sha256 of the raw
		// .sql file content (the full file, not per-statement).
		const sql = readFileSync(resolve(MIGRATIONS_DIR, `${e.tag}.sql`), 'utf8')
		return { ...e, hash: createHash('sha256').update(sql).digest('hex') }
	})
}

async function main() {
	const journal = loadJournal()
	const sql = postgres(getDatabaseUrl(), { ssl: 'require', max: 1 })

	let recorded: RecordedRow[]
	try {
		recorded = await sql`
			select hash, created_at
			from drizzle.__drizzle_migrations
			order by created_at asc`
	} catch (err) {
		// No bookkeeping table yet = a brand-new DB. That's not drift.
		const msg = err instanceof Error ? err.message : String(err)
		if (msg.includes('__drizzle_migrations') || msg.includes('does not exist')) {
			console.log('[db:check] No __drizzle_migrations table — fresh DB, nothing to check.')
			await sql.end()
			return
		}
		await sql.end()
		throw err
	}

	const recordedHashes = new Set(recorded.map((r) => r.hash))
	const highWaterMark = recorded.length
		? Math.max(...recorded.map((r) => Number(r.created_at)))
		: -1

	// The migrator (drizzle-kit migrate) applies every journal entry whose
	// `when` > highWaterMark, in journal order — it does NOT compare hashes.
	// So the checks below mirror that exact behaviour. We deliberately do NOT
	// try to hash-match the whole back-catalogue: this repo's journal has been
	// rebased, so old .sql files were reformatted and their current hashes no
	// longer equal what's recorded even though they're genuinely applied.
	// Hashing old files would produce pure false positives.
	const atOrBelowHwm = journal.filter((e) => e.when <= highWaterMark)
	const aboveHwm = journal.filter((e) => e.when > highWaterMark)

	const problems: string[] = []
	const warnings: string[] = []

	// CHECK 1 — RE-RUN / CRASH RISK (the 0048/0049 footgun we hit):
	// A journal entry sits ABOVE the high-water mark (so migrate WILL try to
	// apply it) yet its hash is ALREADY recorded (so it's already been applied).
	// A recorded hash is proof-of-applied, so this reliably means db:migrate
	// will attempt to recreate an existing object and crash on a duplicate.
	const rerunRisk = aboveHwm.filter((e) => recordedHashes.has(e.hash))
	for (const e of rerunRisk) {
		problems.push(
			`RE-RUN RISK: ${e.tag} (when=${e.when}) is above the high-water mark so db:migrate ` +
				`will try to apply it, but its hash is already recorded (already applied). It will ` +
				`re-run and likely crash on a duplicate object. Its bookkeeping created_at is stale/out-of-order.`,
		)
	}

	// CHECK 2 — HOLE / SILENT SKIP:
	// There are more journal entries at/below the high-water mark than there are
	// recorded rows → at least one migration in that range was never applied and
	// will now be silently skipped forever. Count-based (hash-independent) so it
	// survives the rebased history.
	if (recorded.length < atOrBelowHwm.length) {
		const deficit = atOrBelowHwm.length - recorded.length
		problems.push(
			`HOLE: ${atOrBelowHwm.length} journal entries are at/below the high-water mark but only ` +
				`${recorded.length} rows are recorded (${deficit} missing). A migration below the mark ` +
				`was skipped and can never be applied. Suspect the least-recently-added entries in that range.`,
		)
	}

	// Genuinely pending migrations: above the mark, hash not yet recorded. The
	// normal, healthy "you have migrations to run" state. Informational.
	const pending = aboveHwm.filter((e) => !recordedHashes.has(e.hash))

	// Orphan rows: recorded more rows than the journal has entries → leftover
	// bookkeeping from a previous journal generation. Informational.
	const orphanCount = recorded.length - journal.filter((e) => recordedHashes.has(e.hash)).length
	if (orphanCount > 0) {
		warnings.push(
			`${orphanCount} recorded row(s) have no matching current-journal hash (residue from a past ` +
				`journal rebase). Harmless as long as no RE-RUN/HOLE problems are reported above.`,
		)
	}

	console.log(`[db:check] journal entries: ${journal.length}, recorded rows: ${recorded.length}, high-water mark: ${highWaterMark}`)
	if (pending.length) {
		console.log(`[db:check] ${pending.length} pending migration(s) ready to apply:`)
		for (const e of pending) console.log(`  • ${e.tag} (when=${e.when})`)
	}
	for (const w of warnings) console.warn(`[db:check] ⚠ ${w}`)

	await sql.end()

	if (problems.length) {
		console.error(`\n[db:check] ✖ DRIFT DETECTED (${problems.length}):`)
		for (const p of problems) console.error(`  ✖ ${p}`)
		console.error(
			'\nDo NOT run db:migrate until resolved. Reconcile drizzle.__drizzle_migrations ' +
				'(fix the recorded created_at/hash to match the journal) before migrating.',
		)
		process.exit(1)
	}

	console.log('[db:check] ✓ No drift — recorded state is consistent with the journal.')
}

main().catch((err) => {
	console.error('[db:check] Error:', err instanceof Error ? err.message : err)
	process.exit(1)
})
