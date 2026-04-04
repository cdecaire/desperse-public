/**
 * HMAC-based image token generation and validation for Echoes PFP images.
 *
 * Tokens prevent casual URL enumeration — users can't guess image URLs
 * without first fetching the token map from the minted-items API.
 *
 * Token = first TOKEN_LENGTH hex chars of HMAC-SHA256(index, secret).
 * Deterministic per index + secret, so URLs are stable and CDN-cacheable.
 */

import { createHmac } from "node:crypto"
import { getEnvVar } from "@/config/env"

const TOKEN_LENGTH = 16

/** Cached secret — env vars are expensive to read repeatedly (syscall per access). */
let _cachedSecret: string | undefined

function getSecret(): string {
	if (_cachedSecret !== undefined) return _cachedSecret

	const secret = getEnvVar("ECHOES_IMAGE_SECRET", "")
	if (!secret) {
		if (process.env.VERCEL || process.env.NODE_ENV === "production") {
			throw new Error("[image-tokens] ECHOES_IMAGE_SECRET is required in production")
		}
		_cachedSecret = "dev-echoes-image-secret-not-for-production"
	} else {
		_cachedSecret = secret
	}
	return _cachedSecret
}

/**
 * Generate a stable HMAC token for a given image index.
 */
export function generateImageToken(index: number): string {
	const hmac = createHmac("sha256", getSecret())
	hmac.update(`echoes-image:${index}`)
	return hmac.digest("hex").slice(0, TOKEN_LENGTH)
}

/**
 * Validate an image token against the expected value for the given index.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function validateImageToken(index: number, token: string): boolean {
	if (!token || token.length !== TOKEN_LENGTH) return false
	const expected = generateImageToken(index)
	let mismatch = 0
	for (let i = 0; i < TOKEN_LENGTH; i++) {
		mismatch |= expected.charCodeAt(i) ^ token.charCodeAt(i)
	}
	return mismatch === 0
}

/**
 * Generate tokens for a range of indices (e.g. all 500 items).
 * Cached at module level since output is deterministic for a given secret.
 */
let _tokenCache: { count: number; tokens: Record<number, string> } | null = null

export function generateAllImageTokens(count: number): Record<number, string> {
	if (_tokenCache && _tokenCache.count === count) return _tokenCache.tokens

	const secret = getSecret()
	const tokens: Record<number, string> = {}
	for (let i = 0; i < count; i++) {
		const hmac = createHmac("sha256", secret)
		hmac.update(`echoes-image:${i}`)
		tokens[i] = hmac.digest("hex").slice(0, TOKEN_LENGTH)
	}
	_tokenCache = { count, tokens }
	return tokens
}
