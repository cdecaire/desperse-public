/**
 * Update Creator Settings
 * PATCH /api/v1/creator-settings
 *
 * Updates the authenticated user's creator copyright/licensing preferences.
 * Authentication: Required
 */

import {
  defineEventHandler,
  getHeader,
  readBody,
  setHeaders,
  setResponseStatus,
} from 'h3'
import { randomUUID } from 'node:crypto'
import { authenticateWithToken } from '@/server/auth'
import { upsertCreatorSettings } from '@/server/utils/creator-settings'

const VALID_PRESETS = [
  'All Rights Reserved',
  'CC0',
  'CC-BY-4.0',
  'CC-BY-SA-4.0',
  'CC-BY-NC-4.0',
  'CUSTOM',
]

export default defineEventHandler(async (event) => {
  const requestId = `req_${randomUUID().slice(0, 12)}`

  setHeaders(event, {
    'X-Request-Id': requestId,
    'X-Api-Version': '1',
    'Cache-Control': 'no-store',
  })

  const authHeader = getHeader(event, 'authorization')
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader

  if (!token) {
    setResponseStatus(event, 401)
    return {
      success: false,
      error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
      requestId,
    }
  }

  let body: Record<string, unknown>
  try {
    body = (await readBody(event)) as Record<string, unknown>
  } catch {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' },
      requestId,
    }
  }

  // Validate fields
  if (body.copyrightLicensePreset !== undefined && body.copyrightLicensePreset !== null) {
    if (!VALID_PRESETS.includes(body.copyrightLicensePreset as string)) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid license preset' },
        requestId,
      }
    }
  }

  if (body.copyrightLicenseCustom && typeof body.copyrightLicenseCustom === 'string' && body.copyrightLicenseCustom.length > 100) {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Custom license must be 100 characters or less' },
      requestId,
    }
  }

  if (body.copyrightHolder && typeof body.copyrightHolder === 'string' && body.copyrightHolder.length > 200) {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Copyright holder must be 200 characters or less' },
      requestId,
    }
  }

  if (body.copyrightRights && typeof body.copyrightRights === 'string' && body.copyrightRights.length > 1000) {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Rights statement must be 1000 characters or less' },
      requestId,
    }
  }

  try {
    const auth = await authenticateWithToken(token)
    if (!auth?.userId) {
      setResponseStatus(event, 401)
      return {
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        requestId,
      }
    }

    const updated = await upsertCreatorSettings(auth.userId, {
      copyrightLicensePreset: body.copyrightLicensePreset as string | null | undefined,
      copyrightLicenseCustom: body.copyrightLicenseCustom as string | null | undefined,
      copyrightHolder: body.copyrightHolder as string | null | undefined,
      copyrightRights: body.copyrightRights as string | null | undefined,
    })

    return {
      success: true,
      data: {
        copyrightLicensePreset: updated.copyrightLicensePreset,
        copyrightLicenseCustom: updated.copyrightLicenseCustom,
        copyrightHolder: updated.copyrightHolder,
        copyrightRights: updated.copyrightRights,
      },
      requestId,
    }
  } catch (error) {
    console.error(`[creator-settings][${requestId}] Error:`, error)
    setResponseStatus(event, 500)
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      requestId,
    }
  }
})
