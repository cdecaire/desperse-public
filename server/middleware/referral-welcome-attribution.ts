import {
  defineEventHandler,
  getCookie,
  getHeader,
  getQuery,
  getRequestIP,
  getRequestURL,
  setCookie,
} from 'h3'

import {
  createOrRestoreReferralAttributionSession,
  REFERRAL_ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
  REFERRAL_ATTRIBUTION_COOKIE_NAME,
} from '@/server/utils/referrals'

/**
 * A copied /i/<code>/welcome URL bypasses the /i/<code> redirect that normally
 * establishes referral attribution. Capture that visit in middleware so the
 * welcome page can still be rendered normally after the signed cookie is set.
 */
export default defineEventHandler(async (event) => {
  const match = getRequestURL(event).pathname.match(/^\/i\/([^/]+)\/welcome\/?$/)
  if (!match) return

  // The invite handler adds invalid=1 after it has already proved that the code
  // does not resolve. Never let that error URL create attribution.
  if (getQuery(event).invalid === '1') return

  let code: string
  try {
    code = decodeURIComponent(match[1])
  } catch {
    return
  }

  const result = await createOrRestoreReferralAttributionSession({
    inviteCode: code,
    source: 'link',
    existingCookieValue: getCookie(event, REFERRAL_ATTRIBUTION_COOKIE_NAME),
    signupIp: getRequestIP(event, { xForwardedFor: true }) || null,
    signupUserAgent: getHeader(event, 'user-agent') || null,
  })

  if (!result.success) return

  setCookie(event, REFERRAL_ATTRIBUTION_COOKIE_NAME, result.cookieValue, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: REFERRAL_ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
  })
})
