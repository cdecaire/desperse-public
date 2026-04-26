/**
 * Migration: Add `environment` column to `push_tokens`
 *
 * APNs distinguishes between sandbox (debug-signed builds, hits
 * `api.sandbox.push.apple.com`) and production (TestFlight / App Store builds,
 * hits `api.push.apple.com`). Tokens are not interchangeable across hosts —
 * a sandbox token sent to the production host returns `BadDeviceToken`.
 *
 * The iOS client reports its `aps-environment` entitlement value when
 * registering, and `pushDispatch` routes to the matching APNs host. FCM
 * tokens (Android) leave this column null.
 *
 * Usage:
 *   import { runMigration } from './add-push-token-environment'
 *   await runMigration()
 */

import { db } from '@/server/db'
import { sql } from 'drizzle-orm'

export async function runMigration() {
  console.log('[migration] Adding environment column to push_tokens...')

  await db.execute(sql`
    ALTER TABLE push_tokens
    ADD COLUMN IF NOT EXISTS environment TEXT
  `)

  console.log('[migration] push_tokens.environment column ready')
}
