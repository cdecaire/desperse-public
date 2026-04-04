/**
 * Client-side token store for Echoes image URL obfuscation.
 *
 * Tokens are fetched from the minted-items API and stored here.
 * Image URL helpers read from this store to include tokens in proxy URLs.
 */

let tokenMap = new Map<number, string>()
let tokenVersion = 0

/**
 * Populate the token store. Called when minted-items API response arrives.
 * Returns the new version number (useful for cache invalidation).
 */
export function setImageTokens(tokens: Record<number, string>): number {
	tokenMap = new Map(
		Object.entries(tokens).map(([k, v]) => [Number(k), v]),
	)
	tokenVersion++
	return tokenVersion
}

/**
 * Get the HMAC token for a specific image index.
 * Returns empty string if tokens haven't been loaded yet.
 */
export function getImageToken(index: number): string {
	return tokenMap.get(index) ?? ""
}

/**
 * Current token version — increments each time setImageTokens is called.
 * Used to invalidate cached image paths when tokens refresh.
 */
export function getTokenVersion(): number {
	return tokenVersion
}

