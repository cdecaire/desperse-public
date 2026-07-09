import { createError, defineEventHandler, getCookie, getRequestIP, getRouterParam, getHeader, sendRedirect, setCookie } from 'h3'

import {
  createOrRestoreReferralAttributionSession,
  REFERRAL_ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
  REFERRAL_ATTRIBUTION_COOKIE_NAME,
} from '@/server/utils/referrals'

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')
  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Invite code is required' })
  }

  const result = await createOrRestoreReferralAttributionSession({
    inviteCode: code,
    source: 'link',
    existingCookieValue: getCookie(event, REFERRAL_ATTRIBUTION_COOKIE_NAME),
    signupIp: getRequestIP(event, { xForwardedFor: true }) || null,
    signupUserAgent: getHeader(event, 'user-agent') || null,
  })

  if (!result.success) {
    throw createError({ statusCode: 404, statusMessage: result.error })
  }

  setCookie(event, REFERRAL_ATTRIBUTION_COOKIE_NAME, result.cookieValue, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: REFERRAL_ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
  })

  return sendRedirect(event, '/', 302)
})
