/**
 * Collect server functions
 * Handles free collectible (cNFT) collection operations
 */

import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { db } from '@/server/db';
import { collections, posts, users, notifications } from '@/server/db/schema';
import { eq, and, count, gte } from 'drizzle-orm';
import { z } from 'zod';
import { env } from '@/config/env';
import { checkTransactionStatus } from '@/server/services/blockchain/mintCnft';
import { buildCompressedCollectTransaction } from '@/server/services/blockchain/compressed/mintCollectible';
import { Connection, VersionedTransaction } from '@solana/web3.js';
import { getHeliusRpcUrl } from '@/config/env';
import { snapshotMintedMetadata } from '@/server/utils/mint-snapshot';
import { withAuth } from '@/server/auth';

/**
 * Extract client IP address from request headers
 * Checks multiple headers in order of preference (handles proxies like Vercel, Cloudflare)
 */
function getClientIp(request: Request | null): string | null {
  if (!request) return null;

  // Order of preference for IP headers
  const ipHeaders = [
    'x-vercel-forwarded-for', // Vercel
    'x-real-ip',              // Nginx
    'x-forwarded-for',        // Standard proxy header (may contain multiple IPs)
    'cf-connecting-ip',       // Cloudflare
  ];

  for (const header of ipHeaders) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for may contain multiple IPs: "client, proxy1, proxy2"
      // Take the first (leftmost) which is the original client
      const firstIp = value.split(',')[0].trim();
      if (firstIp) return firstIp;
    }
  }

  return null;
}

// Schema for collecting a post (no userId - derived from auth)
const collectPostSchema = z.object({
  postId: z.string().uuid(),
  walletAddress: z.string().min(32).max(44).optional(), // Optional: active wallet address for multi-wallet support
  _clientIp: z.string().optional(), // Passed from REST API route
});

// Schema for checking collection status
const checkCollectionStatusSchema = z.object({
  collectionId: z.string().uuid(),
});

// Schema for updating collection status (internal, called by webhook)
const updateCollectionStatusSchema = z.object({
  txSignature: z.string(),
  status: z.enum(['confirmed', 'failed']),
  nftMint: z.string().optional(),
});

// submitCollectSignatureSchema removed - submitCollectSignature is deprecated

const simulateTransactionSchema = z.object({
  txBytes: z.array(z.number()), // Transaction bytes as number array for JSON serialization
});

const cancelCollectSchema = z.object({
  collectionId: z.string().uuid(),
});

// Schema for getting user's collection status for a post
const getUserCollectionSchema = z.object({
  postId: z.string().uuid(),
  userId: z.string().uuid(),
});

/**
 * Result type for collect operations
 */
interface CollectPrepareResult {
  success: boolean;
  collectionId?: string;
  txSignature?: string; // Transaction signature (server signs and submits)
  assetId?: string; // Asset ID for cNFTs (stored in nftMint field)
  status?: 'pending' | 'already_collected';
  error?: string;
  /** Human-readable message for UI */
  message?: string;
}

/**
 * Check if user has hit rate limit for collects
 * Enforces three limits:
 * 1. Daily limit per user: max collects per day (default: 10)
 * 2. Daily limit per IP: protects against wallet rotation (default: 30)
 * 3. Burst limit: max collects per minute (default: 2) - prevents bot behavior
 *
 * @param userId - The user's ID
 * @param ipAddress - Client IP address (optional, for IP-based limiting)
 * @returns Whether the user can collect (true) or is rate limited (false)
 */
