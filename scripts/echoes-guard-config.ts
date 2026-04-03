/**
 * Echoes Candy Machine Guard Configuration
 *
 * 4-tier sequential mint: OG Free → OG Discount → Whitelist → Public
 * Each tier is a separate guard group with its own allowlist, price, limits, and dates.
 *
 * Usage:
 *   1. Add OG wallet addresses to OG_ALLOWLIST_WALLETS (or set OG_ALLOWLIST_FILE)
 *   2. Add WL wallet addresses to WL_ALLOWLIST_WALLETS (or set WL_ALLOWLIST_FILE)
 *   3. Set prices and mint limits per tier
 *   4. Set start/end dates for sequential phases
 *   5. Run echoes-devnet-setup.ts or echoes-upload-and-recreate.ts
 */

// ---------------------------------------------------------------------------
// Allowlists — wallet addresses per tier
// ---------------------------------------------------------------------------

/**
 * OG wallet addresses — used for both OG Free and OG Discount tiers.
 * Can also be loaded from a file — set OG_ALLOWLIST_FILE below.
 */
export const OG_ALLOWLIST_WALLETS: string[] = [
	// Add OG wallet addresses here, e.g.:
	// 'Addr1abc123...',
]

/**
 * Optional: path to a JSON file containing OG wallet addresses.
 * If set, overrides OG_ALLOWLIST_WALLETS above.
 */
export const OG_ALLOWLIST_FILE: string | null = null

/**
 * Whitelist wallet addresses — separate from OG list.
 * Can also be loaded from a file — set WL_ALLOWLIST_FILE below.
 */
export const WL_ALLOWLIST_WALLETS: string[] = [
	// Add WL wallet addresses here, e.g.:
	// 'Addr2def456...',
]

/**
 * Optional: path to a JSON file containing WL wallet addresses.
 * If set, overrides WL_ALLOWLIST_WALLETS above.
 */
export const WL_ALLOWLIST_FILE: string | null = null

// ---------------------------------------------------------------------------
// Mint limits — max mints per wallet per tier
// ---------------------------------------------------------------------------

/** OG Free: 1 free mint per OG wallet */
export const OG_FREE_MINT_LIMIT = 1

/** OG Discount: 3 discounted mints per OG wallet */
export const OG_DISCOUNT_MINT_LIMIT = 3

/** Whitelist: 2 mints per WL wallet */
export const WL_MINT_LIMIT = 2

/** Public: no limit (null = unlimited) */
export const PUBLIC_MINT_LIMIT: number | null = null

// ---------------------------------------------------------------------------
// Pricing — SOL per mint
// ---------------------------------------------------------------------------

/** OG Free tier — no solPayment guard (truly free) */
// No price config needed — og-free group has no solPayment guard

/** OG Discount tier price in SOL */
export const OG_DISCOUNT_PRICE_SOL = 0.005

/** Whitelist tier price in SOL */
export const WL_PRICE_SOL = 0.01

/** Public tier price in SOL */
export const PUBLIC_PRICE_SOL = 0.1

// ---------------------------------------------------------------------------
// Phase dates — start/end times for sequential tiers
// ---------------------------------------------------------------------------

/**
 * Set to an ISO date string to schedule a phase start, or null for "starts now".
 * Tiers are sequential — each tier's end should align with the next tier's start.
 * Examples: '2026-05-01T18:00:00Z', null
 */

export const OG_FREE_START_DATE: string | null = null
export const OG_FREE_END_DATE: string | null = null

export const OG_DISCOUNT_START_DATE: string | null = null
export const OG_DISCOUNT_END_DATE: string | null = null

export const WL_START_DATE: string | null = null
export const WL_END_DATE: string | null = null

export const PUBLIC_START_DATE: string | null = '2026-04-03T23:30:00Z'
// Public has no end date — runs until sold out

// ---------------------------------------------------------------------------
// Bot tax
// ---------------------------------------------------------------------------

/** Bot tax in SOL — charged to invalid mint attempts */
export const BOT_TAX_SOL = 0.01

// ---------------------------------------------------------------------------
// Helpers (used by setup scripts — don't edit below this line)
// ---------------------------------------------------------------------------

import fs from 'node:fs'

function loadListFromFile(filePath: string): string[] {
	const raw = fs.readFileSync(filePath, 'utf-8')
	const parsed = JSON.parse(raw)
	if (!Array.isArray(parsed) || !parsed.every((a: unknown) => typeof a === 'string')) {
		throw new Error(`Allowlist file must contain a JSON array of strings: ${filePath}`)
	}
	return parsed
}

export function loadOgAllowlistWallets(): string[] {
	if (OG_ALLOWLIST_FILE) return loadListFromFile(OG_ALLOWLIST_FILE)
	return OG_ALLOWLIST_WALLETS
}

export function loadWlAllowlistWallets(): string[] {
	if (WL_ALLOWLIST_FILE) return loadListFromFile(WL_ALLOWLIST_FILE)
	return WL_ALLOWLIST_WALLETS
}

/** Convert an ISO date string to a BigInt unix timestamp for CM guards */
export function dateToTimestamp(isoDate: string | null): bigint | null {
	if (!isoDate) return null
	const ts = Math.floor(new Date(isoDate).getTime() / 1000)
	if (Number.isNaN(ts)) throw new Error(`Invalid date: ${isoDate}`)
	return BigInt(ts)
}
