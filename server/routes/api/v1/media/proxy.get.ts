/**
 * Media Proxy Endpoint
 * GET /api/v1/media/proxy?url=<blob-url>
 *
 * Proxies Vercel Blob storage files through the server to bypass
 * Vercel bot-challenge CORS issues on direct cross-origin fetch().
 * Authenticates with the Blob token to bypass bot protection.
 */

import { defineEventHandler, getQuery, createError, setResponseHeader } from 'h3'
import { env } from '@/config/env'

const MAX_PROXY_BYTES = 50 * 1024 * 1024 // 50MB

export default defineEventHandler(async (event) => {
  const { url } = getQuery(event) as { url?: string }

  if (!url || typeof url !== 'string') {
    throw createError({ statusCode: 400, message: 'Missing url parameter' })
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw createError({ statusCode: 400, message: 'Invalid URL' })
  }

  if (!parsed.hostname.endsWith('.blob.vercel-storage.com')) {
    throw createError({ statusCode: 403, message: 'URL not allowed' })
  }

  try {
    const headers: Record<string, string> = {}
    if (env.BLOB_READ_WRITE_TOKEN) {
      headers['Authorization'] = `Bearer ${env.BLOB_READ_WRITE_TOKEN}`
    }

    const response = await fetch(url, { headers })
    if (!response.ok) {
      throw createError({ statusCode: response.status, message: `Upstream error: ${response.statusText}` })
    }

    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_PROXY_BYTES) {
      throw createError({ statusCode: 413, message: 'File too large to proxy' })
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream'

    setResponseHeader(event, 'Content-Type', contentType)
    if (contentLength) {
      setResponseHeader(event, 'Content-Length', contentLength)
    }
    setResponseHeader(event, 'Cache-Control', 'public, max-age=3600, immutable')

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    console.error('[media/proxy] Error:', error)
    throw createError({ statusCode: 502, message: 'Failed to fetch media' })
  }
})