async function checkRateLimit(userId: string, ipAddress: string | null): Promise<{
  allowed: boolean;
  remaining?: number;
  resetAt?: Date;
  reason?: 'daily_limit' | 'ip_limit' | 'burst_limit';
}> {
  // Time windows
  const dailyWindowSeconds = env.RATE_LIMIT_WINDOW_SECONDS; // 24 hours
  const burstWindowSeconds = env.COLLECT_BURST_WINDOW_SECONDS; // 60 seconds
  const dailyWindowStart = new Date(Date.now() - dailyWindowSeconds * 1000);
  const burstWindowStart = new Date(Date.now() - burstWindowSeconds * 1000);

  // Limits
  const maxCollectsPerDay = env.COLLECT_RATE_LIMIT; // 10 per user
  const maxCollectsPerIp = env.COLLECT_IP_RATE_LIMIT; // 30 per IP
  const maxCollectsPerBurst = env.COLLECT_BURST_LIMIT; // 2 per minute

  // Build queries
  const queries: Promise<{ count: number }[]>[] = [
    // User daily count
    db
      .select({ count: count() })
      .from(collections)
      .where(
        and(
          eq(collections.userId, userId),
          gte(collections.createdAt, dailyWindowStart)
        )
      ),
    // User burst count
    db
      .select({ count: count() })
      .from(collections)
      .where(
        and(
          eq(collections.userId, userId),
          gte(collections.createdAt, burstWindowStart)
        )
      ),
  ];

  // Add IP query if we have an IP
  if (ipAddress) {
    queries.push(
      db
        .select({ count: count() })
        .from(collections)
        .where(
          and(
            eq(collections.ipAddress, ipAddress),
            gte(collections.createdAt, dailyWindowStart)
          )
        )
    );
  }

  const results = await Promise.all(queries);
  const dailyCount = results[0]?.[0]?.count || 0;
  const burstCount = results[1]?.[0]?.count || 0;
  const ipCount = ipAddress ? (results[2]?.[0]?.count || 0) : 0;

  // Check burst limit first (most immediate feedback)
  if (burstCount >= maxCollectsPerBurst) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(Date.now() + burstWindowSeconds * 1000),
      reason: 'burst_limit',
    };
  }

  // Check user daily limit
  if (dailyCount >= maxCollectsPerDay) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(Date.now() + dailyWindowSeconds * 1000),
      reason: 'daily_limit',
    };
  }

  // Check IP daily limit (protects against wallet rotation)
  if (ipAddress && ipCount >= maxCollectsPerIp) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(Date.now() + dailyWindowSeconds * 1000),
      reason: 'ip_limit',
    };
  }

  return {
    allowed: true,
    remaining: maxCollectsPerDay - dailyCount,
  };
}

/**
 * Get the current collect count for a post
 */
async function getPostCollectCount(postId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(collections)
    .where(
      and(
        eq(collections.postId, postId),
        eq(collections.status, 'confirmed')
      )
    );
  
  return result[0]?.count || 0;
}

/**
 * Prepare a compressed collect transaction (Bubblegum/Umi).
 * Returns an unsigned transaction (base64) for the client to sign and send.
 */
