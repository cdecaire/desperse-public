import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { and, desc, eq, gt, isNull, lt, or, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { posts, purchases, users } from '@/server/db/schema';
import { getHeliusRpcUrl, getPlatformWalletAddress } from '@/config/env';
import { validateAddress } from '@/server/services/blockchain/addressUtils';

// NOTE: @solana/spl-token and transactionBuilder imports are done dynamically inside
// functions to avoid pulling them into client bundle (causes Buffer is not defined error)

// Minting fee in lamports - must match MINTING_FEE_LAMPORTS in transactionBuilder.ts
const MINTING_FEE_LAMPORTS = 10_000_000; // 0.01 SOL

// USDC mint address - defined locally to avoid importing from transactionBuilder
const USDC_MINT_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

import { checkTransactionStatus } from '@/server/services/blockchain/mintCnft';
import { withAuth } from '@/server/auth';
import { getMintWindowStatus } from '@/server/utils/mintWindowStatus';
import { uploadMetadataJson } from '@/server/storage/blob';
import { generateNftMetadata } from '@/server/utils/nft-metadata';

// Schema for buying edition (no userId - derived from auth)
const buyEditionSchema = z.object({
  postId: z.string().uuid(),
  walletAddress: z.string().min(32).max(44).optional(), // Optional: current connected wallet address (for browser extension wallets)
});

const submitSignatureSchema = z.object({
  purchaseId: z.string().uuid(),
  txSignature: z.string(),
});

const cancelPurchaseSchema = z.object({
  purchaseId: z.string().uuid(),
});

const checkPurchaseStatusSchema = z.object({
  purchaseId: z.string().uuid(),
});

const getUserPurchaseSchema = z.object({
  postId: z.string().uuid(),
  userId: z.string().uuid(),
});

const updatePurchaseStatusSchema = z.object({
  txSignature: z.string(),
  status: z.enum(['confirmed', 'failed']),
  nftMint: z.string().optional(),
});

type PurchaseStatus =
  | 'reserved'
  | 'submitted'
  | 'awaiting_fulfillment'
  | 'minting'
  | 'master_created'
  | 'confirmed'
  | 'failed'
  | 'abandoned'
  | 'blocked_missing_master';

interface BuyEditionResult {
  success: boolean;
  status?: PurchaseStatus | 'sold_out' | 'insufficient_funds' | 'not_started' | 'ended';
  purchaseId?: string;
  transaction?: string; // base64
  mintAddress?: string;
  error?: string;
  message?: string;
  startsAt?: Date;
  endedAt?: Date;
}

async function getConnection() {
  const { Connection } = await import('@solana/web3.js');
  return new Connection(getHeliusRpcUrl(), 'confirmed');
}

async function ensureSolBalance(address: string, requiredLamports: bigint): Promise<boolean> {
  // Validate address before creating PublicKey (Phase 4b migration)
  if (!validateAddress(address)) {
    console.error('[ensureSolBalance] Invalid address:', address);
    return false;
  }
  const { PublicKey } = await import('@solana/web3.js');
  const connection = await getConnection();
  const balance = await connection.getBalance(new PublicKey(address));
  return BigInt(balance) >= requiredLamports;
}

async function ensureUsdcBalance(ownerAddress: string, requiredAmount: bigint): Promise<boolean> {
  // Validate address before creating PublicKey (Phase 4b migration)
  if (!validateAddress(ownerAddress)) {
    console.error('[ensureUsdcBalance] Invalid owner address:', ownerAddress);
    return false;
  }
  const { PublicKey } = await import('@solana/web3.js');
  const connection = await getConnection();
  const owner = new PublicKey(ownerAddress);
  const usdcMint = new PublicKey(USDC_MINT_ADDRESS);
  const accounts = await connection.getParsedTokenAccountsByOwner(owner, { mint: usdcMint });
  const total = accounts.value.reduce((sum, acc) => {
    const amount = acc.account.data.parsed.info.tokenAmount.amount as string;
    return sum + BigInt(amount || '0');
  }, 0n);
  return total >= requiredAmount;
}

async function decrementPostSupply(postId: string) {
  await db
    .update(posts)
    .set({
      currentSupply: sql`${posts.currentSupply} - 1`,
    })
    .where(and(eq(posts.id, postId), gt(posts.currentSupply, 0)));
}

// ============================================================================
// Fulfillment is handled by fulfillPurchaseDirect in src/server/utils/fulfillment.ts
// (includes Arweave finalization for permanent storage editions)

// Legacy fulfillPurchase removed — all callers now use fulfillPurchaseDirect

export const buyEdition = createServerFn({
  method: 'POST',
}).handler(async (input: unknown): Promise<BuyEditionResult> => {
  try {
    console.log('[buyEdition] Received request:', {
      hasInput: !!input,
      inputType: typeof input,
    });

    // Authenticate user using withAuth helper
    let authResult;
    try {
      authResult = await withAuth(buyEditionSchema, input);
    } catch (authError) {
      // withAuth throws when auth fails - catch and return proper response
      const message = authError instanceof Error ? authError.message : 'Authentication failed'
      console.warn('[buyEdition] Auth error:', message)
      return {
        success: false,
        error: 'auth_required',
        message,
      };
    }

    if (!authResult) {
      return {
        success: false,
        error: 'auth_required',
        message: 'Authentication required. Please log in.',
      };
    }

    const { auth, input: parsed } = authResult;
    const { postId, walletAddress: providedWalletAddress } = parsed;
    // Use server-verified userId
    const userId = auth.userId;
    console.log('[buyEdition] Parsed input:', { postId, userId, hasWalletAddress: !!providedWalletAddress });

    // Fetch post and creator info
    const postResult = await db
      .select({
        post: posts,
        creator: {
          id: users.id,
          walletAddress: users.walletAddress,
          usernameSlug: users.usernameSlug,
          displayName: users.displayName,
        },
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(eq(posts.id, postId))
      .limit(1);

    if (!postResult.length) {
      return { success: false, error: 'Post not found', message: 'This post is unavailable.' };
    }

    const { post, creator: creatorFromDb } = postResult[0];

    if (post.type !== 'edition' || !post.price || !post.currency) {
      return { success: false, error: 'Not an edition', message: 'This post is not purchasable as an edition.' };
    }

    // Time window check (pre-flight — authoritative check uses DB time in the atomic transaction)
    const mintWindowStatus = getMintWindowStatus(post)
    if (mintWindowStatus.status === 'not_started') {
      console.info('[buyEdition] time-gate', {
        postId, userId,
        windowStart: post.mintWindowStart,
        windowEnd: post.mintWindowEnd,
        serverNow: new Date().toISOString(),
        decision: 'not_started',
      })
      return {
        success: false,
        status: 'not_started',
        message: 'This edition is not available for purchase yet.',
        startsAt: mintWindowStatus.startsAt,
      }
    }
    if (mintWindowStatus.status === 'ended') {
      console.info('[buyEdition] time-gate', {
        postId, userId,
        windowStart: post.mintWindowStart,
        windowEnd: post.mintWindowEnd,
        serverNow: new Date().toISOString(),
        decision: 'ended',
      })
      return {
        success: false,
        status: 'ended',
        message: 'The minting window for this edition has closed.',
        endedAt: mintWindowStatus.endedAt,
      }
    }
    // Log successful time gate pass for audit trail
    if (mintWindowStatus.status === 'active') {
      console.info('[buyEdition] time-gate', {
        postId, userId,
        windowStart: post.mintWindowStart,
        windowEnd: post.mintWindowEnd,
        serverNow: new Date().toISOString(),
        decision: 'allowed',
      })
    }

    // Supply check (pre-flight)
    if (post.maxSupply !== null && post.maxSupply !== undefined && post.currentSupply >= post.maxSupply) {
      return { success: false, status: 'sold_out', message: 'This edition is sold out.' };
    }

    // Use creatorWallet from post if available, otherwise fall back to creator.walletAddress
    // creatorWallet is the canonical update authority target (set at post creation)
    const creatorWallet = post.creatorWallet || creatorFromDb.walletAddress;
    if (!creatorWallet) {
      return {
        success: false,
        error: 'Creator wallet not found',
        message: 'Creator wallet address is missing.',
      };
    }

    const creator = {
      ...creatorFromDb,
      walletAddress: creatorWallet,
    };

    // Buyer wallet - validate via userWallets table with backward compat
    let buyerWallet: string;

    if (providedWalletAddress) {
      // Validate it's a valid Solana address
      if (!validateAddress(providedWalletAddress)) {
        console.error('[buyEdition] Invalid wallet address:', providedWalletAddress);
        return { success: false, error: 'Invalid wallet address', message: 'Invalid wallet address provided.' };
      }

      // Validate ownership via userWallets table
      const { getWalletAddressForTransaction } = await import('@/server/utils/wallet-compat');
      const resolved = await getWalletAddressForTransaction(userId, providedWalletAddress);
      if (resolved) {
        buyerWallet = resolved;
        console.log('[buyEdition] Using validated wallet address:', buyerWallet);
      } else {
        // Backward compat: allow if it matches users.walletAddress (user not migrated to userWallets)
        const buyerRow = await db.select({ walletAddress: users.walletAddress }).from(users).where(eq(users.id, userId)).limit(1);
        if (buyerRow.length && buyerRow[0].walletAddress === providedWalletAddress) {
          buyerWallet = providedWalletAddress;
          console.log('[buyEdition] Using legacy wallet address (not in userWallets):', buyerWallet);
        } else {
          return { success: false, error: 'Wallet not verified', message: 'The selected wallet is not registered to your account.' };
        }
      }
    } else {
      console.log('[buyEdition] No wallet address provided, using database wallet');
      // Fall back to database wallet address (for embedded wallets)
      const buyerRow = await db.select({ walletAddress: users.walletAddress }).from(users).where(eq(users.id, userId)).limit(1);
      if (!buyerRow.length || !buyerRow[0].walletAddress) {
        return { success: false, error: 'Wallet not found', message: 'Please connect your wallet.' };
      }
      buyerWallet = buyerRow[0].walletAddress;
    }
    const connection = await getConnection();

    // Balance check for Core minting
    // Buyer pays: price + minting fee (0.01 SOL) + transaction fee (~0.00001 SOL)
    // The minting fee is collected in the payment transaction and covers Core asset creation
    const transactionFeeLamports = 10_000n; // ~0.00001 SOL for payment tx fee
    const mintingFeeLamports = BigInt(MINTING_FEE_LAMPORTS); // 0.01 SOL for Core minting

    console.log('[buyEdition] Balance check:', {
      price: post.price,
      currency: post.currency,
      mintingFee: Number(mintingFeeLamports) / 1e9,
      transactionFee: Number(transactionFeeLamports) / 1e9,
    });

    if (post.currency === 'SOL') {
      // SOL payment: price + minting fee + tx fee
      const required = BigInt(post.price) + mintingFeeLamports + transactionFeeLamports;
      console.log('[buyEdition] SOL payment required:', Number(required) / 1e9, 'SOL');

      const hasSol = await ensureSolBalance(buyerWallet, required);
      if (!hasSol) {
        return {
          success: false,
          status: 'insufficient_funds',
          message: `Not enough SOL. Required: ${Number(required) / 1e9} SOL (price: ${Number(post.price) / 1e9} + minting fee: ${Number(mintingFeeLamports) / 1e9})`,
        };
      }
    } else {
      // USDC payment: USDC for price + SOL for minting fee + tx fee
      const solRequired = mintingFeeLamports + transactionFeeLamports;
      console.log('[buyEdition] USDC payment - SOL required for fees:', Number(solRequired) / 1e9, 'SOL');

      const hasSolForFees = await ensureSolBalance(buyerWallet, solRequired);
      if (!hasSolForFees) {
        return {
          success: false,
          status: 'insufficient_funds',
          message: `Not enough SOL for minting fee. Required: ${Number(solRequired) / 1e9} SOL`,
        };
      }

      const hasUsdc = await ensureUsdcBalance(buyerWallet, BigInt(post.price));
      if (!hasUsdc) {
        return {
          success: false,
          status: 'insufficient_funds',
          message: 'Not enough USDC balance.',
        };
      }
    }

    const metadataUri = post.metadataUrl || post.mediaUrl;
    let resolvedMetadataUri = metadataUri;

    // Validate metadata URI length (Metaplex max is 200 characters)
    if (resolvedMetadataUri && resolvedMetadataUri.length > 200) {
      console.error('Metadata URI too long:', resolvedMetadataUri.length, 'characters');
      return {
        success: false,
        error: 'Metadata URI too long',
        message: 'Metadata URI exceeds maximum length. Please contact support.',
      };
    }

    if (!resolvedMetadataUri) {
      // Fetch creator rights for metadata stamping
      const { getCreatorRightsForMint } = await import('@/server/utils/creator-settings');
      const rights = await getCreatorRightsForMint(userId);

      // Fallback: generate metadata JSON using the shared function to ensure consistency
      const metadata = generateNftMetadata(
        {
          id: post.id,
          caption: post.caption,
          mediaUrl: post.mediaUrl,
          coverUrl: post.coverUrl,
          type: 'edition',
          maxSupply: post.maxSupply,
          price: post.price,
          currency: post.currency,
          nftName: post.nftName,
          nftSymbol: post.nftSymbol,
          nftDescription: post.nftDescription,
          sellerFeeBasisPoints: post.sellerFeeBasisPoints,
          isMutable: post.isMutable,
        },
        creator,
        {
          rights,
          desperseContext: {
            postId: post.id,
            postUrl: `https://desperse.com/post/${post.id}`,
            creatorHandle: `@${creatorFromDb.usernameSlug}`,
            createdAt: post.createdAt.toISOString(),
            mintSource: 'edition',
          },
        },
      );

      const upload = await uploadMetadataJson(metadata, post.id);
      if (!upload.success) {
        return {
          success: false,
          error: 'Metadata upload failed',
          message: 'Could not upload NFT metadata.',
        };
      }
      resolvedMetadataUri = upload.url;
    }

    // Creator wallet should already be set from transaction (from post.creatorWallet or creator.walletAddress)
    // But double-check for safety
    if (!creator.walletAddress) {
      return {
        success: false,
        error: 'Creator wallet not found',
        message: 'Creator wallet address is missing.',
      };
    }

    // Double-check balance right before building transaction (balance may have changed)
    const { PublicKey } = await import('@solana/web3.js');
    const currentBalance = await connection.getBalance(new PublicKey(buyerWallet));
    const currentBalanceSOL = currentBalance / 1e9;
    
    console.log('[buyEdition] Current wallet balance:', {
      wallet: buyerWallet,
      balanceLamports: currentBalance.toString(),
      balanceSOL: currentBalanceSOL,
    });

    // Validate platform wallet is configured (required for fee collection)
    const platformWalletAddress = getPlatformWalletAddress();

    // Build transaction
    console.log('[buyEdition] Building transaction:', {
      buyer: buyerWallet,
      creator: creator.walletAddress,
      platform: platformWalletAddress,
      metadataUriLength: resolvedMetadataUri.length,
      currentBalanceSOL,
    });

    // Build payment transaction (user signs - payment only)
    // Note: NFT name/symbol are used during minting (in checkPurchaseStatus), not during payment
    // Dynamic import to avoid pulling spl-token into client bundle
    const { buildEditionPaymentTransaction } = await import('@/server/services/blockchain/editions/transactionBuilder');
    const paymentTxResult = await buildEditionPaymentTransaction({
      buyer: buyerWallet,
      creator: creator.walletAddress,
      platform: platformWalletAddress,
      price: post.price,
      currency: post.currency,
    });

    // Reserve supply atomically
    const supplyUpdate = await db
      .update(posts)
      .set({
        currentSupply: sql`${posts.currentSupply} + 1`,
      })
      .where(and(eq(posts.id, postId), or(isNull(posts.maxSupply), lt(posts.currentSupply, posts.maxSupply))))
      .returning({ currentSupply: posts.currentSupply });

    if (!supplyUpdate.length) {
      return { success: false, status: 'sold_out', message: 'This edition is sold out.' };
    }

    // Create purchase record as reservation (mint not persisted until confirmed)
    const purchaseInsert = await db
      .insert(purchases)
      .values({
        userId,
        postId,
        buyerWalletAddress: buyerWallet, // Track which wallet signed the payment
        nftMint: null, // Only set after transaction confirmation
        amountPaid: post.price,
        currency: post.currency,
        status: 'reserved',
        reservedAt: new Date(),
      })
      .returning({ id: purchases.id });

    const purchaseId = purchaseInsert[0].id;

    return {
      success: true,
      status: 'reserved',
      purchaseId,
      transaction: paymentTxResult.transactionBase64,
      // mintAddress will be set after fulfillment transaction confirms
    };
  } catch (error) {
    console.error('Error in buyEdition:', error);
    
    // Log more details for debugging
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Check for specific error types
      if (error.message.includes('HELIUS_API_KEY') || error.message.includes('RPC')) {
        return {
          success: false,
          error: 'RPC configuration error',
          message: 'Server configuration issue. Please contact support.',
        };
      }
      
      if (error.message.includes('database') || error.message.includes('connection')) {
        return {
          success: false,
          error: 'Database error',
          message: 'Database connection issue. Please try again.',
        };
      }
    }
    
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errMessage,
      message: 'An error occurred while processing your purchase. Please try again.',
    };
  }
});

export const submitPurchaseSignature = createServerFn({
  method: 'POST',
}).handler(async (input: unknown): Promise<{ success: boolean; error?: string }> => {
  console.log('[submitPurchaseSignature] Received request');
  try {
    const rawData = input && typeof input === 'object' && 'data' in input ? (input as { data: unknown }).data : input;
    const { purchaseId, txSignature } = submitSignatureSchema.parse(rawData);
    console.log(`[submitPurchaseSignature] Processing: purchaseId=${purchaseId}, txSignature=${txSignature.slice(0, 20)}...`);

    // Update to 'submitted' status when we have a transaction signature
    await db
      .update(purchases)
      .set({
        txSignature,
        status: 'submitted',
        submittedAt: new Date(),
      })
      .where(eq(purchases.id, purchaseId));

    return { success: true };
  } catch (error) {
    console.error('Error in submitPurchaseSignature:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

export const checkPurchaseStatus = createServerFn({
  method: 'POST',
}).handler(async (input: unknown): Promise<{
  success: boolean;
  status?: PurchaseStatus;
  txSignature?: string | null;
  nftMint?: string | null;
  error?: string;
}> => {
  console.log('[checkPurchaseStatus] Received request');
  try {
    const rawData = input && typeof input === 'object' && 'data' in input ? (input as { data: unknown }).data : input;
    const { purchaseId } = checkPurchaseStatusSchema.parse(rawData);
    console.log(`[checkPurchaseStatus] Delegating to checkPurchaseStatusDirect for purchaseId=${purchaseId}`);

    // Delegate to shared core logic (also used by REST API endpoint)
    const { checkPurchaseStatusDirect } = await import('@/server/utils/editions');
    return await checkPurchaseStatusDirect(purchaseId);
  } catch (error) {
    console.error('Error in checkPurchaseStatus:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

/**
 * Cancel a reserved purchase (no signature) and release reserved supply.
 * Used when client signing fails or times out.
 */
export const cancelPendingPurchase = createServerFn({
  method: 'POST',
}).handler(async (input: unknown): Promise<{ success: boolean; error?: string }> => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input ? (input as { data: unknown }).data : input;
    const { purchaseId } = cancelPurchaseSchema.parse(rawData);

    // Fetch purchase
    const purchaseResult = await db
      .select()
      .from(purchases)
      .where(eq(purchases.id, purchaseId))
      .limit(1);

    if (!purchaseResult.length) {
      return { success: false, error: 'Purchase not found' };
    }

    const purchase = purchaseResult[0];

    // Only cancel reserved purchases with no tx signature
    if (purchase.status !== 'reserved' || purchase.txSignature) {
      return { success: false, error: 'Purchase already processed' };
    }

    await db
      .update(purchases)
      .set({ 
        status: 'abandoned',
        failedAt: new Date(),
      })
      .where(eq(purchases.id, purchaseId));
    await decrementPostSupply(purchase.postId);

    return { success: true };
  } catch (error) {
    console.error('Error in cancelPendingPurchase:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

export const getUserPurchaseStatus = createServerFn({
  method: 'POST',
}).handler(async (input: unknown): Promise<{
  success: boolean;
    purchase?: {
      id: string;
      status: string;
      txSignature: string | null;
      nftMint: string | null;
      createdAt: Date;
    };
  error?: string;
}> => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input ? (input as { data: unknown }).data : input;
    const { postId, userId } = getUserPurchaseSchema.parse(rawData);

    const purchase = await db
      .select()
      .from(purchases)
      .where(and(eq(purchases.postId, postId), eq(purchases.userId, userId)))
      .orderBy(desc(purchases.createdAt))
      .limit(1);

    if (!purchase.length) {
      return { success: true };
    }

    const p = purchase[0];
    
    // Auto-clear stale 'reserved' records (never submitted, older than 2 minutes)
    const STALE_RESERVED_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
    const now = new Date();
    const ageMs = now.getTime() - (p.reservedAt?.getTime() || p.createdAt.getTime());
    
    if (p.status === 'reserved' && ageMs > STALE_RESERVED_THRESHOLD_MS) {
      // Mark stale reserved as abandoned and release reserved supply
      await db
        .update(purchases)
        .set({ 
          status: 'abandoned',
          failedAt: new Date(),
        })
        .where(eq(purchases.id, p.id));
      
      await decrementPostSupply(p.postId);
      
      console.log(`[getUserPurchaseStatus] Auto-marked stale reserved purchase as abandoned: ${p.id} (age: ${Math.round(ageMs / 1000)}s)`);
      
      return {
        success: true,
        purchase: {
          id: p.id,
          status: 'abandoned',
          txSignature: p.txSignature,
          nftMint: p.nftMint,
          createdAt: p.createdAt,
        },
      };
    }
    
    // Only 'confirmed' status means purchased - reserved, submitted, failed, and abandoned allow retries
    return {
      success: true,
      purchase: {
        id: p.id,
        status: p.status,
        txSignature: p.txSignature,
        nftMint: p.nftMint,
        createdAt: p.createdAt,
      },
    };
  } catch (error) {
    console.error('Error in getUserPurchaseStatus:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

/**
 * Manually trigger fulfillment for a purchase that has a confirmed payment but no NFT mint.
 * This can be used to recover from cases where fulfillment failed or wasn't triggered.
 */
export const retryFulfillment = createServerFn({
  method: 'POST',
}).handler(async (input: unknown): Promise<{ success: boolean; nftMint?: string; error?: string }> => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input ? (input as { data: unknown }).data : input;
    const { purchaseId } = checkPurchaseStatusSchema.parse(rawData);

    console.log(`[retryFulfillment] Received request for purchase ${purchaseId}`);

    // Validate purchase exists and is in correct state
    const [purchase] = await db
      .select()
      .from(purchases)
      .where(eq(purchases.id, purchaseId))
      .limit(1);

    if (!purchase) {
      return { success: false, error: 'Purchase not found' };
    }

    // Already fulfilled
    if (purchase.nftMint) {
      return { success: true, nftMint: purchase.nftMint };
    }

    // No payment signature
    if (!purchase.txSignature) {
      return { success: false, error: 'No payment transaction signature found' };
    }

    // Skip tx verification if payment was already confirmed (status >= awaiting_fulfillment)
    // The DB is the source of truth — redundant RPC checks can fail due to cache expiry
    const paymentAlreadyConfirmed = ['awaiting_fulfillment', 'master_created', 'minting'].includes(purchase.status);

    if (!paymentAlreadyConfirmed) {
      // Verify payment is confirmed before attempting fulfillment
      const txStatus = await checkTransactionStatus(purchase.txSignature);
      if (txStatus.status !== 'confirmed' && txStatus.status !== 'finalized') {
        return { success: false, error: `Payment transaction not confirmed: ${txStatus.status}` };
      }
    }

    // Ensure purchase is in a fulfillable state
    // If status is 'submitted' or 'confirmed' (without nftMint - buggy state), upgrade to 'awaiting_fulfillment' first
    // Use atomic update with status check to prevent race conditions
    if (purchase.status === 'submitted' || purchase.status === 'confirmed') {
      await db
        .update(purchases)
        .set({
          status: 'awaiting_fulfillment',
          paymentConfirmedAt: purchase.paymentConfirmedAt || new Date(),
        })
        .where(and(
          eq(purchases.id, purchaseId),
          or(
            eq(purchases.status, 'submitted'),
            eq(purchases.status, 'confirmed') // Handle buggy state: confirmed without nftMint
          )
        ));
      console.log(`[retryFulfillment] Updated purchase ${purchaseId} from ${purchase.status} to awaiting_fulfillment`);
    }

    // Delegate to unified fulfillment function (includes Arweave finalization)
    console.log(`[retryFulfillment] Delegating to fulfillPurchaseDirect for ${purchaseId}`);
    const { fulfillPurchaseDirect } = await import('@/server/utils/fulfillment');
    const result = await fulfillPurchaseDirect(purchaseId);

    return {
      success: result.success,
      nftMint: result.nftMint,
      error: result.error,
    };
  } catch (error) {
    console.error('[retryFulfillment] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

export const updatePurchaseStatus = createServerFn({
  method: 'POST',
}).handler(async (input: unknown): Promise<{ success: boolean; updated: boolean; error?: string }> => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input ? (input as { data: unknown }).data : input;
    const { txSignature, status, nftMint } = updatePurchaseStatusSchema.parse(rawData);

    const purchaseResult = await db
      .select()
      .from(purchases)
      .where(eq(purchases.txSignature, txSignature))
      .limit(1);

    if (!purchaseResult.length) {
      return { success: false, updated: false, error: 'Purchase not found for this signature' };
    }

    const purchase = purchaseResult[0];
    const wasNotFailed = purchase.status !== 'failed' && purchase.status !== 'abandoned';
    const isNowFailed = status === 'failed';

    // Only set nftMint on confirmation, and verify it exists if provided
    let verifiedMint: string | null = null;
    if (status === 'confirmed' && nftMint) {
      // Validate address before creating PublicKey (Phase 4b migration)
      if (!validateAddress(nftMint)) {
        console.warn(`[updatePurchaseStatus] Invalid mint address format: ${nftMint}`);
      } else {
        // Verify mint account exists on-chain before saving
        try {
          const { PublicKey: PK } = await import('@solana/web3.js');
          const connection = await getConnection();
          const mintAccount = await connection.getAccountInfo(new PK(nftMint));
          if (mintAccount) {
            verifiedMint = nftMint;
          } else {
            console.warn(`[updatePurchaseStatus] Mint address ${nftMint} does not exist on-chain`);
          }
        } catch (error) {
          console.error(`[updatePurchaseStatus] Error verifying mint account ${nftMint}:`, error);
        }
      }
    }

    await db
      .update(purchases)
      .set({
        status,
        ...(status === 'confirmed' && verifiedMint ? { nftMint: verifiedMint, mintConfirmedAt: new Date() } : {}),
        ...(status === 'confirmed' && !verifiedMint && purchase.nftMint ? {} : {}), // Keep existing if no new verified mint
        ...(isNowFailed && wasNotFailed ? { failedAt: new Date() } : {}),
      })
      .where(eq(purchases.id, purchase.id));

    // Release supply reservation on failure
    if (isNowFailed && wasNotFailed) {
      await decrementPostSupply(purchase.postId);
    }

    return { success: true, updated: true };
  } catch (error) {
    console.error('Error in updatePurchaseStatus:', error);
    return {
      success: false,
      updated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});
