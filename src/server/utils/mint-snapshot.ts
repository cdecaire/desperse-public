/**
 * Mint snapshot logic - captures NFT metadata at first confirmed mint
 * This is write-once: once mintedAt is set, these fields should never be updated
 */

import { db } from '@/server/db'
import { posts } from '@/server/db/schema'
import { eq, isNull, and } from 'drizzle-orm'

interface MintSnapshotParams {
  postId: string
  txSignature: string
  /** Pre-resolved metadata JSON — used when the metadata URL (e.g. Arweave) may not be fetchable yet */
  metadataJson?: Record<string, unknown>
}

/**
 * Snapshot minted metadata for a post at first confirmed mint.
 * This is write-once - if mintedAt is already set, this is a no-op.
 */
export async function snapshotMintedMetadata({ postId, txSignature, metadataJson: preResolvedJson }: MintSnapshotParams): Promise<boolean> {
  try {
    // Get the post with its current metadata
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1)

    if (!post) {
      console.warn(`[snapshotMintedMetadata] Post ${postId} not found`)
      return false
    }

    // If already minted, don't overwrite (write-once)
    if (post.mintedAt) {
      console.log(`[snapshotMintedMetadata] Post ${postId} already has minted snapshot, skipping`)
      return true
    }

    // Only snapshot for collectible/edition types
    if (post.type !== 'collectible' && post.type !== 'edition') {
      console.log(`[snapshotMintedMetadata] Post ${postId} is type ${post.type}, skipping snapshot`)
      return true
    }

    // Use pre-resolved metadata if provided (e.g. Arweave URL not yet on gateway),
    // otherwise fetch from the stored URL
    let metadataJson: Record<string, unknown> | null = preResolvedJson ?? null
    if (!metadataJson && post.metadataUrl) {
      try {
        const response = await fetch(post.metadataUrl, { signal: AbortSignal.timeout(10000) })
        if (response.ok) {
          metadataJson = await response.json()
        } else {
          console.warn(`[snapshotMintedMetadata] Failed to fetch metadata from ${post.metadataUrl}: ${response.status}`)
        }
      } catch (error) {
        console.warn(`[snapshotMintedMetadata] Error fetching metadata for post ${postId}:`, error)
      }
    }

    // Update post with minted snapshot (write-once, only if mintedAt is still null)
    const result = await db
      .update(posts)
      .set({
        mintedAt: new Date(),
        mintedTxSignature: txSignature,
        mintedMetadataUri: post.metadataUrl,
        mintedMetadataJson: metadataJson,
        mintedIsMutable: post.isMutable,
      })
      .where(
        and(
          eq(posts.id, postId),
          isNull(posts.mintedAt) // Only update if not already minted (race condition protection)
        )
      )
      .returning({ id: posts.id })

    if (result.length > 0) {
      console.log(`[snapshotMintedMetadata] Captured minted snapshot for post ${postId}`)
      return true
    } else {
      console.log(`[snapshotMintedMetadata] Post ${postId} was already minted by another process`)
      return true
    }
  } catch (error) {
    console.error(`[snapshotMintedMetadata] Error snapshotting post ${postId}:`, error)
    return false
  }
}

