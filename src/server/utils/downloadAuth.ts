/**
 * Download Auth Direct Utility Functions
 *
 * Standalone "Direct" functions for gated download authentication.
 * These are called by REST API endpoints (not createServerFn).
 *
 * Flow:
 * 1. getDownloadNonceDirect - Generate nonce + message for wallet to sign
 * 2. verifyAndIssueTokenDirect - Verify signature + ownership → issue short-lived token
 *
 * The token is then used with GET /api/assets/{assetId}?token={token} to download.
 *
 * IMPORTANT: Do NOT import from files containing createServerFn.
 * Safe imports: @/server/db, @/server/services/blockchain/*
 */

import { db } from '@/server/db'
import { postAssets, downloadNonces, downloadTokens } from '@/server/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { verifyNftOwnership, isPostCreator } from '@/server/services/blockchain/ownershipCheck'
import { addressToBytes } from '@/server/services/blockchain/addressUtils'
import * as ed25519 from '@noble/ed25519'
import bs58 from 'bs58'
import { randomBytes } from 'node:crypto'

// ============================================================================
// Constants
// ============================================================================

/** Nonce expiry time (5 minutes) */
const NONCE_EXPIRY_MS = 5 * 60 * 1000

/** Download token expiry time (2 minutes) */
const TOKEN_EXPIRY_MS = 2 * 60 * 1000

// ============================================================================
// Types
// ============================================================================

export interface NonceResult {
	success: boolean
	nonce?: string
	expiresAt?: string
	message?: string
	error?: string
}

export interface VerifyResult {
	success: boolean
	token?: string
	expiresAt?: number
	error?: string
}

// ============================================================================
// Nonce Generation
// ============================================================================

/**
 * Generate a nonce for download authentication (Direct function for REST API)
 */
export async function getDownloadNonceDirect(
	assetId: string,
	wallet: string
): Promise<NonceResult> {
	try {
		// Validate inputs
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
		if (!uuidRegex.test(assetId)) {
			return { success: false, error: 'Invalid asset ID format' }
		}
		if (!wallet || wallet.length < 32 || wallet.length > 44) {
			return { success: false, error: 'Invalid wallet address' }
		}

		// Verify asset exists and is gated
		const [asset] = await db
			.select({ id: postAssets.id, postId: postAssets.postId, isGated: postAssets.isGated })
			.from(postAssets)
			.where(eq(postAssets.id, assetId))
			.limit(1)

		if (!asset) {
			return { success: false, error: 'Asset not found' }
		}

		if (!asset.isGated) {
			return { success: false, error: 'Asset is not gated' }
		}

		// Generate random nonce
		const nonce = randomBytes(32).toString('hex')
		const expiresAt = new Date(Date.now() + NONCE_EXPIRY_MS)

		// Store nonce in database
		await db.insert(downloadNonces).values({
			nonce,
			assetId,
			wallet,
			expiresAt,
		})

		// Build the message the user should sign
		const message = buildDownloadMessage(assetId, wallet, nonce, expiresAt.toISOString())

		return {
			success: true,
			nonce,
			expiresAt: expiresAt.toISOString(),
			message,
		}
	} catch (error) {
		console.error('[getDownloadNonceDirect] Error:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to generate nonce',
		}
	}
}

// ============================================================================
// Signature Verification & Token Issuance
// ============================================================================

/**
 * Verify a wallet signature and issue a download token (Direct function for REST API)
 */
