/**
 * Webhook server functions
 *
 * Handles webhook-style operations for transaction confirmations.
 * These are server functions that can be called from API routes.
 *
 * Core processing logic lives in @/server/utils/webhook-core to comply
 * with server function boundary rules.
 */

import { createServerFn } from '@tanstack/react-start';
import { db } from '@/server/db';
import { collections, posts, purchases } from '@/server/db/schema';
import { and, eq, gt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { checkTransactionStatus } from '@/server/services/blockchain/mintCnft';
import { snapshotMintedMetadata } from '@/server/utils/mint-snapshot';
import { processHeliusWebhookCore, heliusWebhookSchema } from '@/server/utils/webhook-core';

// Re-export for backward compatibility
export { heliusWebhookSchema, type HeliusWebhookPayload } from '@/server/utils/webhook-core';

// Check tx status request schema
const checkTxStatusSchema = z.object({
  signature: z.string().optional(),
  collectionId: z.string().uuid().optional(),
  purchaseId: z.string().uuid().optional(),
});

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