export const prepareCollect = createServerFn({
  method: 'POST',
}).handler(async (input: unknown): Promise<CollectPrepareResult> => {
  try {
    // Authenticate user
    let authResult;
    try {
      authResult = await withAuth(collectPostSchema, input);
    } catch (authError) {
      // withAuth throws when auth fails - catch and return proper response
      const message = authError instanceof Error ? authError.message : 'Authentication failed';
      console.warn('[prepareCollect] Auth error:', message);
      return { success: false, error: 'auth_required', message };
    }

    if (!authResult) {
      return { success: false, error: 'auth_required', message: 'Authentication required' };
    }

    const { auth, input: data } = authResult;
    const { postId, walletAddress: requestedWallet, _clientIp } = data;
    const userId = auth.userId;

    // Fetch post
    const postResult = await db
      .select({
        post: posts,
        creator: {
          id: users.id,
          walletAddress: users.walletAddress,
          displayName: users.displayName,
          usernameSlug: users.usernameSlug,
        },
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(
        and(
          eq(posts.id, postId),
          eq(posts.isDeleted, false),
          eq(posts.isHidden, false)
        )
      )
      .limit(1);

    if (postResult.length === 0) {
      return {
        success: false,
        error: 'Post not found',
        message: 'This post doesn\'t exist or was removed.',
      };
    }

    const { post } = postResult[0];

    if (post.type !== 'collectible') {
      return {
        success: false,
        error: 'Not a collectible',
        message: 'This post is not a collectible.',
      };
    }

    // Existing collection?
    const existingCollection = await db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.userId, userId),
          eq(collections.postId, postId)
        )
      )
      .limit(1);

    if (existingCollection.length > 0) {
      const existing = existingCollection[0];
      if (existing.status === 'confirmed') {
        return {
          success: true,
          collectionId: existing.id,
          status: 'already_collected',
          message: 'You\'ve already collected this.',
        };
      }

      // Check if there's a pending/failed collection with a txSignature that might have confirmed
      // This handles the case where the client's poll timed out but the tx actually confirmed
      if (existing.txSignature && existing.status !== 'confirmed') {
        console.log(`[prepareCollect] Checking on-chain status for existing collection ${existing.id} with txSignature ${existing.txSignature}`);

        const txStatus = await checkTransactionStatus(existing.txSignature);

        if (txStatus.status === 'confirmed' || txStatus.status === 'finalized') {
          console.log(`[prepareCollect] Found confirmed tx for collection ${existing.id}, updating status`);

          // Try to extract asset ID if we don't have it
          let assetId = existing.nftMint;
          if (!assetId) {
            const { extractAssetIdFromTransaction } = await import('@/server/services/blockchain/compressed/mintCollectible');
            assetId = await extractAssetIdFromTransaction(existing.txSignature);
          }

          // Update to confirmed
          await db
            .update(collections)
            .set({
              status: 'confirmed',
              nftMint: assetId || existing.nftMint,
            })
            .where(eq(collections.id, existing.id));

          // Create notification for post owner (non-critical, wrapped in try-catch)
          try {
            const [post] = await db
              .select({ userId: posts.userId })
              .from(posts)
              .where(eq(posts.id, existing.postId))
              .limit(1);

            if (post && post.userId !== existing.userId) {
              await db.insert(notifications).values({
                userId: post.userId,
                actorId: existing.userId,
                type: 'collect',
                referenceType: 'post',
                referenceId: existing.postId,
              });
            }
          } catch (notifError) {
            console.warn('[prepareCollect] Failed to create notification:', notifError instanceof Error ? notifError.message : 'Unknown error');
          }

          return {
            success: true,
            collectionId: existing.id,
            status: 'already_collected',
            message: 'You\'ve already collected this.',
          };
        }

        // If tx explicitly failed on-chain, mark as failed and allow retry
        if (txStatus.status === 'failed') {
          console.log(`[prepareCollect] Found failed tx for collection ${existing.id}, allowing retry`);
          await db
            .update(collections)
            .set({ status: 'failed' })
            .where(eq(collections.id, existing.id));
          // Continue to retry logic below
        }
        // If tx is still pending on-chain, check staleness
      }

      if (existing.status === 'pending') {
        // Check if pending is stale (older than 2 minutes)
        const STALE_PENDING_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
        const now = new Date();
        const ageMs = now.getTime() - existing.createdAt.getTime();

        if (ageMs > STALE_PENDING_THRESHOLD_MS) {
          // Mark stale pending as failed to allow retry (already checked on-chain above)
          await db
            .update(collections)
            .set({ status: 'failed' })
            .where(eq(collections.id, existing.id));

          console.log(`[prepareCollect] Auto-marked stale pending collection as failed: ${existing.id} (age: ${Math.round(ageMs / 1000)}s)`);
          // Continue to retry logic below
        } else if (existing.txSignature) {
          // If pending with signature and not stale, let client poll/confirm
          return {
            success: true,
            collectionId: existing.id,
            status: 'pending',
            message: 'Collection is being processed...',
          };
        } else {
          // Pending without signature - mark as failed and allow retry
          await db
            .update(collections)
            .set({ status: 'failed' })
            .where(eq(collections.id, existing.id));
          // Continue to retry logic below
        }
      }
      // If failed (or was just marked as failed above), allow retry below
    }

    // Note: Collectibles are always unlimited (no max supply check)
    // Max supply only applies to editions

    // Get client IP for rate limiting
    // Use _clientIp if provided (from REST API), otherwise try TanStack's getRequest
    let clientIp: string | null = _clientIp || null;
    if (!clientIp) {
      try {
        const request = getRequest();
        clientIp = getClientIp(request);
      } catch {
        // getRequest may fail in some contexts, continue without IP
      }
    }

    // Rate limit (user + IP + burst)
    const rateLimitResult = await checkRateLimit(userId, clientIp);
    if (!rateLimitResult.allowed) {
      const secondsUntilReset = rateLimitResult.resetAt
        ? Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000)
        : 60;

      // Different messages based on which limit was hit
      let message: string;
      if (rateLimitResult.reason === 'burst_limit') {
        message = `Slow down! Try again in ${secondsUntilReset} seconds.`;
      } else if (rateLimitResult.reason === 'ip_limit') {
        const hoursUntilReset = Math.ceil(secondsUntilReset / 3600);
        message = `Too many collects from this network. Try again in ${hoursUntilReset} hour${hoursUntilReset > 1 ? 's' : ''}.`;
      } else {
        const hoursUntilReset = Math.ceil(secondsUntilReset / 3600);
        message = `You've reached your daily collect limit. Try again in ${hoursUntilReset} hour${hoursUntilReset > 1 ? 's' : ''}.`;
      }

      return {
        success: false,
        error: 'Rate limited',
        message,
      };
    }

    // Collector wallet - resolve from multi-wallet table or fall back to users.walletAddress
    let collectorWalletAddress: string;

    if (requestedWallet) {
      // Validate the requested wallet belongs to this user via userWallets table
      const { getWalletAddressForTransaction } = await import('@/server/utils/wallet-compat');
      const resolved = await getWalletAddressForTransaction(userId, requestedWallet);
      if (resolved) {
        collectorWalletAddress = resolved;
      } else {
        // Backward compat: allow if it matches users.walletAddress (user not migrated to userWallets)
        const userRow = await db
          .select({ walletAddress: users.walletAddress })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        if (userRow.length && userRow[0].walletAddress === requestedWallet) {
          collectorWalletAddress = requestedWallet;
          console.log('[prepareCollect] Using legacy wallet address (not in userWallets):', collectorWalletAddress);
        } else {
          return {
            success: false,
            error: 'Wallet not verified',
            message: 'The selected wallet is not registered to your account.',
          };
        }
      }
    } else {
      // No wallet specified - fall back to users.walletAddress (existing behavior)
      const collector = await db
        .select({ walletAddress: users.walletAddress })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (collector.length === 0 || !collector[0].walletAddress) {
        return {
          success: false,
          error: 'Wallet not found',
          message: 'Please connect your wallet to collect.',
        };
      }

      collectorWalletAddress = collector[0].walletAddress;

      // Verify wallet ownership (belt and suspenders) - only for legacy path
      if (auth.walletAddress && auth.walletAddress !== collectorWalletAddress) {
        console.error(`[prepareCollect] SECURITY: Wallet mismatch for user ${userId}. Auth wallet: ${auth.walletAddress}, DB wallet: ${collectorWalletAddress}`);
        return {
          success: false,
          error: 'Wallet mismatch',
          message: 'Your wallet could not be verified. Please reconnect your wallet.',
        };
      }
    }

    // Create / update collection record
    let collectionId: string;
    if (existingCollection.length > 0 && existingCollection[0].status === 'failed') {
      collectionId = existingCollection[0].id;
      await db
        .update(collections)
        .set({
          status: 'pending',
          txSignature: null,
          nftMint: null,
          ipAddress: clientIp, // Update IP on retry
        })
        .where(eq(collections.id, collectionId));
    } else {
      const newCollection = await db
        .insert(collections)
        .values({
          userId,
          postId,
          status: 'pending',
          ipAddress: clientIp, // Store IP for rate limiting
        })
        .returning();
      collectionId = newCollection[0].id;
    }

    // Build compressed collect transaction (Bubblegum/Umi)
    const buildResult = await buildCompressedCollectTransaction({
      postId,
      collectorPubkey: collectorWalletAddress,
    });

    if (!buildResult.success || !buildResult.txSignature) {
      await db
        .update(collections)
        .set({ status: 'failed' })
        .where(eq(collections.id, collectionId));

      return {
        success: false,
        error: buildResult.error || 'Failed to submit collect transaction',
        message: buildResult.error || 'Failed to submit collect transaction',
      };
    }

    // Update collection with transaction signature and asset ID (if available)
    // For cNFTs, assetId is stored in nftMint field (it's not a traditional mint address)
    await db
      .update(collections)
      .set({
        status: 'pending',
        txSignature: buildResult.txSignature,
        nftMint: buildResult.assetId || null, // Asset ID for cNFTs
      })
      .where(eq(collections.id, collectionId));

    return {
      success: true,
      collectionId,
      txSignature: buildResult.txSignature,
      assetId: buildResult.assetId, // Return asset ID if extracted
      status: 'pending',
    };
  } catch (error) {
    console.error('Error in prepareCollect:', error);

    if (error instanceof Error && error.message.includes('unique')) {
      return {
        success: false,
        status: 'already_collected',
        message: 'You\'ve already collected this.',
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Something went wrong. Please try again.',
    };
  }
});