export async function verifyAndIssueTokenDirect(
	assetId: string,
	wallet: string,
	signature: string,
	message: string
): Promise<VerifyResult> {
	try {
		// 1. Parse and validate message format
		const parsed = parseDownloadMessage(message)
		if (!parsed) {
			return { success: false, error: 'Invalid message format' }
		}

		// Validate message fields match request
		if (parsed.assetId !== assetId || parsed.wallet !== wallet) {
			return { success: false, error: 'Message fields do not match request' }
		}

		// Check expiry from message
		const messageExpiry = new Date(parsed.expiresAt)
		if (messageExpiry < new Date()) {
			return { success: false, error: 'Message has expired' }
		}

		// 2. Verify signature
		const isValidSignature = await verifyWalletSignature(wallet, message, signature)
		if (!isValidSignature) {
			return { success: false, error: 'Invalid signature' }
		}

		// 3. Verify nonce exists, not expired, not used
		const [nonceRecord] = await db
			.select()
			.from(downloadNonces)
			.where(
				and(
					eq(downloadNonces.nonce, parsed.nonce),
					eq(downloadNonces.assetId, assetId),
					eq(downloadNonces.wallet, wallet),
					isNull(downloadNonces.usedAt),
				)
			)
			.limit(1)

		if (!nonceRecord) {
			return { success: false, error: 'Nonce not found or already used' }
		}

		if (nonceRecord.expiresAt < new Date()) {
			return { success: false, error: 'Nonce has expired' }
		}

		// 4. Mark nonce as used
		await db
			.update(downloadNonces)
			.set({ usedAt: new Date() })
			.where(eq(downloadNonces.id, nonceRecord.id))

		// 5. Get asset and post info
		const [asset] = await db
			.select({
				id: postAssets.id,
				postId: postAssets.postId,
				isGated: postAssets.isGated,
			})
			.from(postAssets)
			.where(eq(postAssets.id, assetId))
			.limit(1)

		if (!asset) {
			return { success: false, error: 'Asset not found' }
		}

		if (!asset.isGated) {
			return { success: false, error: 'Asset is not gated - no auth required' }
		}

		// 6. Verify ON-CHAIN ownership
		const ownershipResult = await verifyNftOwnership(wallet, asset.postId)
		const isCreator = await isPostCreator(wallet, asset.postId)

		if (!ownershipResult.isOwner && !isCreator) {
			return {
				success: false,
				error: 'You do not own this NFT. Ownership is verified on-chain.',
			}
		}

		// 7. Issue short-lived download token
		const token = randomBytes(32).toString('hex')
		const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS)

		await db.insert(downloadTokens).values({
			token,
			assetId,
			wallet,
			expiresAt,
		})

		return {
			success: true,
			token,
			expiresAt: expiresAt.getTime(),
		}
	} catch (error) {
		console.error('[verifyAndIssueTokenDirect] Error:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Authentication failed',
		}
	}
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build the message format that users must sign for download auth
 */
function buildDownloadMessage(
	assetId: string,
	wallet: string,
	nonce: string,
	expiresAt: string,
): string {
	return `desperse.app wants you to download:
Asset: ${assetId}
Wallet: ${wallet}
Nonce: ${nonce}
Expires: ${expiresAt}`
}

/**
 * Parse a signed message to extract its components
 */
function parseDownloadMessage(message: string): {
	assetId: string
	wallet: string
	nonce: string
	expiresAt: string
} | null {
	try {
		const lines = message.split('\n')
		if (lines.length < 5 || !lines[0].includes('desperse.app wants you to download')) {
			return null
		}

		const assetId = lines[1]?.replace('Asset: ', '').trim()
		const wallet = lines[2]?.replace('Wallet: ', '').trim()
		const nonce = lines[3]?.replace('Nonce: ', '').trim()
		const expiresAt = lines[4]?.replace('Expires: ', '').trim()

		if (!assetId || !wallet || !nonce || !expiresAt) {
			return null
		}

		return { assetId, wallet, nonce, expiresAt }
	} catch {
		return null
	}
}

/**
 * Verify a Solana wallet signature using ed25519.
 *
 * Accepts signatures in either Base58 (web/React SDK) or Base64 (Android SDK) encoding.
 * Detection: Base64 contains +, /, or = which are not valid Base58 characters.
 */
async function verifyWalletSignature(
	wallet: string,
	message: string,
	signatureEncoded: string,
): Promise<boolean> {
	try {
		const publicKeyBytes = addressToBytes(wallet)

		// Detect encoding: Base64 uses +, /, = which are not in the Base58 alphabet
		const isBase64 = /[+/=]/.test(signatureEncoded)
		const signatureBytes = isBase64
			? new Uint8Array(Buffer.from(signatureEncoded, 'base64'))
			: bs58.decode(signatureEncoded)

		const messageBytes = new TextEncoder().encode(message)
		return await ed25519.verifyAsync(signatureBytes, messageBytes, publicKeyBytes)
	} catch (error) {
		console.error('[verifyWalletSignature] Error:', error)
		return false
	}
}
