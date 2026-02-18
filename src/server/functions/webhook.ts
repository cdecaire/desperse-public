/**
 * Webhook server functions
 * 
 * Handles webhook-style operations for transaction confirmations.
 * These are server functions that can be called from API routes.
 */

import { createServerFn } from '@tanstack/react-start';
import { db } from '@/server/db';
import { collections, posts, purchases } from '@/server/db/schema';
import { and, eq, gt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { checkTransactionStatus } from '@/server/services/blockchain/mintCnft';
import { snapshotMintedMetadata } from '@/server/utils/mint-snapshot';

// Helius webhook event schema
const heliusEventSchema = z.object({
  signature: z.string(),
  type: z.string().optional(),
  transactionError: z.unknown().optional(),
  timestamp: z.number().optional(),
  nft: z.object({
    mint: z.string().optional(),
  }).optional(),
});

// Helius can send either:
// 1. An array of events: [{signature: ...}, {signature: ...}]
// 2. An object with events array: {events: [...]}
// 3. A single event object: {signature: ...}
const heliusWebhookObjectSchema = z.object({
  events: z.array(heliusEventSchema).optional(),
  signature: z.string().optional(),
  type: z.string().optional(),
});

export const heliusWebhookSchema = z.union([
  z.array(heliusEventSchema),  // Array of events (most common from Helius)
  heliusWebhookObjectSchema,   // Object with events property
]);

export type HeliusWebhookPayload = z.infer<typeof heliusWebhookSchema>;

// Check tx status request schema
const checkTxStatusSchema = z.object({
  signature: z.string().optional(),
  collectionId: z.string().uuid().optional(),
  purchaseId: z.string().uuid().optional(),
});

/**
 * Core webhook processing logic
 * This is the actual implementation, extracted so it can be called from both
 * the TanStack server function and the Nitro API route
 */
export async function processHeliusWebhookCore(payload: HeliusWebhookPayload): Promise<{
  success: boolean;
  processed?: number;
  total?: number;
  error?: string;
}> {
  try {
    // Normalize payload to array of events
    // Helius can send: array of events, object with events array, or single event object
    let events: Array<{ signature: string; type?: string; transactionError?: unknown; timestamp?: number; nft?: { mint?: string } }>;

    if (Array.isArray(payload)) {
      // Direct array of events
      events = payload;
    } else if (payload.events && payload.events.length > 0) {
      // Object with events array
      events = payload.events;
    } else if (payload.signature) {
      // Single event object
      events = [{
        signature: payload.signature,
        type: payload.type || 'UNKNOWN',
        timestamp: Date.now(),
      }];
    } else {
      events = [];
    }

    let processedCount = 0;

    for (const event of events) {
      const { signature: txSignature, transactionError, nft } = event;

      if (!txSignature) {
        console.warn('Event missing signature:', event);
        continue;
      }

      const status = transactionError ? 'failed' : 'confirmed';
      let nftMint = nft?.mint || null;

      // Try to find and update collection record
      const collectionResult = await db
        .select()
        .from(collections)
        .where(eq(collections.txSignature, txSignature))
        .limit(1);

      if (collectionResult.length > 0) {
        // If we don't have an asset ID yet, try to extract it from transaction logs
        if (!nftMint && status === 'confirmed') {
          try {
            const { extractAssetIdFromTransaction } = await import('@/server/services/blockchain/compressed/mintCollectible');
            const extractedAssetId = await extractAssetIdFromTransaction(txSignature);
            if (extractedAssetId) {
              nftMint = extractedAssetId;
              console.log(`Extracted asset ID from transaction logs: ${extractedAssetId}`);
            }
          } catch (error) {
            console.warn(`Could not extract asset ID from transaction ${txSignature}:`, error);
          }
        }

        await db
          .update(collections)
          .set({
            status,
            nftMint: nftMint || collectionResult[0].nftMint,
          })
          .where(eq(collections.id, collectionResult[0].id));

        // Snapshot minted metadata on first confirmed mint
        if (status === 'confirmed') {
          await snapshotMintedMetadata({
            postId: collectionResult[0].postId,
            txSignature,
          });
        }

        console.log(`Updated collection ${collectionResult[0].id} to ${status}${nftMint ? ` with asset ID ${nftMint}` : ''}`);
        processedCount++;
        continue;
      }

      // Try to find and update purchase record
      const purchaseResult = await db
        .select()
        .from(purchases)
        .where(eq(purchases.txSignature, txSignature))
        .limit(1);

      if (purchaseResult.length > 0) {
        const purchase = purchaseResult[0];
        const wasFailed = purchase.status === 'failed';

        // IMPORTANT: For purchases, the txSignature is the PAYMENT transaction, not the mint transaction.
        // When payment is confirmed, we should set status to 'awaiting_fulfillment' to trigger minting,
        // NOT 'confirmed' (which means the NFT has been minted and delivered).
        // Only set to 'confirmed' if we already have an nftMint (meaning minting is complete).
        let newStatus = status;
        if (status === 'confirmed' && !purchase.nftMint && !nftMint) {
          // Payment confirmed but no NFT minted yet - set to awaiting_fulfillment
          // This allows the client to trigger the fulfillment process
          newStatus = 'awaiting_fulfillment';
          console.log(`[webhook] Payment confirmed for purchase ${purchase.id}, setting to awaiting_fulfillment`);
        }

        await db
          .update(purchases)
          .set({
            status: newStatus,
            nftMint: nftMint || purchase.nftMint,
            ...(newStatus === 'awaiting_fulfillment' ? { paymentConfirmedAt: new Date() } : {}),
          })
          .where(eq(purchases.id, purchase.id));

        // Snapshot minted metadata on first confirmed mint (only when we have an actual NFT)
        if (status === 'confirmed' && (nftMint || purchase.nftMint)) {
          await snapshotMintedMetadata({
            postId: purchase.postId,
            txSignature,
          });
        }

        if (status === 'failed' && !wasFailed) {
          await db
            .update(posts)
            .set({ currentSupply: sql`${posts.currentSupply} - 1` })
            .where(and(eq(posts.id, purchase.postId), gt(posts.currentSupply, 0)));
        }

        console.log(`Updated purchase ${purchase.id} to ${newStatus}`);
        processedCount++;
        continue;
      }

      console.log(`No record found for tx signature: ${txSignature}`);
    }

    return {
      success: true,
      processed: processedCount,
      total: events.length,
    };

  } catch (error) {
    console.error('Error processing webhook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process Helius webhook event (TanStack server function)
 * Updates collection/purchase records based on transaction confirmations
 */
export const processHeliusWebhook = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  const rawData = input && typeof input === 'object' && 'data' in input
    ? (input as { data: unknown }).data
    : input;

  const payload = heliusWebhookSchema.parse(rawData);
  return processHeliusWebhookCore(payload);
});

/**
 * Check transaction status
 * Polling fallback for clients when webhook is delayed
 */
export const checkTxStatus = createServerFn({
  method: 'GET',
}).handler(async (input: unknown) => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input
      ? (input as { data: unknown }).data
      : input;
    
    const { signature, collectionId, purchaseId } = checkTxStatusSchema.parse(rawData);
    
    // Check collection by ID
    if (collectionId) {
      const result = await db
        .select()
        .from(collections)
        .where(eq(collections.id, collectionId))
        .limit(1);
      
      if (result.length === 0) {
        return {
          success: false,
          error: 'Collection not found',
        };
      }
      
      const collection = result[0];
      
      // If still pending and we have a tx signature, check on-chain
      if (collection.status === 'pending' && collection.txSignature) {
        const txStatus = await checkTransactionStatus(collection.txSignature);
        
        if (txStatus.status === 'confirmed' || txStatus.status === 'finalized') {
          // Update to confirmed
          await db
            .update(collections)
            .set({ status: 'confirmed' })
            .where(eq(collections.id, collectionId));
          
          // Snapshot minted metadata on first confirmed mint
          await snapshotMintedMetadata({
            postId: collection.postId,
            txSignature: collection.txSignature,
          });
          
          return {
            success: true,
            status: 'confirmed' as const,
            txSignature: collection.txSignature,
            nftMint: collection.nftMint,
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
            status: 'failed' as const,
            txSignature: collection.txSignature,
          };
        }
      }
      
      return {
        success: true,
        status: collection.status as 'pending' | 'confirmed' | 'failed',
        txSignature: collection.txSignature,
        nftMint: collection.nftMint,
      };
    }
    
    // Check purchase by ID
    if (purchaseId) {
      const result = await db
        .select()
        .from(purchases)
        .where(eq(purchases.id, purchaseId))
        .limit(1);
      
      if (result.length === 0) {
        return {
          success: false,
          error: 'Purchase not found',
        };
      }
      
      const purchase = result[0];
      const originalStatus = purchase.status;
      
      // If still submitted and we have a tx signature, check on-chain
      if (purchase.status === 'submitted' && purchase.txSignature) {
        const txStatus = await checkTransactionStatus(purchase.txSignature);

        if (txStatus.status === 'confirmed' || txStatus.status === 'finalized') {
          // For purchases, the txSignature is the PAYMENT transaction.
          // Payment confirmed = awaiting_fulfillment (NFT needs to be minted)
          // Only set 'confirmed' if we already have an nftMint

          if (purchase.nftMint) {
            // Already has NFT - this is a re-check, confirm it
            return {
              success: true,
              status: 'confirmed' as const,
              txSignature: purchase.txSignature,
              nftMint: purchase.nftMint,
            };
          }

          // Payment confirmed but no NFT yet - set to awaiting_fulfillment
          await db
            .update(purchases)
            .set({
              status: 'awaiting_fulfillment',
              paymentConfirmedAt: new Date(),
            })
            .where(eq(purchases.id, purchaseId));

          console.log(`[checkTxStatus] Payment confirmed for purchase ${purchaseId}, set to awaiting_fulfillment`);

          return {
            success: true,
            status: 'awaiting_fulfillment' as const,
            txSignature: purchase.txSignature,
            nftMint: null,
          };
        }
        
        if (txStatus.status === 'failed') {
          await db
            .update(purchases)
            .set({ 
              status: 'failed',
              failedAt: new Date(),
            })
            .where(eq(purchases.id, purchaseId));

          if (originalStatus !== 'failed' && originalStatus !== 'abandoned') {
            await db
              .update(posts)
              .set({ currentSupply: sql`${posts.currentSupply} - 1` })
              .where(and(eq(posts.id, purchase.postId), gt(posts.currentSupply, 0)));
          }
          
          return {
            success: true,
            status: 'failed' as const,
            txSignature: purchase.txSignature,
          };
        }
      }
      
      return {
        success: true,
        status: purchase.status as 'reserved' | 'submitted' | 'confirmed' | 'failed' | 'abandoned',
        txSignature: purchase.txSignature,
        nftMint: purchase.nftMint,
      };
    }
    
    // Check by transaction signature directly
    if (signature) {
      // First check collections
      const collectionResult = await db
        .select()
        .from(collections)
        .where(eq(collections.txSignature, signature))
        .limit(1);
      
      if (collectionResult.length > 0) {
        const collection = collectionResult[0];
        
        // If pending, check on-chain
        if (collection.status === 'pending') {
          const txStatus = await checkTransactionStatus(signature);
          
          if (txStatus.status === 'confirmed' || txStatus.status === 'finalized') {
            await db
              .update(collections)
              .set({ status: 'confirmed' })
              .where(eq(collections.id, collection.id));
            
            return {
              success: true,
              type: 'collection' as const,
              status: 'confirmed' as const,
              txSignature: signature,
              nftMint: collection.nftMint,
            };
          }
          
          if (txStatus.status === 'failed') {
            await db
              .update(collections)
              .set({ status: 'failed' })
              .where(eq(collections.id, collection.id));
            
            return {
              success: true,
              type: 'collection' as const,
              status: 'failed' as const,
              txSignature: signature,
            };
          }
        }
        
        return {
          success: true,
          type: 'collection' as const,
          status: collection.status as 'pending' | 'confirmed' | 'failed',
          txSignature: signature,
          nftMint: collection.nftMint,
        };
      }
      
      // Then check purchases
      const purchaseResult = await db
        .select()
        .from(purchases)
        .where(eq(purchases.txSignature, signature))
        .limit(1);
      
      if (purchaseResult.length > 0) {
        const purchase = purchaseResult[0];
        const originalStatus = purchase.status;
        
        if (purchase.status === 'submitted') {
          const txStatus = await checkTransactionStatus(signature);

          if (txStatus.status === 'confirmed' || txStatus.status === 'finalized') {
            // For purchases, the txSignature is the PAYMENT transaction.
            // Payment confirmed = awaiting_fulfillment (NFT needs to be minted)

            if (purchase.nftMint) {
              // Already has NFT - this is a re-check, confirm it
              return {
                success: true,
                type: 'purchase' as const,
                status: 'confirmed' as const,
                txSignature: signature,
                nftMint: purchase.nftMint,
              };
            }

            // Payment confirmed but no NFT yet - set to awaiting_fulfillment
            await db
              .update(purchases)
              .set({
                status: 'awaiting_fulfillment',
                paymentConfirmedAt: new Date(),
              })
              .where(eq(purchases.id, purchase.id));

            console.log(`[checkTxStatus] Payment confirmed for purchase ${purchase.id}, set to awaiting_fulfillment`);

            return {
              success: true,
              type: 'purchase' as const,
              status: 'awaiting_fulfillment' as const,
              txSignature: signature,
              nftMint: null,
            };
          }
          
          if (txStatus.status === 'failed') {
            await db
              .update(purchases)
              .set({ 
                status: 'failed',
                failedAt: new Date(),
              })
              .where(eq(purchases.id, purchase.id));

            if (originalStatus !== 'failed' && originalStatus !== 'abandoned') {
              await db
                .update(posts)
                .set({ currentSupply: sql`${posts.currentSupply} - 1` })
                .where(and(eq(posts.id, purchase.postId), gt(posts.currentSupply, 0)));
            }
            
            return {
              success: true,
              type: 'purchase' as const,
              status: 'failed' as const,
              txSignature: signature,
            };
          }
        }
        
        return {
          success: true,
          type: 'purchase' as const,
          status: purchase.status as 'reserved' | 'submitted' | 'confirmed' | 'failed' | 'abandoned',
          txSignature: signature,
          nftMint: purchase.nftMint,
        };
      }
      
      // Not found in our database, check on-chain directly
      const txStatus = await checkTransactionStatus(signature);
      
      return {
        success: true,
        type: 'unknown' as const,
        status: txStatus.status,
        txSignature: signature,
        message: 'Transaction not tracked in database',
      };
    }
    
    // No valid query parameter provided
    return {
      success: false,
      error: 'Missing parameter: Provide one of: signature, collectionId, purchaseId',
    };
    
  } catch (error) {
    console.error('Error checking tx status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