/**
 * Get user's collection status for a specific post
 * Used to show the correct button state (Collect vs Collected)
 */
export const getUserCollectionStatus = createServerFn({
  method: 'GET',
}).handler(async (input: unknown): Promise<{
  success: boolean;
  hasCollected: boolean;
  collection?: {
    id: string;
    status: string;
    txSignature: string | null;
    nftMint: string | null;
    createdAt: Date;
  };
  error?: string;
}> => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input;
    
    const { postId, userId } = getUserCollectionSchema.parse(rawData);
    
    const collection = await db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.userId, userId),
          eq(collections.postId, postId)
        )
      )
      .limit(1);
    
    if (collection.length === 0) {
      return {
        success: true,
        hasCollected: false,
      };
    }
    
    const col = collection[0];
    
    // Auto-clear stale pending records (older than 2 minutes)
    const STALE_PENDING_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
    const now = new Date();
    const ageMs = now.getTime() - col.createdAt.getTime();
    
    if (col.status === 'pending' && ageMs > STALE_PENDING_THRESHOLD_MS) {
      // Mark stale pending as failed
      await db
        .update(collections)
        .set({ status: 'failed' })
        .where(eq(collections.id, col.id));
      
      console.log(`[getUserCollectionStatus] Auto-marked stale pending collection as failed: ${col.id} (age: ${Math.round(ageMs / 1000)}s)`);
      
      // Return failed status so client can retry
      return {
        success: true,
        hasCollected: false, // Only confirmed counts as collected
        collection: {
          id: col.id,
          status: 'failed',
          txSignature: col.txSignature,
          nftMint: col.nftMint,
          createdAt: col.createdAt,
        },
      };
    }
    
    // Only treat 'confirmed' as collected - pending and failed allow retries
    return {
      success: true,
      hasCollected: col.status === 'confirmed',
      collection: {
        id: col.id,
        status: col.status,
        txSignature: col.txSignature,
        nftMint: col.nftMint,
        createdAt: col.createdAt,
      },
    };
  } catch (error) {
    console.error('Error in getUserCollectionStatus:', error);
    return {
      success: false,
      hasCollected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

/**
 * Check the status of a collection by ID
 * Used for polling when webhook is delayed
 */
export const checkCollectionStatus = createServerFn({
  method: 'GET',
}).handler(async (input: unknown): Promise<{
  success: boolean;
  status?: 'pending' | 'confirmed' | 'failed';
  txSignature?: string;
  nftMint?: string;
  error?: string;
}> => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input;
    
    const { collectionId } = checkCollectionStatusSchema.parse(rawData);
    
    const collection = await db
      .select()
      .from(collections)
      .where(eq(collections.id, collectionId))
      .limit(1);
    
    if (collection.length === 0) {
      return {
        success: false,
        error: 'Collection not found',
      };
    }
    
    const col = collection[0];
    
    // Auto-clear stale pending records (older than 2 minutes)
    const STALE_PENDING_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
    const now = new Date();
    const ageMs = now.getTime() - col.createdAt.getTime();
    
    if (col.status === 'pending' && ageMs > STALE_PENDING_THRESHOLD_MS) {
      // Mark stale pending as failed
      await db
        .update(collections)
        .set({ status: 'failed' })
        .where(eq(collections.id, collectionId));
      
      console.log(`[checkCollectionStatus] Auto-marked stale pending collection as failed: ${collectionId} (age: ${Math.round(ageMs / 1000)}s)`);
      
      return {
        success: true,
        status: 'failed',
        txSignature: col.txSignature || undefined,
        nftMint: col.nftMint || undefined,
      };
    }
    
    // If still pending and we have a tx signature, check on-chain status
    if (col.status === 'pending' && col.txSignature) {
      const txStatus = await checkTransactionStatus(col.txSignature);
      
      if (txStatus.status === 'confirmed' || txStatus.status === 'finalized') {
        // Try to extract asset ID if we don't have it yet
        let assetId = col.nftMint;
        if (!assetId) {
          const { extractAssetIdFromTransaction } = await import('@/server/services/blockchain/compressed/mintCollectible');
          assetId = await extractAssetIdFromTransaction(col.txSignature);
        }
        
        // Update to confirmed with asset ID
        await db
          .update(collections)
          .set({
            status: 'confirmed',
            nftMint: assetId || col.nftMint, // Update asset ID if we found it
          })
          .where(eq(collections.id, collectionId));

        // Snapshot minted metadata on first confirmed mint (non-critical)
        try {
          await snapshotMintedMetadata({
            postId: col.postId,
            txSignature: col.txSignature,
          });
        } catch (snapshotError) {
          console.warn('[checkCollectionStatus] Failed to snapshot metadata:', snapshotError instanceof Error ? snapshotError.message : 'Unknown error');
        }

        // Create notification for post owner (non-critical)
        try {
          const [post] = await db
            .select({ userId: posts.userId })
            .from(posts)
            .where(eq(posts.id, col.postId))
            .limit(1);

          if (post && post.userId !== col.userId) {
            await db.insert(notifications).values({
              userId: post.userId,
              actorId: col.userId,
              type: 'collect',
              referenceType: 'post',
              referenceId: col.postId,
            });
          }
        } catch (notifError) {
          console.warn('[checkCollectionStatus] Failed to create notification:', notifError instanceof Error ? notifError.message : 'Unknown error');
        }

        return {
          success: true,
          status: 'confirmed',
          txSignature: col.txSignature,
          nftMint: assetId || col.nftMint || undefined,
        };
      }
      
      if (txStatus.status === 'failed') {
        // Update to failed
        await db
          .update(collections)
          .set({ status: 'failed' })
          .where(eq(collections.id, collectionId));
        
        return {
          success: true,
          status: 'failed',
          txSignature: col.txSignature,
        };
      }
    }
    
    return {
      success: true,
      status: col.status as 'pending' | 'confirmed' | 'failed',
      txSignature: col.txSignature || undefined,
      nftMint: col.nftMint || undefined,
    };
  } catch (error) {
    console.error('Error in checkCollectionStatus:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

/**
 * DEPRECATED: No longer used - server now signs and submits in prepareCollect.
 * Kept for backwards compatibility but should not be called.
 */
export const submitCollectSignature = createServerFn({
  method: 'POST',
}).handler(async (_input: unknown): Promise<{ success: boolean; error?: string; txSignature?: string }> => {
  // This function is deprecated - server now handles signing in prepareCollect
  return { success: false, error: 'This endpoint is deprecated. Server now signs and submits in prepareCollect.' };
});

/**
 * Simulate a transaction to get program logs and error details.
 * Uses the same Helius RPC as Umi to avoid CORS/403 issues.
 * This helps debug transaction failures before sending to Privy.
 */
export const simulateTransaction = createServerFn({
  method: 'POST',
}).handler(async (input: unknown): Promise<{
  success: boolean;
  err?: any;
  logs?: string[];
  unitsConsumed?: number;
  error?: string;
}> => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input;

    const { txBytes } = simulateTransactionSchema.parse(rawData);

    // Convert number array back to Uint8Array
    const bytes = new Uint8Array(txBytes);
    
    // Deserialize transaction
    const tx = VersionedTransaction.deserialize(bytes);

    // Use the same Helius RPC as Umi
    const rpcUrl = getHeliusRpcUrl();
    const connection = new Connection(rpcUrl, 'confirmed');

    console.log('[simulate][server] Simulating transaction:', {
      txBytesLength: bytes.length,
      rpcUrl: rpcUrl.replace(/\?api-key=[^&]+/, '?api-key=***'), // Hide API key in logs
    });

    // Simulate transaction
    const sim = await connection.simulateTransaction(tx, {
      sigVerify: false, // Don't verify signatures (transaction is unsigned)
      replaceRecentBlockhash: true, // Use latest blockhash
    });

    console.log('[simulate][server] Simulation result:', {
      err: sim.value.err,
      logsCount: sim.value.logs?.length || 0,
      unitsConsumed: sim.value.unitsConsumed,
    });

    // Log program logs for debugging
    if (sim.value.logs && sim.value.logs.length > 0) {
      console.log('[simulate][server] Program logs:');
      sim.value.logs.forEach((log, idx) => {
        console.log(`  [${idx}] ${log}`);
        // Highlight Bubblegum errors
        if (typeof log === 'string' && (
          log.includes('tree authority') || 
          log.includes('TreeAuthority') ||
          log.includes('PublicKeyMismatch') ||
          log.includes('Incorrect tree') ||
          log.includes('AccountNotFound')
        )) {
          console.error(`  ⚠️  BUBBLEGUM ERROR: ${log}`);
        }
      });
    }

    return {
      success: true,
      err: sim.value.err,
      logs: sim.value.logs || [],
      unitsConsumed: sim.value.unitsConsumed,
    };
  } catch (error) {
    console.error('[simulate][server] Simulation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

/**
 * Cancel a pending collect (no signature) so user can retry.
 * Only cancels if status is pending and txSignature is null.
 */
export const cancelPendingCollect = createServerFn({
  method: 'POST',
}).handler(async (input: unknown): Promise<{ success: boolean; error?: string }> => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input;

    const { collectionId } = cancelCollectSchema.parse(rawData);

    const result = await db
      .select()
      .from(collections)
      .where(eq(collections.id, collectionId))
      .limit(1);

    if (!result.length) {
      return { success: false, error: 'Collection not found' };
    }

    const col = result[0];
    if (col.status !== 'pending' || col.txSignature) {
      return { success: false, error: 'Collection already processed' };
    }

    await db
      .update(collections)
      .set({ status: 'failed' })
      .where(eq(collections.id, collectionId));

    return { success: true };
  } catch (error) {
    console.error('Error in cancelPendingCollect:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

/**
 * Update collection status (internal, called by webhook handler)
 * This should only be called from the webhook handler, not exposed to clients
 */
export const updateCollectionStatus = createServerFn({
  method: 'POST',
}).handler(async (input: unknown): Promise<{
  success: boolean;
  updated: boolean;
  error?: string;
}> => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input;
    
    const { txSignature, status, nftMint } = updateCollectionStatusSchema.parse(rawData);
    
    // Find collection by tx signature
    const collection = await db
      .select()
      .from(collections)
      .where(eq(collections.txSignature, txSignature))
      .limit(1);
    
    if (collection.length === 0) {
      return {
        success: false,
        updated: false,
        error: 'Collection not found for this transaction',
      };
    }
    
    // Update the collection status
    await db
      .update(collections)
      .set({
        status,
        nftMint: nftMint || collection[0].nftMint,
      })
      .where(eq(collections.id, collection[0].id));
    
    return {
      success: true,
      updated: true,
    };
  } catch (error) {
    console.error('Error in updateCollectionStatus:', error);
    return {
      success: false,
      updated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

/**
 * Get collect count for a post
 * Used by feed/post detail to show current collect numbers
 */
export const getCollectCount = createServerFn({
  method: 'GET',
}).handler(async (input: unknown): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input;
    
    const { postId } = z.object({ postId: z.string().uuid() }).parse(rawData);
    
    const count = await getPostCollectCount(postId);
    
    return {
      success: true,
      count,
    };
  } catch (error) {
    console.error('Error in getCollectCount:', error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

