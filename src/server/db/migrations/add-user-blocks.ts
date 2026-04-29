/**
 * Migration: Create `user_blocks` table.
 *
 * Powers the cross-platform user-block feature (App Store Guideline 1.2 +
 * Google Play UGC moderation). A row represents `blockerId blocks blockedId`;
 * content filters apply symmetrically (either party blocking the other hides
 * content in both directions).
 *
 * Idempotent — safe to re-run.
 *
 * Usage:
 *   import { runMigration } from './add-user-blocks'
 *   await runMigration()
 */

import { db } from '@/server/db'
import { sql } from 'drizzle-orm'

export async function runMigration() {
  console.log('[migration] Creating user_blocks table...')

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_blocks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT user_blocks_no_self_block CHECK (blocker_id <> blocked_id)
    )
  `)

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS user_blocks_blocker_blocked_unique_idx
      ON user_blocks (blocker_id, blocked_id)
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS user_blocks_blocker_id_idx
      ON user_blocks (blocker_id)
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS user_blocks_blocked_id_idx
      ON user_blocks (blocked_id)
  `)

  console.log('[migration] user_blocks table ready')
}
