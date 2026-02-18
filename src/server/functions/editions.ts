import { createServerFn } from '@tanstack/react-start';
import { Connection, PublicKey } from '@solana/web3.js';
import { z } from 'zod';
import { and, desc, eq, gt, isNull, lt, or, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { posts, purchases, users, postAssets, notifications } from '@/server/db/schema';
import { getHeliusRpcUrl, getPlatformWalletAddress } from '@/config/env';
import { validateAddress } from '@/server/services/blockchain/addressUtils';

// NOTE: @solana/spl-token and transactionBuilder imports are done dynamically inside
// functions to avoid pulling them into client bundle (causes Buffer is not defined error)

// Token program IDs - defined locally to avoid importing from spl-token
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

// Minting fee in lamports - must match MINTING_FEE_LAMPORTS in transactionBuilder.ts
const MINTING_FEE_LAMPORTS = 10_000_000; // 0.01 SOL

// USDC mint address - defined locally to avoid importing from transactionBuilder
const USDC_MINT_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// Core imports are done dynamically inside fulfillPurchase to avoid
// pulling Umi/mpl-core dependencies into client bundle
import { checkTransactionStatus } from '@/server/services/blockchain/mintCnft';
import { snapshotMintedMetadata } from '@/server/utils/mint-snapshot';
import { withAuth } from '@/server/auth';
import { Buffer } from 'buffer';

// MINT_SIZE constant (82 bytes) - defined locally to avoid Buffer dependency in client bundle
const MINT_SIZE = 82;
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

/**
 * Shared helper to send and confirm a fulfillment transaction.
 * Returns the signature and confirmation result.
 * Throws if transaction fails or cannot be confirmed.
 */
async function sendAndConfirmFulfillmentTransaction(
  connection: Connection,
  txBytes: Buffer,
  blockhash: string,
  lastValidBlockHeight: number,
): Promise<{ signature: string; confirmation: { value: { err: any } } }> {
  // Send transaction
  const signature = await connection.sendRawTransaction(txBytes, {
    skipPreflight: false,
    maxRetries: 3,
  });

  console.log(`[sendAndConfirmFulfillmentTransaction] Transaction sent: ${signature}`);

  // Confirm transaction
  const confirmation = await connection.confirmTransaction(
    {
      signature,
      blockhash,
      lastValidBlockHeight,
    },
    'confirmed'
  );

  if (confirmation.value.err) {
    throw new Error(`Fulfillment tx failed: ${JSON.stringify(confirmation.value.err)}`);
  }

  console.log(`[sendAndConfirmFulfillmentTransaction] Transaction confirmed: ${signature}`);

  return { signature, confirmation };
}

/**
 * Validate that master mint exists on-chain before attempting fulfillment.
 * Returns true if valid, throws if invalid (should block fulfillment).
 */
async function validateMasterMintExists(
  connection: Connection,
  masterMint: string | null,
): Promise<void> {
  if (!masterMint) {
    return; // No master mint means this is first purchase (master creation)
  }

  // Validate address before creating PublicKey (Phase 4b migration)
  if (!validateAddress(masterMint)) {
    throw new Error(`Invalid master mint address: ${masterMint}`);
  }

  const masterMintPk = new PublicKey(masterMint);
  const info = await connection.getAccountInfo(masterMintPk, 'confirmed');

  if (!info) {
    throw new Error(
      `Master mint not found on-chain: ${masterMintPk.toBase58()}. ` +
      `This purchase is blocked. The master mint may have been created on a different cluster ` +
      `or the transaction may have failed. Please contact support.`
    );
  }

  const isTokenProgram =
    info.owner.equals(TOKEN_PROGRAM_ID) || info.owner.equals(TOKEN_2022_PROGRAM_ID);

  if (!isTokenProgram) {
    throw new Error(
      `Master mint has unexpected owner ${info.owner.toBase58()} for ${masterMintPk.toBase58()}. ` +
      `This likely means the database contains the wrong address (metadata PDA, edition PDA, etc.). ` +
      `Please contact support.`
    );
  }

  console.log(`[validateMasterMintExists] Master mint validated: ${masterMintPk.toBase58()}`);
}

/**
 * Log cluster information (RPC URL and genesis hash) for debugging cluster mismatches.
 * Uses a per-request flag to avoid spam while still logging once per fulfillment attempt.
 */
async function logClusterInfo(connection: Connection, rpcUrl: string): Promise<void> {
  try {
    const genesisHash = await connection.getGenesisHash();
    console.log('[editions] Cluster info:', {
      rpcUrl,
      genesisHash,
    });
  } catch (error) {
    console.warn('[editions] Failed to get genesis hash:', error);
  }
}

interface BuyEditionResult {
  success: boolean;
  status?: PurchaseStatus | 'sold_out' | 'insufficient_funds';
  purchaseId?: string;
  transaction?: string; // base64
  mintAddress?: string;
  error?: string;
  message?: string;
}

async function getConnection() {
  return new Connection(getHeliusRpcUrl(), 'confirmed');
}

async function ensureSolBalance(address: string, requiredLamports: bigint): Promise<boolean> {
  // Validate address before creating PublicKey (Phase 4b migration)
  if (!validateAddress(address)) {
    console.error('[ensureSolBalance] Invalid address:', address);
    return false;
  }
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

/**
 * Extract mint address from a confirmed transaction.
 * Looks for newly created accounts owned by the Token Program that are mint accounts (MINT_SIZE bytes).
 * Since the transaction creates exactly one mint account, we can identify it by:
 * - Being owned by Token Program
 * - Having size MINT_SIZE (82 bytes)
 * - Being writable in the transaction
 */
export async function extractMintAddressFromTransaction(txSignature: string): Promise<string | null> {
  try {
    const connection = await getConnection();
    const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    
    const tx = await connection.getTransaction(txSignature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });
    
    if (!tx?.transaction?.message) {
      return null;
    }
    
    // Get account keys and their write status
    const accountKeys: Array<{ pubkey: PublicKey; writable: boolean }> = [];
    const message = tx.transaction.message;
    
    if ('staticAccountKeys' in message) {
      // V0 transaction
      const v0Message = message as { staticAccountKeys: PublicKey[]; header: { numReadonlySignedAccounts: number; numReadonlyUnsignedAccounts: number } };
      v0Message.staticAccountKeys.forEach((pubkey: PublicKey, index: number) => {
        // Check if this account is writable (in header or address table)
        const writable = v0Message.header.numReadonlySignedAccounts + v0Message.header.numReadonlyUnsignedAccounts <= index;
        accountKeys.push({ pubkey, writable });
      });
    } else if ('accountKeys' in message) {
      // Legacy transaction
      const legacyMessage = message as { accountKeys: PublicKey[]; header: { numReadonlySignedAccounts: number; numReadonlyUnsignedAccounts: number } };
      legacyMessage.accountKeys.forEach((pubkey: PublicKey, index: number) => {
        // In legacy, all accounts before readonly accounts are writable
        const writable = index < legacyMessage.accountKeys.length - legacyMessage.header.numReadonlySignedAccounts - legacyMessage.header.numReadonlyUnsignedAccounts;
        accountKeys.push({ pubkey, writable });
      });
    }
    
    // Find mint account: writable, owned by Token Program, size = MINT_SIZE
    for (const { pubkey, writable } of accountKeys) {
      if (!writable) continue; // Mint account must be writable (created)
      
      try {
        const accountInfo = await connection.getAccountInfo(pubkey, 'confirmed');
        if (accountInfo && accountInfo.owner.equals(TOKEN_PROGRAM) && accountInfo.data.length === MINT_SIZE) {
          // This is likely the mint account
          return pubkey.toBase58();
        }
      } catch (e) {
        // Skip accounts we can't fetch
        continue;
      }
    }
    
    return null;
  } catch (error) {
    console.error('[extractMintAddressFromTransaction] Error:', error);
    return null;
  }
}

// ============================================================================
// Fulfillment Core Function (Phase 1 - Prevents Duplicates)
// ============================================================================

interface FulfillPurchaseResult {
  success: boolean;
  status: PurchaseStatus;
  nftMint?: string;
  error?: string;
}

// Stale fulfillment claim threshold - if a claim is older than this, it can be reclaimed
const STALE_CLAIM_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Unified fulfillment function that handles the entire minting flow.
 *
 * This function:
 * 1. Claims fulfillment atomically (prevents concurrent minting)
 * 2. Ensures master edition exists (with row lock to prevent duplicates)
 * 3. Mints print edition
 * 4. Finalizes purchase as confirmed
 *
 * IMPORTANT: This is the ONLY function that should perform minting.
 * checkPurchaseStatus and retryFulfillment should delegate to this.
 */
async function fulfillPurchase(purchaseId: string): Promise<FulfillPurchaseResult> {
  const fulfillmentKey = crypto.randomUUID();
  const now = new Date();
  const staleCutoff = new Date(Date.now() - STALE_CLAIM_THRESHOLD_MS);

  console.log(`[fulfillPurchase] Starting fulfillment for purchase ${purchaseId}, key=${fulfillmentKey.slice(0, 8)}`);

  // Step 1: Atomically claim fulfillment
  // Only succeeds if no active claim exists (or existing claim is stale)
  const claimResult = await db
    .update(purchases)
    .set({
      fulfillmentKey,
      fulfillmentClaimedAt: now,
      mintingStartedAt: now,
      status: 'minting',
    })
    .where(
      and(
        eq(purchases.id, purchaseId),
        or(
          // No existing claim
          isNull(purchases.fulfillmentKey),
          // Or existing claim is stale
          lt(purchases.fulfillmentClaimedAt, staleCutoff)
        ),
        // Only claim if in a state that allows fulfillment
        or(
          eq(purchases.status, 'awaiting_fulfillment'),
          eq(purchases.status, 'master_created'),
          // Allow reclaiming stale minting
          and(
            eq(purchases.status, 'minting'),
            lt(purchases.fulfillmentClaimedAt, staleCutoff)
          ),
          // Allow recovering orphaned 'confirmed' status with no nftMint
          and(
            eq(purchases.status, 'confirmed'),
            isNull(purchases.nftMint)
          )
        )
      )
    )
    .returning({ id: purchases.id });

  if (claimResult.length === 0) {
    // Failed to acquire claim - either another process has it, or purchase is in wrong state
    console.log(`[fulfillPurchase] Failed to acquire claim for ${purchaseId}, checking current state`);

    const [currentPurchase] = await db
      .select()
      .from(purchases)
      .where(eq(purchases.id, purchaseId))
      .limit(1);

    if (!currentPurchase) {
      return { success: false, status: 'failed', error: 'Purchase not found' };
    }

    // If already confirmed with nftMint, return success
    if (currentPurchase.status === 'confirmed' && currentPurchase.nftMint) {
      return { success: true, status: 'confirmed', nftMint: currentPurchase.nftMint };
    }

    // If confirmed but no nftMint (orphaned state), reset to awaiting_fulfillment and retry
    if (currentPurchase.status === 'confirmed' && !currentPurchase.nftMint) {
      console.log(`[fulfillPurchase] Found orphaned confirmed status for ${purchaseId}, resetting to awaiting_fulfillment`);
      await db
        .update(purchases)
        .set({
          status: 'awaiting_fulfillment',
          fulfillmentKey: null,
          fulfillmentClaimedAt: null,
        })
        .where(eq(purchases.id, purchaseId));
      // Return a retryable status
      return { success: false, status: 'awaiting_fulfillment', error: 'Purchase state recovered, please retry' };
    }

    // If minting is in progress (not stale), let caller know
    if (currentPurchase.status === 'minting') {
      return { success: false, status: 'minting', error: 'Minting already in progress' };
    }

    // Otherwise, return current status
    return { success: false, status: currentPurchase.status as PurchaseStatus, error: 'Could not acquire fulfillment lock' };
  }

  console.log(`[fulfillPurchase] Claim acquired for ${purchaseId}`);

  // Step 2: Get purchase and post details
  const [purchaseData] = await db
    .select()
    .from(purchases)
    .where(eq(purchases.id, purchaseId))
    .limit(1);

  if (!purchaseData) {
    return { success: false, status: 'failed', error: 'Purchase not found after claim' };
  }

  try {
    // Get post and user data
    const [postData] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, purchaseData.postId))
      .limit(1);

    if (!postData) {
      throw new Error('Post not found');
    }

    const [buyerData] = await db
      .select()
      .from(users)
      .where(eq(users.id, purchaseData.userId))
      .limit(1);

    if (!buyerData || !buyerData.walletAddress) {
      throw new Error('Buyer wallet not found');
    }

    const [creatorData] = await db
      .select()
      .from(users)
      .where(eq(users.id, postData.userId))
      .limit(1);

    // Use the wallet that actually paid (stored at purchase time), fallback to legacy field
    const buyer = purchaseData.buyerWalletAddress || buyerData.walletAddress;
    const creatorWallet = postData.creatorWallet || creatorData?.walletAddress;

    if (!creatorWallet) {
      throw new Error('Creator wallet not found');
    }

    // Get asset info for protected download URL
    const [assetResult] = await db
      .select({ id: postAssets.id, isGated: postAssets.isGated })
      .from(postAssets)
      .where(eq(postAssets.postId, purchaseData.postId))
      .limit(1);

    // Resolve metadata URI
    let resolvedMetadataUri = postData.metadataUrl;
    if (!resolvedMetadataUri && creatorData) {
      const metadata = generateNftMetadata(
        {
          id: postData.id,
          caption: postData.caption,
          mediaUrl: postData.mediaUrl,
          coverUrl: postData.coverUrl,
          type: postData.type as 'collectible' | 'edition',
          maxSupply: postData.maxSupply,
          price: postData.price,
          currency: postData.currency,
          nftName: postData.nftName,
          nftSymbol: postData.nftSymbol,
          nftDescription: postData.nftDescription,
          sellerFeeBasisPoints: postData.sellerFeeBasisPoints,
          isMutable: postData.isMutable,
          protectDownload: assetResult?.isGated ?? false,
          assetId: assetResult?.id,
        },
        creatorData
      );

      const metadataUpload = await uploadMetadataJson(metadata, postData.id);
      if (!metadataUpload.success) {
        throw new Error('Failed to upload metadata');
      }
      resolvedMetadataUri = metadataUpload.url;

      await db
        .update(posts)
        .set({ metadataUrl: metadataUpload.url })
        .where(eq(posts.id, postData.id));
    }

    if (!resolvedMetadataUri) {
      throw new Error('Missing metadata URL');
    }

    const name = postData.nftName?.trim() || `Edition #${postData.id.slice(0, 8)}`;

    // =========================================================================
    // METAPLEX CORE MINTING (cheaper than Token Metadata)
    // - Collection with MasterEdition plugin = "master"
    // - Asset with Edition plugin = "print"
    // Cost: ~0.0029 SOL per mint vs ~0.022 SOL with Token Metadata
    // =========================================================================

    // Dynamic import to avoid pulling Umi/mpl-core into client bundle
    const { createCoreCollection, createCoreEdition } = await import(
      '@/server/services/blockchain/editions/coreFulfillmentBuilder'
    );

    // Step 3: Ensure collection exists (first purchase creates it)
    // masterMint column now stores the Core collection address
    let collectionAddress: string | null = null;

    // Check if collection already exists
    const [postCheck] = await db
      .select({ masterMint: posts.masterMint, currentSupply: posts.currentSupply })
      .from(posts)
      .where(eq(posts.id, purchaseData.postId))
      .limit(1);

    if (postCheck?.masterMint) {
      // Collection exists, use it
      collectionAddress = postCheck.masterMint;
      console.log(`[fulfillPurchase] Using existing Core collection: ${collectionAddress}`);
    } else {
      // Collection doesn't exist - create it (first purchase)
      console.log(`[fulfillPurchase] No collection found, creating Core collection`);

      try {
        const collectionResult = await createCoreCollection({
          creator: creatorWallet,
          metadataUri: resolvedMetadataUri,
          name,
          maxSupply: postData.maxSupply ?? null,
          sellerFeeBasisPoints: postData.sellerFeeBasisPoints ?? 0,
        });

        console.log(`[fulfillPurchase] Core collection created: ${collectionResult.collectionAddress}`);

        // Atomically persist collection address - only succeeds if still null
        const persistResult = await db
          .update(posts)
          .set({ masterMint: collectionResult.collectionAddress })
          .where(
            and(
              eq(posts.id, purchaseData.postId),
              isNull(posts.masterMint)
            )
          )
          .returning({ masterMint: posts.masterMint });

        if (persistResult.length > 0) {
          // We won the race - use our collection
          collectionAddress = collectionResult.collectionAddress;
          console.log(`[fulfillPurchase] Collection persisted: ${collectionAddress}`);

          // Update purchase with collection creation details
          await db
            .update(purchases)
            .set({
              status: 'master_created',
              masterTxSignature: collectionResult.signature,
            })
            .where(eq(purchases.id, purchaseId));
        } else {
          // Another process already persisted a collection
          const [updatedPost] = await db
            .select({ masterMint: posts.masterMint })
            .from(posts)
            .where(eq(posts.id, purchaseData.postId))
            .limit(1);

          if (updatedPost?.masterMint) {
            console.log(`[fulfillPurchase] Collection was created by another process: ${updatedPost.masterMint}`);
            collectionAddress = updatedPost.masterMint;
          } else {
            throw new Error('Failed to persist collection and no collection found');
          }
        }
      } catch (collectionError) {
        console.error(`[fulfillPurchase] Error creating collection:`, collectionError);
        throw collectionError;
      }
    }

    // Step 4: Create edition asset
    if (!collectionAddress) {
      throw new Error('Collection address not available');
    }

    // Edition number = currentSupply + 1 (before this purchase incremented it)
    // Note: currentSupply was incremented in buyEdition, so we use it directly
    const editionNumber = (postCheck?.currentSupply ?? 0);

    console.log(`[fulfillPurchase] Creating Core edition #${editionNumber} from collection ${collectionAddress}`);

    const editionResult = await createCoreEdition({
      buyer,
      creator: creatorWallet,
      collectionAddress,
      metadataUri: resolvedMetadataUri,
      name,
      editionNumber,
    });

    console.log(`[fulfillPurchase] Core edition created: ${editionResult.assetAddress}`);

    // Step 5: Finalize purchase
    await db
      .update(purchases)
      .set({
        status: 'confirmed',
        nftMint: editionResult.assetAddress,
        printTxSignature: editionResult.signature,
        mintConfirmedAt: new Date(),
        // Clear fulfillment claim
        fulfillmentKey: null,
        fulfillmentClaimedAt: null,
      })
      .where(eq(purchases.id, purchaseId));

    // Snapshot minted metadata (non-critical)
    try {
      await snapshotMintedMetadata({
        postId: purchaseData.postId,
        txSignature: editionResult.signature,
      });
    } catch (snapshotError) {
      console.warn('[fulfillPurchase] Failed to snapshot metadata:', snapshotError instanceof Error ? snapshotError.message : 'Unknown error');
    }

    // Create notification for post owner (if buyer is not the owner) (non-critical)
    if (postData.userId !== purchaseData.userId) {
      try {
        await db.insert(notifications).values({
          userId: postData.userId,
          actorId: purchaseData.userId,
          type: 'purchase',
          referenceType: 'post',
          referenceId: purchaseData.postId,
        });
      } catch (notifError) {
        console.warn('[fulfillPurchase] Failed to create notification:', notifError instanceof Error ? notifError.message : 'Unknown error');
      }
    }

    console.log(`[fulfillPurchase] Purchase ${purchaseId} fulfilled successfully, asset: ${editionResult.assetAddress}`);

    return {
      success: true,
      status: 'confirmed',
      nftMint: editionResult.assetAddress,
    };

  } catch (error) {
    console.error(`[fulfillPurchase] Error fulfilling purchase ${purchaseId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check if this is a retryable error
    const isRetryable =
      errorMessage.includes('expired') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('block height') ||
      errorMessage.includes('not found') || // RPC propagation delay
      errorMessage.includes('AccountNotFoundError'); // Collection not found yet

    // Check if master was created
    const [postCheck] = await db
      .select({ masterMint: posts.masterMint })
      .from(posts)
      .where(eq(posts.id, purchaseData.postId))
      .limit(1);

    if (isRetryable) {
      // Reset to appropriate status for retry
      const retryStatus = postCheck?.masterMint ? 'master_created' : 'awaiting_fulfillment';
      await db
        .update(purchases)
        .set({
          status: retryStatus,
          fulfillmentKey: null,
          fulfillmentClaimedAt: null,
        })
        .where(eq(purchases.id, purchaseId));

      return {
        success: false,
        status: retryStatus,
        error: `Retryable error: ${errorMessage}`,
      };
    }

    // Non-retryable error - mark as failed
    await db
      .update(purchases)
      .set({
        status: 'failed',
        failedAt: new Date(),
        fulfillmentKey: null,
        fulfillmentClaimedAt: null,
      })
      .where(eq(purchases.id, purchaseId));

    // Release reserved supply
    await decrementPostSupply(purchaseData.postId);

    return {
      success: false,
      status: 'failed',
      error: errorMessage,
    };
  }
}

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
        creator
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
    console.log(`[checkPurchaseStatus] Checking status for purchaseId=${purchaseId}`);

    const purchaseResult = await db
      .select()
      .from(purchases)
      .where(eq(purchases.id, purchaseId))
      .limit(1);

    if (!purchaseResult.length) {
      return { success: false, error: 'Purchase not found' };
    }

    const purchase = purchaseResult[0];
    console.log(`[checkPurchaseStatus] Found purchase: status=${purchase.status}, txSignature=${purchase.txSignature ? purchase.txSignature.slice(0, 20) + '...' : 'null'}, nftMint=${purchase.nftMint || 'null'}`);

    // Auto-clear stale 'reserved' records (never submitted, older than 2 minutes)
    // BUT: Don't mark as abandoned if there's a txSignature (payment was submitted)
    const STALE_RESERVED_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
    const now = new Date();
    const ageMs = now.getTime() - (purchase.reservedAt?.getTime() || purchase.createdAt.getTime());
    
    if (purchase.status === 'reserved' && ageMs > STALE_RESERVED_THRESHOLD_MS && !purchase.txSignature) {
      // Mark stale reserved as abandoned and release reserved supply (only if no tx signature)
      await db
        .update(purchases)
        .set({ 
          status: 'abandoned',
          failedAt: new Date(),
        })
        .where(eq(purchases.id, purchaseId));
      
      await decrementPostSupply(purchase.postId);
      
      console.log(`[checkPurchaseStatus] Auto-marked stale reserved purchase as abandoned: ${purchaseId} (age: ${Math.round(ageMs / 1000)}s)`);
      
      return {
        success: true,
        status: 'abandoned',
        txSignature: purchase.txSignature,
        nftMint: purchase.nftMint,
      };
    }

    // If purchase is 'reserved' but has a txSignature, upgrade to 'submitted' and check status
    if (purchase.status === 'reserved' && purchase.txSignature) {
      console.log(`[checkPurchaseStatus] Found reserved purchase with txSignature, upgrading to submitted: ${purchaseId}`);
      await db
        .update(purchases)
        .set({
          status: 'submitted',
          submittedAt: new Date(),
        })
        .where(and(
          eq(purchases.id, purchaseId),
          eq(purchases.status, 'reserved') // Only update if still reserved (prevent race)
        ));
      // Continue to check transaction status below
    }

    // Check submitted transactions for confirmation
    if ((purchase.status === 'submitted' || purchase.status === 'reserved') && purchase.txSignature) {
      console.log(`[checkPurchaseStatus] Checking transaction status for ${purchase.txSignature.slice(0, 20)}...`);
      const txStatus = await checkTransactionStatus(purchase.txSignature);
      console.log(`[checkPurchaseStatus] Transaction status: ${txStatus.status}`);

      if (txStatus.status === 'confirmed' || txStatus.status === 'finalized') {
        // Payment confirmed - update status to awaiting_fulfillment and return immediately
        // This allows the client to show "Minting..." while we do the actual work
        // The client will call triggerFulfillment or the next poll will do the minting
        if (!purchase.nftMint) {
          // Update status to awaiting_fulfillment so client knows minting needs to happen
          // IMPORTANT: Only update if status is still submitted/reserved to prevent race condition
          // where this overwrites a 'minting' status set by concurrent fulfillPurchase
          const updateResult = await db
            .update(purchases)
            .set({
              status: 'awaiting_fulfillment',
              paymentConfirmedAt: new Date(),
            })
            .where(and(
              eq(purchases.id, purchaseId),
              or(
                eq(purchases.status, 'submitted'),
                eq(purchases.status, 'reserved')
              )
            ))
            .returning({ id: purchases.id });

          if (updateResult.length > 0) {
            console.log(`[checkPurchaseStatus] Payment confirmed for ${purchaseId}, status set to awaiting_fulfillment`);
          } else {
            // Status was already changed by another request - re-fetch and return current state
            console.log(`[checkPurchaseStatus] Status already changed for ${purchaseId}, re-fetching current state`);
            const [currentPurchase] = await db
              .select()
              .from(purchases)
              .where(eq(purchases.id, purchaseId))
              .limit(1);

            if (currentPurchase) {
              return {
                success: true,
                status: currentPurchase.status as PurchaseStatus,
                txSignature: currentPurchase.txSignature,
                nftMint: currentPurchase.nftMint,
              };
            }
          }

          // Return immediately so client can trigger fulfillment with proper UI
          return {
            success: true,
            status: 'awaiting_fulfillment' as PurchaseStatus,
            txSignature: purchase.txSignature,
            nftMint: null,
          };
        }
      }

      if (txStatus.status === 'failed') {
        await db
          .update(purchases)
          .set({ 
            status: 'failed',
            failedAt: new Date(),
          })
          .where(eq(purchases.id, purchaseId));

        await decrementPostSupply(purchase.postId);

        return {
          success: true,
          status: 'failed',
          txSignature: purchase.txSignature,
          nftMint: purchase.nftMint,
        };
      }

      // Transaction is still pending - return current status so client can continue polling
      if (txStatus.status === 'pending') {
        console.log(`[checkPurchaseStatus] Transaction ${purchase.txSignature.slice(0, 20)}... is still pending`);
        return {
          success: true,
          status: purchase.status as PurchaseStatus,
          txSignature: purchase.txSignature,
          nftMint: purchase.nftMint,
        };
      }
    }

    // Handle minting status - check if stale and allow retry
    if (purchase.status === 'minting') {
      // Check if minting has been stuck for more than 2 minutes (stale)
      const STALE_MINTING_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
      const lastActivity = purchase.mintingStartedAt || purchase.fulfillmentClaimedAt || purchase.submittedAt || purchase.reservedAt || purchase.createdAt;
      const mintingAge = Date.now() - new Date(lastActivity).getTime();
      
      if (mintingAge >= STALE_MINTING_THRESHOLD_MS) {
        // Stale minting - reset to appropriate status for retry
        console.log(`[checkPurchaseStatus] Purchase ${purchaseId} has stale minting status (age: ${Math.round(mintingAge / 1000)}s), resetting for retry`);
        
        // Check if master was created to determine correct retry status
        const [postCheck] = await db
          .select({ masterMint: posts.masterMint })
          .from(posts)
          .where(eq(posts.id, purchase.postId))
          .limit(1);
        
        const retryStatus = postCheck?.masterMint ? 'master_created' : 'awaiting_fulfillment';
        
        await db
          .update(purchases)
          .set({
            status: retryStatus,
            fulfillmentKey: null,
            fulfillmentClaimedAt: null,
          })
          .where(eq(purchases.id, purchaseId));
        
        console.log(`[checkPurchaseStatus] Reset stale minting purchase ${purchaseId} to ${retryStatus}, will retry on next poll`);
        
        // Re-fetch purchase with updated status
        const updatedPurchaseResult = await db
          .select()
          .from(purchases)
          .where(eq(purchases.id, purchaseId))
          .limit(1);
        
        if (updatedPurchaseResult.length) {
          const updatedPurchase = updatedPurchaseResult[0];
          
          // CRITICAL: Check if purchase was already confirmed by another concurrent request
          if (updatedPurchase.status === 'confirmed' && updatedPurchase.nftMint) {
            console.log(`[checkPurchaseStatus] Purchase ${purchaseId} was already confirmed by another request during stale reset`);
            return {
              success: true,
              status: 'confirmed' as PurchaseStatus,
              txSignature: updatedPurchase.txSignature,
              nftMint: updatedPurchase.nftMint,
            };
          }
          
          // Update purchase reference to continue with retry logic
          Object.assign(purchase, updatedPurchase);
        }
      } else {
        // Still actively minting (not stale)
        console.log(`[checkPurchaseStatus] Purchase ${purchaseId} is already being minted (age: ${Math.round(mintingAge / 1000)}s), returning minting status`);
        return {
          success: true,
          status: 'minting' as PurchaseStatus,
          txSignature: purchase.txSignature,
          nftMint: null,
        };
      }
    }

    // Handle awaiting_fulfillment and master_created - delegate to fulfillPurchase
    if (purchase.status === 'awaiting_fulfillment' || purchase.status === 'master_created') {
      console.log(`[checkPurchaseStatus] Delegating to fulfillPurchase for ${purchaseId} (status: ${purchase.status})`);

      const fulfillResult = await fulfillPurchase(purchaseId);

      return {
        success: fulfillResult.success,
        status: fulfillResult.status,
        txSignature: purchase.txSignature,
        nftMint: fulfillResult.nftMint || null,
        error: fulfillResult.error,
      };
    }

    return {
      success: true,
      status: purchase.status as PurchaseStatus,
      txSignature: purchase.txSignature,
      nftMint: purchase.nftMint,
    };
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

    // Verify payment is confirmed before attempting fulfillment
    const txStatus = await checkTransactionStatus(purchase.txSignature);
    if (txStatus.status !== 'confirmed' && txStatus.status !== 'finalized') {
      return { success: false, error: `Payment transaction not confirmed: ${txStatus.status}` };
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

    // Delegate to unified fulfillment function
    console.log(`[retryFulfillment] Delegating to fulfillPurchase for ${purchaseId}`);
    const result = await fulfillPurchase(purchaseId);

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
          const connection = await getConnection();
          const mintAccount = await connection.getAccountInfo(new PublicKey(nftMint));
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
