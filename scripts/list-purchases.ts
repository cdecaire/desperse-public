/**
 * Script to list purchases for a user or post
 * 
 * Usage:
 *   pnpm tsx scripts/list-purchases.ts [--postId <postId>] [--userId <userId>] [--status <status>]
 * 
 * Examples:
 *   pnpm tsx scripts/list-purchases.ts --postId 6befb8e8-ac6b-458d-a789-343fe2435bca
 *   pnpm tsx scripts/list-purchases.ts --userId 5b59805a-4078-4347-8e6d-500a3b8f2650
 *   pnpm tsx scripts/list-purchases.ts --status confirmed
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { purchases, posts, users } from '../src/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

dotenv.config({ path: resolve(projectRoot, '.env.local') });
dotenv.config({ path: resolve(projectRoot, '.env') });

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required');
  }
  return url;
}

async function listPurchases(options: { postId?: string; userId?: string; status?: string }) {
  const dbUrl = getDatabaseUrl();
  const client = postgres(dbUrl);
  const db = drizzle(client);

  try {
    let query = db
      .select({
        id: purchases.id,
        userId: purchases.userId,
        postId: purchases.postId,
        status: purchases.status,
        txSignature: purchases.txSignature,
        nftMint: purchases.nftMint,
        amountPaid: purchases.amountPaid,
        currency: purchases.currency,
        createdAt: purchases.createdAt,
        confirmedAt: purchases.confirmedAt,
        postTitle: posts.nftName,
        userWallet: users.walletAddress,
      })
      .from(purchases)
      .leftJoin(posts, eq(purchases.postId, posts.id))
      .leftJoin(users, eq(purchases.userId, users.id))
      .orderBy(desc(purchases.createdAt));

    const conditions = [];
    if (options.postId) {
      conditions.push(eq(purchases.postId, options.postId));
    }
    if (options.userId) {
      conditions.push(eq(purchases.userId, options.userId));
    }
    if (options.status) {
      conditions.push(eq(purchases.status, options.status));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const results = await query.limit(50);

    if (results.length === 0) {
      console.log('No purchases found matching criteria.');
      return;
    }

    console.log(`\nFound ${results.length} purchase(s):\n`);
    console.log('─'.repeat(120));

    for (const purchase of results) {
      console.log(`Purchase ID: ${purchase.id}`);
      console.log(`  Post ID: ${purchase.postId}`);
      console.log(`  Post Title: ${purchase.postTitle || 'N/A'}`);
      console.log(`  User ID: ${purchase.userId}`);
      console.log(`  User Wallet: ${purchase.userWallet || 'N/A'}`);
      console.log(`  Status: ${purchase.status}`);
      console.log(`  Amount: ${purchase.amountPaid} ${purchase.currency}`);
      console.log(`  Transaction Signature: ${purchase.txSignature || 'N/A'}`);
      console.log(`  NFT Mint: ${purchase.nftMint || 'N/A'}`);
      console.log(`  Created: ${purchase.createdAt}`);
      console.log(`  Confirmed: ${purchase.confirmedAt || 'N/A'}`);
      
      if (purchase.status === 'confirmed' && !purchase.nftMint) {
        console.log(`  ⚠️  READY TO CLAIM - Payment confirmed but NFT not minted`);
        console.log(`  Run: pnpm retry:fulfillment ${purchase.id}`);
      }
      
      console.log('─'.repeat(120));
    }

    // Summary
    const byStatus = results.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\nSummary by status:');
    for (const [status, count] of Object.entries(byStatus)) {
      console.log(`  ${status}: ${count}`);
    }

    const needsClaiming = results.filter(p => p.status === 'confirmed' && !p.nftMint);
    if (needsClaiming.length > 0) {
      console.log(`\n⚠️  ${needsClaiming.length} purchase(s) need claiming:`);
      for (const p of needsClaiming) {
        console.log(`  - ${p.id} (Post: ${p.postId})`);
      }
    }
  } finally {
    await client.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: { postId?: string; userId?: string; status?: string } = {};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--postId' && args[i + 1]) {
    options.postId = args[i + 1];
    i++;
  } else if (args[i] === '--userId' && args[i + 1]) {
    options.userId = args[i + 1];
    i++;
  } else if (args[i] === '--status' && args[i + 1]) {
    options.status = args[i + 1];
    i++;
  }
}

if (Object.keys(options).length === 0) {
  console.log('Usage: pnpm tsx scripts/list-purchases.ts [--postId <postId>] [--userId <userId>] [--status <status>]');
  console.log('\nExamples:');
  console.log('  pnpm tsx scripts/list-purchases.ts --postId 6befb8e8-ac6b-458d-a789-343fe2435bca');
  console.log('  pnpm tsx scripts/list-purchases.ts --userId 5b59805a-4078-4347-8e6d-500a3b8f2650');
  console.log('  pnpm tsx scripts/list-purchases.ts --status confirmed');
  console.log('  pnpm tsx scripts/list-purchases.ts --status confirmed --postId 6befb8e8-ac6b-458d-a789-343fe2435bca');
  process.exit(1);
}

listPurchases(options)
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

