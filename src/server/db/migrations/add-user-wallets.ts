/**
 * Migration: Add user_wallets table for multi-wallet support
 *
 * Creates the user_wallets table and seeds it from existing users.walletAddress data.
 * Each existing user with a wallet_address gets an 'embedded' wallet entry marked as primary.
 *
 * Usage:
 *   import { runMigration } from './add-user-wallets'
 *   await runMigration()
 */

import { db } from '@/server/db'
import { sql } from 'drizzle-orm'

export async function runMigration() {
  console.log('[migration] Creating user_wallets table...')

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_wallets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      address TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('embedded', 'external')),
      connector TEXT,
      label TEXT CHECK (char_length(label) <= 50),
      is_primary BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      UNIQUE(user_id, address)
    );
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS user_wallets_user_id_idx ON user_wallets(user_id);
  `)

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS user_wallets_one_default_idx ON user_wallets(user_id) WHERE is_primary = true;
  `)

  console.log('[migration] Seeding user_wallets from existing users...')

  await db.execute(sql`
    INSERT INTO user_wallets (user_id, address, type, label, is_primary)
    SELECT id, wallet_address, 'embedded', 'Desperse Wallet', true
    FROM users WHERE wallet_address IS NOT NULL
    ON CONFLICT DO NOTHING;
  `)

  console.log('[migration] user_wallets migration complete.')
}
