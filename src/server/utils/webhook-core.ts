/**
 * Webhook core processing logic
 *
 * Extracted from server functions to comply with server boundary rules.
 * This file contains the actual webhook processing implementation that
 * can be called from both TanStack server functions and Nitro API routes.
 */

import { db } from '@/server/db';
import { collections, posts, purchases } from '@/server/db/schema';
import { and, eq, gt, sql } from 'drizzle-orm';
import { z } from 'zod';
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
