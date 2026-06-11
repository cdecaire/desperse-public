import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/server/db'
import { postAssets } from '@/server/db/schema'

/**
 * Atomically record one net-new download for a downloadable asset.
 *
 * Uses an atomic `UPDATE ... +1` (no read-modify-write, per the codebase's
 * concurrency rules). Scoped to actual downloadable assets (role 'media',
 * non-previewable) so it can't be used to bump arbitrary rows. Returns whether
 * a row was updated.
 */
export async function recordAssetDownload(assetId: string): Promise<boolean> {
  const updated = await db
    .update(postAssets)
    .set({ downloadCount: sql`${postAssets.downloadCount} + 1` })
    .where(
      and(
        eq(postAssets.id, assetId),
        eq(postAssets.role, 'media'),
        eq(postAssets.isPreviewable, false),
      ),
    )
    .returning({ id: postAssets.id })

  return updated.length > 0
}
