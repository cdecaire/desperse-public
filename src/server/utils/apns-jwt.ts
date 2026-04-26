/**
 * APNs token-based authentication.
 *
 * Apple's HTTP/2 push API authenticates each request with an ES256 JWT
 * signed by the team's APNs Auth Key (.p8). Tokens are valid for up to
 * 60 minutes — Apple bans servers that mint a new JWT on every push and
 * also bans servers that reuse the same JWT for >1h, so we cache and
 * refresh on a ~50min cadence.
 *
 * Required env vars:
 *   APNS_KEY_ID      — 10-char Key ID from developer.apple.com
 *   APNS_TEAM_ID     — 10-char Team ID
 *   APNS_PRIVATE_KEY — contents of the .p8 file (PEM, including the
 *                      BEGIN/END PRIVATE KEY lines). In Vercel env vars,
 *                      newlines should be encoded as literal `\n` and
 *                      we expand them on read.
 *
 * Uses Node.js native crypto — no `jsonwebtoken` dependency.
 */

import crypto from 'crypto'

let cachedJwt: { token: string; mintedAt: number } | null = null

/**
 * Returns a current APNs JWT, minting a fresh one when the cache is
 * empty or older than 50 minutes (Apple's hard limit is 1 hour).
 *
 * Throws if any required env var is missing — call sites should treat
 * that as a "push delivery disabled" condition and skip dispatch.
 */
export function getApnsJwt(): string {
  const fiftyMinutesMs = 50 * 60 * 1000
  if (cachedJwt && Date.now() - cachedJwt.mintedAt < fiftyMinutesMs) {
    return cachedJwt.token
  }

  const keyId = process.env.APNS_KEY_ID
  const teamId = process.env.APNS_TEAM_ID
  const privateKeyPem = process.env.APNS_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!keyId || !teamId || !privateKeyPem) {
    throw new Error('APNs env vars missing: APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY')
  }

  const now = Math.floor(Date.now() / 1000)

  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' }
  const claims = { iss: teamId, iat: now }

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedClaims = Buffer.from(JSON.stringify(claims)).toString('base64url')
  const signingInput = `${encodedHeader}.${encodedClaims}`

  // ES256 = ECDSA on P-256 with SHA-256. Node's crypto.sign emits
  // DER-encoded signatures by default; APNs expects raw r||s (JWS),
  // so we ask for the IEEE-P1363 format directly via dsaEncoding.
  const signature = crypto.sign(
    'sha256',
    Buffer.from(signingInput),
    {
      key: privateKeyPem,
      dsaEncoding: 'ieee-p1363',
    }
  ).toString('base64url')

  const jwt = `${signingInput}.${signature}`
  cachedJwt = { token: jwt, mintedAt: Date.now() }
  return jwt
}

/**
 * Force-clears the cached JWT — call after an APNs auth failure so the
 * next dispatch mints a fresh token.
 */
export function clearApnsJwtCache() {
  cachedJwt = null
}
