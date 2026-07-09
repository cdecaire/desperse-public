import { defineEventHandler, getCookie, getHeader, getRequestIP, readBody, setHeaders, setResponseStatus, setCookie } from 'h3'

import {
  createOrRestoreReferralAttributionSession,
  REFERRAL_ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
  REFERRAL_ATTRIBUTION_COOKIE_NAME,
} from '@/server/utils/referrals'

export default defineEventHandler(async (event) => {
  const requestId = `req_${crypto.randomUUID().slice(0, 12)}`

  setHeaders(event, {
    'X-Request-Id': requestId,
    'X-Api-Version': '1',
    'Cache-Control': 'no-store',
  })

  const body = (await readBody(event).catch(() => null)) as { code?: string } | null
  const code = body?.code?.trim()

  if (!code) {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invite code is required',
      },
      requestId,
    }
  }

  const result = await createOrRestoreReferralAttributionSession({
    inviteCode: code,
    source: 'manual',
    existingCookieValue: getCookie(event, REFERRAL_ATTRIBUTION_COOKIE_NAME),
    signupIp: getRequestIP(event, { xForwardedFor: true }) || null,
    signupUserAgent: getHeader(event, 'user-agent') || null,
  })

  if (!result.success) {
    setResponseStatus(event, 404)
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: result.error,
      },
      requestId,
    }
  }

  setCookie(event, REFERRAL_ATTRIBUTION_COOKIE_NAME, result.cookieValue, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: REFERRAL_ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
  })

  return {
    success: true,
    data: {
      referrer: result.referrer,
      restored: result.restored,
    },
    requestId,
  }
})
