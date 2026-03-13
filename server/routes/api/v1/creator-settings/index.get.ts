/**
 * Get Creator Settings
 * GET /api/v1/creator-settings
 *
 * Returns the authenticated user's creator copyright/licensing preferences.
 * Authentication: Required
 */

import {
  defineEventHandler,
  getHeader,
  setHeaders,
  setResponseStatus,
} from 'h3'
import { randomUUID } from 'node:crypto'
import { authenticateWithToken } from '@/server/auth'
import { getCreatorSettingsByUserId } from '@/server/utils/creator-settings'

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

    const settings = await getCreatorSettingsByUserId(auth.userId)

    return {
      success: true,
      data: settings
        ? {
            copyrightLicensePreset: settings.copyrightLicensePreset,
            copyrightLicenseCustom: settings.copyrightLicenseCustom,
            copyrightHolder: settings.copyrightHolder,
            copyrightRights: settings.copyrightRights,
          }
        : {
            copyrightLicensePreset: null,
            copyrightLicenseCustom: null,
            copyrightHolder: null,
            copyrightRights: null,
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
