/**
 * Hashtag server-side utilities (internal)
 * Handles #hashtag parsing and processing
 *
 * NOTE: Client-facing server functions (searchTags, getTag, getPostsByTag)
 * are in hashtag-api.ts to avoid bundling db dependencies in the client.
 */

import { db } from '@/server/db'
import { tags, postTags } from '@/server/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { parseHashtags } from '@/lib/tokenParsing'

// Re-export parseHashtags for convenience
export { parseHashtags }

// =============================================================================
// PROCESSING (internal, called from posts.ts)
// =============================================================================

/**
 * Process hashtags for a post (create or update)
 * Always uses diff logic - for creates, existing set is empty
 *
 * @param text - The caption text to parse for hashtags
 * @param postId - The post ID
 */
export async function processHashtags(text: string, postId: string): Promise<void> {
  // Parse hashtags from text
  const parsedTags = parseHashtags(text)

  // Get existing post_tags for this post
  const existingPostTags = await db
    .select({
      tagId: postTags.tagId,
      tagSlug: tags.slug,
    })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(eq(postTags.postId, postId))

  const existingSlugs = new Set(existingPostTags.map((pt) => pt.tagSlug))
  const newSlugs = new Set(parsedTags)

  // Compute diff
  const toAdd = parsedTags.filter((slug) => !existingSlugs.has(slug))
  const toRemove = existingPostTags.filter((pt) => !newSlugs.has(pt.tagSlug))

  // Remove deleted tag relationships
  if (toRemove.length > 0) {
    const tagIdsToRemove = toRemove.map((pt) => pt.tagId)
    await db
      .delete(postTags)
      .where(and(eq(postTags.postId, postId), inArray(postTags.tagId, tagIdsToRemove)))
    // Note: triggers will decrement usage_count automatically
  }

  // Add new tags
  if (toAdd.length > 0) {
    // Upsert tags (insert if not exists)
    await db
      .insert(tags)
      .values(
        toAdd.map((slug) => ({
          slug,
          display: null, // We could store original casing if desired
        }))
      )
      .onConflictDoNothing({ target: tags.slug })

    // Fetch tag IDs for the new slugs
    const newTagRecords = await db
      .select({ id: tags.id, slug: tags.slug })
      .from(tags)
      .where(inArray(tags.slug, toAdd))

    const tagIdMap = new Map(newTagRecords.map((t) => [t.slug, t.id]))

    // Insert post_tags relationships
    const postTagValues = toAdd
      .map((slug) => {
        const tagId = tagIdMap.get(slug)
        if (!tagId) return null
        return { postId, tagId }
      })
      .filter((v): v is { postId: string; tagId: string } => v !== null)

    if (postTagValues.length > 0) {
      await db.insert(postTags).values(postTagValues).onConflictDoNothing()
      // Note: triggers will increment usage_count automatically
    }
  }
}
