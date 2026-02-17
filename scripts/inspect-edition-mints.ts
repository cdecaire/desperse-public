/**
 * Script to inspect edition minting model
 * 
 * Checks:
 * 1. SPL mint account (decimals, supply)
 * 2. Metaplex Token Metadata
 * 3. Master Edition PDA
 * 4. Database purchases to see if mints are shared
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { purchases, posts } from '../src/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { Buffer } from 'buffer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables from .env files (same as app)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Load .env files in order of precedence (same as Vite)
dotenv.config({ path: resolve(projectRoot, '.env.local') });
dotenv.config({ path: resolve(projectRoot, '.env') });

// Standalone env helpers (load from process.env after dotenv)
function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
}

function getHeliusRpcUrl(): string {
  const apiKey = getEnvVar('HELIUS_API_KEY', '');
  if (apiKey) {
    return `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
  }
  console.warn('HELIUS_API_KEY not set, using public RPC endpoint (rate limited)');
  return 'https://api.mainnet-beta.solana.com';
}

function getDatabaseUrl(): string {
  return getEnvVar('DATABASE_URL');
}

const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// Example mints to inspect
const MINT_ADDRESSES = [
  'EoxuDEHH6Xu4GGS6LtqNezBPnFLKtstWWFWVBXp3YVoF',
  '5CS2GTLhA3fXbizTPZhsjHgeZLxT8NSmuahs581rTJaP',
];

interface MintInspection {
  mintAddress: string;
  splMint: {
    decimals: number;
    supply: string; // raw integer as string
    supplyNumber: number;
  };
  metadata: {
    exists: boolean;
    updateAuthority?: string;
    uri?: string;
  };
  masterEdition: {
    exists: boolean;
    maxSupply?: number | null;
  };
}

async function inspectMint(connection: Connection, mintAddress: string): Promise<MintInspection> {
  const mint = new PublicKey(mintAddress);
  
  console.log(`\n=== Inspecting mint: ${mintAddress} ===`);
  
  // 1. Fetch SPL mint account
  let splMint;
  try {
    splMint = await getMint(connection, mint);
    console.log(`✓ SPL Mint Account found`);
    console.log(`  - Decimals: ${splMint.decimals}`);
    console.log(`  - Supply (raw): ${splMint.supply.toString()}`);
    console.log(`  - Supply (number): ${Number(splMint.supply)}`);
  } catch (error) {
    console.error(`✗ Failed to fetch SPL mint account:`, error);
    throw error;
  }
  
  // 2. Fetch Metadata PDA
  const [metadataPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  );
  
  let metadataExists = false;
  let updateAuthority: string | undefined;
  let uri: string | undefined;
  
  try {
    const metadataAccount = await connection.getAccountInfo(metadataPda);
    if (metadataAccount) {
      metadataExists = true;
      console.log(`✓ Metadata PDA exists: ${metadataPda.toBase58()}`);
      
      // Parse metadata account data
      // Metadata V3 structure (simplified):
      // - Byte 0: key (4 = MetadataV1)
      // - Bytes 1-33: update authority (Pubkey, 32 bytes)
      // - Bytes 33-65: mint (Pubkey, 32 bytes)
      // - Bytes 65-97: name (String, 4 bytes length + data)
      // - Bytes 97-129: symbol (String, 4 bytes length + data)
      // - Bytes 129-161: uri (String, 4 bytes length + data)
      // - Bytes 161-169: seller fee basis points (u16)
      // - ... more fields
      
      const data = metadataAccount.data;
      if (data.length >= 161) {
        // Read update authority (bytes 1-33)
        const updateAuthorityBytes = data.slice(1, 33);
        updateAuthority = new PublicKey(updateAuthorityBytes).toBase58();
        console.log(`  - Update Authority: ${updateAuthority}`);
        
        // Read URI (starts around byte 129, but need to parse string length first)
        // URI is a String type: 4 bytes (u32 length) + data
        // We need to find where URI starts by parsing name and symbol lengths first
        let offset = 65; // Start after mint (byte 33-65)
        
        // Parse name length (u32, little-endian)
        if (data.length >= offset + 4) {
          const nameLength = data.readUInt32LE(offset);
          offset += 4 + nameLength;
          
          // Parse symbol length
          if (data.length >= offset + 4) {
            const symbolLength = data.readUInt32LE(offset);
            offset += 4 + symbolLength;
            
            // Now at URI
            if (data.length >= offset + 4) {
              const uriLength = data.readUInt32LE(offset);
              if (data.length >= offset + 4 + uriLength) {
                uri = data.slice(offset + 4, offset + 4 + uriLength).toString('utf8');
                console.log(`  - URI: ${uri}`);
              }
            }
          }
        }
      }
    } else {
      console.log(`✗ Metadata PDA does not exist`);
    }
  } catch (error) {
    console.log(`✗ Error checking metadata PDA:`, error);
  }
  
  // 3. Fetch Master Edition PDA
  const [masterEditionPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from('edition'),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  );
  
  let masterEditionExists = false;
  let maxSupply: number | null | undefined;
  
  try {
    const masterEditionAccount = await connection.getAccountInfo(masterEditionPda);
    if (masterEditionAccount) {
      masterEditionExists = true;
      console.log(`✓ Master Edition PDA exists: ${masterEditionPda.toBase58()}`);
      
      // Master Edition account structure:
      // - First byte: key (6 = MasterEditionV2)
      // - Bytes 1-33: supply (u64, but only first 8 bytes used)
      // - Bytes 33-65: maxSupply (Option<u64>, first byte is Some/None flag)
      
      // Simplified parsing - just check existence
      // Full parsing would require proper deserialization
      const data = masterEditionAccount.data;
      if (data.length >= 34) {
        // Check if maxSupply is set (byte 33: 0 = None, 1 = Some)
        const maxSupplyFlag = data[33];
        if (maxSupplyFlag === 1 && data.length >= 42) {
          // Read u64 maxSupply (little-endian, bytes 34-42)
          const maxSupplyBuffer = data.slice(34, 42);
          const maxSupplyValue = maxSupplyBuffer.readBigUInt64LE(0);
          maxSupply = Number(maxSupplyValue);
          console.log(`  - Max Supply: ${maxSupply}`);
        } else {
          maxSupply = null; // Open edition
          console.log(`  - Max Supply: null (open edition)`);
        }
      }
    } else {
      console.log(`✗ Master Edition PDA does not exist`);
    }
  } catch (error) {
    console.log(`✗ Error checking Master Edition PDA:`, error);
  }
  
  return {
    mintAddress,
    splMint: {
      decimals: splMint.decimals,
      supply: splMint.supply.toString(),
      supplyNumber: Number(splMint.supply),
    },
    metadata: {
      exists: metadataExists,
      updateAuthority,
      uri,
    },
    masterEdition: {
      exists: masterEditionExists,
      maxSupply,
    },
  };
}

async function checkDatabasePurchases() {
  console.log(`\n=== Checking Database Purchases ===`);
  
  // Create database connection
  const connectionString = getDatabaseUrl();
  const queryClient = postgres(connectionString, { prepare: false });
  const db = drizzle(queryClient);
  
  // Find a post with edition supply = 5 (or any edition post with purchases)
  const editionPosts = await db
    .select({
      id: posts.id,
      maxSupply: posts.maxSupply,
      currentSupply: posts.currentSupply,
    })
    .from(posts)
    .where(eq(posts.type, 'edition'))
    .orderBy(posts.currentSupply)
    .limit(20);
  
  console.log(`Found ${editionPosts.length} edition posts`);
  
  // Find posts with confirmed purchases
  const postsWithPurchases: Array<{
    postId: string;
    maxSupply: number | null;
    currentSupply: number;
    totalPurchases: number;
    distinctMints: number;
    mints: string[];
  }> = [];
  
  for (const post of editionPosts) {
    const postPurchases = await db
      .select({
        id: purchases.id,
        nftMint: purchases.nftMint,
        status: purchases.status,
      })
      .from(purchases)
      .where(and(
        eq(purchases.postId, post.id),
        eq(purchases.status, 'confirmed')
      ));
    
    if (postPurchases.length > 0) {
      const validMints = postPurchases
        .map(p => p.nftMint)
        .filter((m): m is string => m !== null && m !== undefined);
      
      const uniqueMints = new Set(validMints);
      
      postsWithPurchases.push({
        postId: post.id,
        maxSupply: post.maxSupply,
        currentSupply: post.currentSupply,
        totalPurchases: postPurchases.length,
        distinctMints: uniqueMints.size,
        mints: Array.from(uniqueMints),
      });
    }
  }
  
  // Close database connection
  await queryClient.end();
  
  return postsWithPurchases;
}

async function main() {
  console.log('=== Edition Minting Model Inspection ===\n');
  
  const rpcUrl = getHeliusRpcUrl();
  const connection = new Connection(rpcUrl, 'confirmed');
  
  // Inspect on-chain mints
  const inspections: MintInspection[] = [];
  
  for (const mintAddress of MINT_ADDRESSES) {
    try {
      const inspection = await inspectMint(connection, mintAddress);
      inspections.push(inspection);
    } catch (error) {
      console.error(`Failed to inspect ${mintAddress}:`, error);
    }
  }
  
  // Check database
  const postsWithPurchases = await checkDatabasePurchases();
  
  // Summary
  console.log(`\n=== SUMMARY ===`);
  console.log(`\nOn-Chain Mint Inspections:`);
  for (const inspection of inspections) {
    console.log(`\n${inspection.mintAddress}:`);
    console.log(`  - Decimals: ${inspection.splMint.decimals}`);
    console.log(`  - Supply: ${inspection.splMint.supplyNumber}`);
    console.log(`  - Metadata exists: ${inspection.metadata.exists}`);
    console.log(`  - Master Edition exists: ${inspection.masterEdition.exists}`);
    if (inspection.masterEdition.maxSupply !== undefined) {
      console.log(`  - Max Supply: ${inspection.masterEdition.maxSupply ?? 'null (open)'}`);
    }
    
    // Analysis
    if (inspection.splMint.decimals === 0 && inspection.splMint.supplyNumber === 1) {
      console.log(`  ✓ NFT model (decimals=0, supply=1)`);
    } else if (inspection.splMint.supplyNumber > 1) {
      console.log(`  ⚠️  SFT model detected (supply=${inspection.splMint.supplyNumber})`);
    }
    
    if (inspection.masterEdition.exists) {
      console.log(`  ✓ Has Master Edition`);
    } else {
      console.log(`  ✗ No Master Edition (not using Metaplex edition model)`);
    }
  }
  
  // Database Analysis Summary
  console.log(`\n=== DATABASE ANALYSIS ===`);
  
  if (postsWithPurchases.length === 0) {
    console.log(`\nNo posts with confirmed purchases found.`);
  } else {
    // Show the post with most purchases (or first one)
    const selectedPost = postsWithPurchases.sort((a, b) => b.totalPurchases - a.totalPurchases)[0];
    
    console.log(`\nSelected Post: ${selectedPost.postId}`);
    console.log(`  - Max Supply: ${selectedPost.maxSupply ?? 'unlimited'}`);
    console.log(`  - Current Supply: ${selectedPost.currentSupply}`);
    console.log(`  - Total Confirmed Purchases: ${selectedPost.totalPurchases}`);
    console.log(`  - Count of Distinct nftMint: ${selectedPost.distinctMints}`);
    
    // Sample mints (show up to 5)
    const sampleMints = selectedPost.mints.slice(0, 5);
    console.log(`  - Sample nftMint values (${sampleMints.length} of ${selectedPost.mints.length}):`);
    sampleMints.forEach((mint, idx) => {
      console.log(`    ${idx + 1}. ${mint}`);
    });
    if (selectedPost.mints.length > 5) {
      console.log(`    ... and ${selectedPost.mints.length - 5} more`);
    }
    
    // Conclusion
    console.log(`\n  === CONCLUSION ===`);
    if (selectedPost.distinctMints === selectedPost.totalPurchases) {
      console.log(`  ✓ Unique mint per purchase (NFT model)`);
      console.log(`  ⚠️  However, each mint has its own master edition (incorrect implementation)`);
      console.log(`  Expected: One master edition, multiple printed editions`);
    } else if (selectedPost.distinctMints === 1 && selectedPost.totalPurchases > 1) {
      console.log(`  ⚠️  SFT/shared-mint model detected`);
      console.log(`  All purchases share the same mint address`);
      console.log(`  This is incorrect for editions`);
    } else {
      console.log(`  ⚠️  Mixed model: ${selectedPost.distinctMints} unique mints for ${selectedPost.totalPurchases} purchases`);
      console.log(`  Some purchases share mints, some don't`);
    }
    
    // Show all posts if multiple
    if (postsWithPurchases.length > 1) {
      console.log(`\n  Other posts with purchases:`);
      postsWithPurchases.slice(1, 6).forEach(p => {
        console.log(`    - ${p.postId}: ${p.totalPurchases} purchases, ${p.distinctMints} unique mints`);
      });
      if (postsWithPurchases.length > 6) {
        console.log(`    ... and ${postsWithPurchases.length - 6} more`);
      }
    }
  }
  
  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

