/**
 * Asset Download API Route (Nitro)
 *
 * GET /api/assets/:assetId
 *
 * Streams protected assets after validating download tokens.
 * The blob URL is never exposed to the client.
 */

import { defineEventHandler, getRouterParam, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const assetId = getRouterParam(event, 'assetId')

    if (!assetId || typeof assetId !== 'string') {
      return new Response('Invalid asset ID', { status: 400 })
    }

    // Extract token from query params
    const query = getQuery(event)
    const token = query.token as string | undefined

    // Dynamically import to avoid bundling issues
    const { db } = await import('@/server/db')
    const { postAssets, downloadTokens } = await import('@/server/db/schema')
    const { eq, and } = await import('drizzle-orm')

    // Get asset info
    const [asset] = await db
      .select({
        id: postAssets.id,
        storageKey: postAssets.storageKey,
        mimeType: postAssets.mimeType,
        fileSize: postAssets.fileSize,
        isGated: postAssets.isGated,
        downloadName: postAssets.downloadName,
      })
      .from(postAssets)
      .where(eq(postAssets.id, assetId))
      .limit(1)

    if (!asset) {
      return new Response('Asset not found', { status: 404 })
    }

    // If not gated, redirect to blob URL
    if (!asset.isGated) {
      return Response.redirect(asset.storageKey, 302)
    }

    // Gated asset - require valid token
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate token
    const [tokenRecord] = await db
      .select()
      .from(downloadTokens)
      .where(
        and(
          eq(downloadTokens.token, token),
          eq(downloadTokens.assetId, assetId)
        )
      )
      .limit(1)

    if (!tokenRecord) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (tokenRecord.expiresAt < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Token expired' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Fetch the file from blob storage and stream it
    const blobResponse = await fetch(asset.storageKey)

    if (!blobResponse.ok) {
      console.error('[AssetDownload] Failed to fetch from blob:', blobResponse.status)
      return new Response('Failed to fetch asset', { status: 500 })
    }

    // Build response headers
    const headers = new Headers({
      'Content-Type': asset.mimeType || 'application/octet-stream',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    })

    if (asset.downloadName) {
      // Sanitize filename for Content-Disposition header (RFC 5987)
      // Remove characters that could cause header injection or parsing issues
      const sanitized = asset.downloadName
        .replace(/[\x00-\x1f\x7f"\\]/g, '_') // Control chars, quotes, backslash
        .replace(/\r|\n/g, '_') // Newlines (header injection)
        .slice(0, 255) // Limit length

      // UTF-8 encoded version for international characters
      const encoded = encodeURIComponent(asset.downloadName)
        .replace(/'/g, '%27')

      headers.set(
        'Content-Disposition',
        `attachment; filename="${sanitized}"; filename*=UTF-8''${encoded}`
      )
    }

    if (asset.fileSize) {
      headers.set('Content-Length', asset.fileSize.toString())
    }

    // Stream the response body
    return new Response(blobResponse.body, { headers })
  } catch (error) {
    console.error('[AssetDownload] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
