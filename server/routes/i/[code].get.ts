import { createError, defineEventHandler, getCookie, getQuery, getRequestIP, getRouterParam, getHeader, sendRedirect, setCookie } from 'h3'

import {
  createOrRestoreReferralAttributionSession,
  REFERRAL_ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
  REFERRAL_ATTRIBUTION_COOKIE_NAME,
} from '@/server/utils/referrals'

/** Only allow redirecting to an internal post page — anything else (absolute
 * URLs, protocol-relative //host, traversal) would make this an open redirect. */
function safePostPath(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return /^\/post\/[A-Za-z0-9_-]+$/.test(value) ? value : null
}

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')
  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Invite code is required' })
  }

  // Optional deep link: share links minted from onboarding point at the
  // published collectible so the recipient lands on the art (and scrapers
  // unfurl the post's OG image) while attribution is captured in passing.
  const next = safePostPath(getQuery(event).next)

  const result = await createOrRestoreReferralAttributionSession({
    inviteCode: code,
    source: 'link',
    existingCookieValue: getCookie(event, REFERRAL_ATTRIBUTION_COOKIE_NAME),
    signupIp: getRequestIP(event, { xForwardedFor: true }) || null,
    signupUserAgent: getHeader(event, 'user-agent') || null,
  })

  if (!result.success) {
    // A dead invite code shouldn't block someone who clicked through for the
    // art — send them to the post anyway, just without attribution.
    if (next) {
      return sendRedirect(event, next, 302)
    }
    return sendRedirect(event, `/i/${encodeURIComponent(code)}/welcome?invalid=1`, 302)
  }

  setCookie(event, REFERRAL_ATTRIBUTION_COOKIE_NAME, result.cookieValue, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: REFERRAL_ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
  })

  if (next) {
    return sendRedirect(event, next, 302)
  }

  const refSlug = result.referrer.slug ?? code
  return sendRedirect(event, `/i/${encodeURIComponent(code)}/welcome?ref=${encodeURIComponent(refSlug)}`, 302)
})
