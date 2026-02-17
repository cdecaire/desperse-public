/**
 * Asset Download API Route Handler
 * 
 * GET /api/assets/{assetId}
 * 
 * Minimal, build-safe implementation:
 * - Uses dynamic imports for all heavy dependencies (DB, Solana SDKs, etc.)
 * - Only static import is 'h3' (lightweight HTTP framework, part of Nitro)
 * - Reuses existing download functions via dynamic imports
 * - Returns 302 redirect for non-gated assets
 * - Returns stream for gated assets after token validation
 * 
 * IMPORTANT: This uses Nitro route handler format (h3) which is the standard
 * for TanStack Start's server routes. All heavy dependencies are dynamically
 * imported to prevent bundling issues:
 * - No Solana SDKs imported at top level
 * - No DB clients imported at top level
 * - No crypto libraries imported at top level
 * 
 * Risk assessment: Using h3 helpers is minimal - they're lightweight HTTP
 * utilities. The dynamic imports ensure no chain SDKs are bundled.
 */

import { defineEventHandler, getRouterParam, getQuery, getHeaders } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const assetId = getRouterParam(event, 'assetId')
    
    if (!assetId || typeof assetId !== 'string') {
      return new Response('Invalid asset ID', { status: 400 })
    }

    // Extract token from query params or Authorization header
    const query = getQuery(event)
    const headers = getHeaders(event)
    const token = (query.token as string) || 
      headers.authorization?.replace('Bearer ', '')

    // Dynamically import download functions (keeps build graph small)
    const { getAssetPublicInfo, getAssetDownloadInfo } = await import('@/server/functions/downloadStream')
    const { getGatedAssetStream } = await import('@/server/storage/blob')

    // Get public info about the asset (no auth required)
    const publicInfo = await getAssetPublicInfo({ data: { assetId } } as never)
    
    if (!publicInfo.success || !publicInfo.exists) {
      return new Response('Asset not found', { status: 404 })
    }

    // If asset is not gated, redirect to direct storage URL
    if (!publicInfo.isGated) {
      const downloadInfo = await getAssetDownloadInfo({ 
        data: { assetId, token: undefined } 
      } as never)
      
      if (downloadInfo.success && downloadInfo.downloadUrl) {
        // Redirect to the actual storage URL (302 for cache-friendly redirect)
        return Response.redirect(downloadInfo.downloadUrl, 302)
      }
      
      return new Response('Failed to get asset URL', { status: 500 })
    }

    // Asset is gated - require token
    if (!token) {
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required',
          message: 'This asset requires NFT ownership verification. Please authenticate first.',
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate token and get download info
    const downloadInfo = await getAssetDownloadInfo({ 
      data: { assetId, token } 
    } as never)

    if (!downloadInfo.success) {
      return new Response(
        JSON.stringify({ 
          error: downloadInfo.error || 'Authentication failed',
          message: downloadInfo.error || 'Invalid or expired token. Please authenticate again.',
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (!downloadInfo.downloadUrl) {
      return new Response('Failed to get asset URL', { status: 500 })
    }

    // For gated assets, stream the file through our server
    // This ensures token is validated before serving
    const streamResult = await getGatedAssetStream(
      downloadInfo.downloadUrl,
      downloadInfo.contentType || publicInfo.mimeType || 'application/octet-stream',
      downloadInfo.downloadName || publicInfo.downloadName || undefined
    )

    if (!streamResult.success) {
      return new Response(
        JSON.stringify({ error: streamResult.error || 'Failed to stream asset' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Return the streamed file with appropriate headers
    const headers = new Headers({
      'Content-Type': downloadInfo.contentType || publicInfo.mimeType || 'application/octet-stream',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    })

    // Set Content-Disposition for download behavior
    if (downloadInfo.downloadName || publicInfo.downloadName) {
      headers.set('Content-Disposition', `attachment; filename="${downloadInfo.downloadName || publicInfo.downloadName}"`)
    } else {
      headers.set('Content-Disposition', 'attachment')
    }

    // Set Content-Length if available
    if (downloadInfo.contentLength) {
      headers.set('Content-Length', downloadInfo.contentLength.toString())
    }

    return new Response(streamResult.stream, { headers })
  } catch (error) {
    // Log error without exposing sensitive details
    console.error('[AssetDownload] Error:', error instanceof Error ? error.message : 'Unknown error')
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

