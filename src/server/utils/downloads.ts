import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/server/db'
import { assetDownloads, postAssets } from '@/server/db/schema'

/**
 * Record a unique-per-user download for a downloadable asset.
 *
 * Counting only — this never gates or blocks the actual download; the caller has
 * already served the file. A user may re-download freely; only their first
 * download of a given asset is counted.
 *
 * Inserts an (asset, user) row with ON CONFLICT DO NOTHING. If (and only if) a
 * new row is created, the denormalized `post_assets.download_count` is atomically
 * bumped. Returns whether this download was newly counted.
 */
export async function recordAssetDownload(
  assetId: string,
  userId: string,
): Promise<{ recorded: boolean }> {
  // Guard: only real downloadable assets can be counted.
  const [asset] = await db
    .select({ id: postAssets.id })
    .from(postAssets)
    .where(
      and(
        eq(postAssets.id, assetId),
        eq(postAssets.role, 'media'),
        eq(postAssets.isPreviewable, false),
      ),
    )
    .limit(1)

  if (!asset) return { recorded: false }

  const inserted = await db
    .insert(assetDownloads)
    .values({ assetId, userId })
    .onConflictDoNothing({
      target: [assetDownloads.assetId, assetDownloads.userId],
    })
    .returning({ id: assetDownloads.id })

  if (inserted.length === 0) {
    // This user already counted toward this asset — no-op (re-download is fine).
    return { recorded: false }
  }

  await db
    .update(postAssets)
    .set({ downloadCount: sql`${postAssets.downloadCount} + 1` })
    .where(eq(postAssets.id, assetId))

  return { recorded: true }
}
