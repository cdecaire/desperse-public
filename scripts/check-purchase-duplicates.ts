/**
 * Script to check for duplicate purchases and master editions
 * 
 * Usage: npx tsx scripts/check-purchase-duplicates.ts <postId>
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { db } from '../src/server/db';
import { purchases, posts } from '../src/server/db/schema';
import { eq, and } from 'drizzle-orm';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

dotenv.config({ path: resolve(projectRoot, '.env.local') });
dotenv.config({ path: resolve(projectRoot, '.env') });

const postId = process.argv[2];

if (!postId) {
  console.error('Usage: npx tsx scripts/check-purchase-duplicates.ts <postId>');
  process.exit(1);
}

async function checkDuplicates() {
  try {
    console.log(`[checkDuplicates] Checking post: ${postId}\n`);
    
    // Get post info
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    
    if (!post) {
      console.error(`[checkDuplicates] Post not found: ${postId}`);
      process.exit(1);
    }
    
    console.log(`Post Info:`);
    console.log(`  Max Supply: ${post.maxSupply ?? 'unlimited'}`);
    console.log(`  Current Supply (DB): ${post.currentSupply}`);
    console.log(`  Master Mint: ${post.masterMint || 'none'}\n`);
    
    // Get all purchases for this post
    const allPurchases = await db
      .select()
      .from(purchases)
      .where(eq(purchases.postId, postId))
      .orderBy(purchases.createdAt);
    
    console.log(`Total Purchases: ${allPurchases.length}\n`);
    
    // Group by status
    const byStatus: Record<string, typeof allPurchases> = {};
    for (const p of allPurchases) {
      if (!byStatus[p.status]) {
        byStatus[p.status] = [];
      }
      byStatus[p.status].push(p);
    }
    
    console.log('Purchases by Status:');
    for (const [status, purchases] of Object.entries(byStatus)) {
      console.log(`  ${status}: ${purchases.length}`);
    }
    console.log('');
    
    // Count confirmed purchases
    const confirmedPurchases = allPurchases.filter(p => p.status === 'confirmed' && p.nftMint);
    console.log(`Confirmed Purchases with NFT Mint: ${confirmedPurchases.length}`);
    
    if (confirmedPurchases.length > 0) {
      console.log('\nConfirmed Purchases:');
      for (const p of confirmedPurchases) {
        console.log(`  Purchase ID: ${p.id}`);
        console.log(`    Status: ${p.status}`);
        console.log(`    NFT Mint: ${p.nftMint}`);
        console.log(`    Created: ${p.createdAt.toISOString()}`);
        console.log(`    Confirmed: ${p.confirmedAt?.toISOString() || 'N/A'}`);
        console.log('');
      }
    }
    
    // Check for duplicates (same NFT mint)
    const mintCounts: Record<string, number> = {};
    for (const p of confirmedPurchases) {
      if (p.nftMint) {
        mintCounts[p.nftMint] = (mintCounts[p.nftMint] || 0) + 1;
      }
    }
    
    const duplicates = Object.entries(mintCounts).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      console.log('⚠️  DUPLICATE NFT MINTS FOUND:');
      for (const [mint, count] of duplicates) {
        console.log(`  ${mint}: ${count} purchases`);
        const dupPurchases = confirmedPurchases.filter(p => p.nftMint === mint);
        for (const p of dupPurchases) {
          console.log(`    - Purchase ${p.id} (created: ${p.createdAt.toISOString()})`);
        }
      }
      console.log('');
    }
    
    // Check supply mismatch
    const actualConfirmedCount = confirmedPurchases.length;
    if (post.maxSupply !== null && actualConfirmedCount > post.maxSupply) {
      console.log(`⚠️  SUPPLY EXCEEDED:`);
      console.log(`  Max Supply: ${post.maxSupply}`);
      console.log(`  Actual Confirmed: ${actualConfirmedCount}`);
      console.log(`  Over by: ${actualConfirmedCount - post.maxSupply}\n`);
    }
    
    // Check for purchases stuck in minting
    const stuckMinting = allPurchases.filter(p => p.status === 'minting');
    if (stuckMinting.length > 0) {
      console.log(`⚠️  STUCK IN MINTING: ${stuckMinting.length}`);
      for (const p of stuckMinting) {
        const age = Date.now() - new Date(p.createdAt).getTime();
        console.log(`  Purchase ${p.id} (age: ${Math.round(age / 1000)}s)`);
      }
      console.log('');
    }
    
    console.log('Summary:');
    console.log(`  Total Purchases: ${allPurchases.length}`);
    console.log(`  Confirmed: ${confirmedPurchases.length}`);
    console.log(`  DB Current Supply: ${post.currentSupply}`);
    console.log(`  Max Supply: ${post.maxSupply ?? 'unlimited'}`);
    console.log(`  Duplicate Mints: ${duplicates.length}`);
    
  } catch (error) {
    console.error('[checkDuplicates] Error:', error);
    process.exit(1);
  }
}

checkDuplicates();

