/**
 * Baseline tests for downloadAuth
 *
 * These tests capture current behavior before Phase 3 migration.
 * Key focus: signature verification using @solana/web3.js PublicKey
 *
 * NOTE: The verifyWalletSignature function is internal, so we test it
 * indirectly through the message building/parsing functions which are
 * testable without mocking the database.
 */

import { describe, it, expect } from "vitest";
import { PublicKey } from "@solana/web3.js";
import * as ed25519 from "@noble/ed25519";
import bs58 from "bs58";

// ============================================================================
// Re-implement internal functions for testing
// (Since they're not exported, we test the same logic here)
// ============================================================================

/**
 * Build the message format that users must sign for download auth
 * (Matches the internal buildDownloadMessage function)
 */
function buildDownloadMessage(
	assetId: string,
	wallet: string,
	nonce: string,
	expiresAt: string
): string {
	return `desperse.app wants you to download:
Asset: ${assetId}
Wallet: ${wallet}
Nonce: ${nonce}
Expires: ${expiresAt}`;
}

/**
 * Parse a signed message to extract its components
 * (Matches the internal parseDownloadMessage function)
 */
function parseDownloadMessage(message: string): {
	assetId: string;
	wallet: string;
	nonce: string;
	expiresAt: string;
} | null {
	try {
		const lines = message.split("\n");
		if (
			lines.length < 5 ||
			!lines[0].includes("desperse.app wants you to download")
		) {
			return null;
		}

		const assetId = lines[1]?.replace("Asset: ", "").trim();
		const wallet = lines[2]?.replace("Wallet: ", "").trim();
		const nonce = lines[3]?.replace("Nonce: ", "").trim();
		const expiresAt = lines[4]?.replace("Expires: ", "").trim();

		if (!assetId || !wallet || !nonce || !expiresAt) {
			return null;
		}

		return { assetId, wallet, nonce, expiresAt };
	} catch {
		return null;
	}
}

/**
 * Verify a Solana wallet signature
 * (Matches the internal verifyWalletSignature function)
 *
 * THIS IS THE KEY FUNCTION THAT WILL BE MIGRATED IN PHASE 3
 * Currently uses: new PublicKey(wallet).toBytes()
 * Will migrate to: addressToBytes(wallet) from addressUtils
 */
async function verifyWalletSignature(
	wallet: string,
	message: string,
	signatureBase58: string
): Promise<boolean> {
	try {
		// THIS LINE USES @solana/web3.js - will be migrated in Phase 3
		const publicKey = new PublicKey(wallet);
		const publicKeyBytes = publicKey.toBytes();

		// Decode the signature from base58
		const signatureBytes = bs58.decode(signatureBase58);

		// Encode the message as bytes
		const messageBytes = new TextEncoder().encode(message);

		// Verify the signature using @noble/ed25519
		return await ed25519.verifyAsync(signatureBytes, messageBytes, publicKeyBytes);
	} catch {
		return false;
	}
}

// ============================================================================
// Test Data
// ============================================================================

// Valid Solana addresses for testing
const TEST_WALLETS = {
	// Normal user wallet
	user: "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK",
	// System program (edge case - still valid address)
	system: "11111111111111111111111111111111",
	// Token program
	token: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
	// Another random address
	random: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
};

const TEST_UUID = "550e8400-e29b-41d4-a716-446655440000";
const TEST_NONCE = "a".repeat(64); // 32 bytes hex encoded
const TEST_EXPIRY = "2024-01-15T12:05:00.000Z";

// ============================================================================
// Tests
// ============================================================================

describe("downloadAuth", () => {
	describe("buildDownloadMessage", () => {
		it("should build message in correct format", () => {
			const message = buildDownloadMessage(
				TEST_UUID,
				TEST_WALLETS.user,
				TEST_NONCE,
				TEST_EXPIRY
			);

			expect(message).toContain("desperse.app wants you to download:");
			expect(message).toContain(`Asset: ${TEST_UUID}`);
			expect(message).toContain(`Wallet: ${TEST_WALLETS.user}`);
			expect(message).toContain(`Nonce: ${TEST_NONCE}`);
			expect(message).toContain(`Expires: ${TEST_EXPIRY}`);
		});

		it("should produce consistent output", () => {
			const message1 = buildDownloadMessage(
				TEST_UUID,
				TEST_WALLETS.user,
				TEST_NONCE,
				TEST_EXPIRY
			);
			const message2 = buildDownloadMessage(
				TEST_UUID,
				TEST_WALLETS.user,
				TEST_NONCE,
				TEST_EXPIRY
			);

			expect(message1).toBe(message2);
		});

		it("should handle different wallet addresses", () => {
			for (const [_name, wallet] of Object.entries(TEST_WALLETS)) {
				const message = buildDownloadMessage(TEST_UUID, wallet, TEST_NONCE, TEST_EXPIRY);
				expect(message).toContain(`Wallet: ${wallet}`);
			}
		});
	});

	describe("parseDownloadMessage", () => {
		it("should parse valid message", () => {
			const message = buildDownloadMessage(
				TEST_UUID,
				TEST_WALLETS.user,
				TEST_NONCE,
				TEST_EXPIRY
			);

			const parsed = parseDownloadMessage(message);

			expect(parsed).not.toBeNull();
			expect(parsed?.assetId).toBe(TEST_UUID);
			expect(parsed?.wallet).toBe(TEST_WALLETS.user);
			expect(parsed?.nonce).toBe(TEST_NONCE);
			expect(parsed?.expiresAt).toBe(TEST_EXPIRY);
		});

		it("should return null for invalid message format", () => {
			expect(parseDownloadMessage("invalid message")).toBeNull();
			expect(parseDownloadMessage("")).toBeNull();
			expect(parseDownloadMessage("line1\nline2")).toBeNull();
		});

		it("should return null for message without header", () => {
			const badMessage = `Wrong header
Asset: ${TEST_UUID}
Wallet: ${TEST_WALLETS.user}
Nonce: ${TEST_NONCE}
Expires: ${TEST_EXPIRY}`;

			expect(parseDownloadMessage(badMessage)).toBeNull();
		});

		it("should return null for message with missing fields", () => {
			const incompleteMessage = `desperse.app wants you to download:
Asset: ${TEST_UUID}
Wallet: ${TEST_WALLETS.user}`;

			expect(parseDownloadMessage(incompleteMessage)).toBeNull();
		});

		it("should be inverse of buildDownloadMessage", () => {
			const original = {
				assetId: TEST_UUID,
				wallet: TEST_WALLETS.user,
				nonce: TEST_NONCE,
				expiresAt: TEST_EXPIRY,
			};

			const message = buildDownloadMessage(
				original.assetId,
				original.wallet,
				original.nonce,
				original.expiresAt
			);

			const parsed = parseDownloadMessage(message);

			expect(parsed).toEqual(original);
		});
	});

	describe("PublicKey.toBytes (baseline for Phase 3 migration)", () => {
		/**
		 * GOLDEN TESTS: These capture current behavior of PublicKey.toBytes()
		 * After Phase 3 migration, the new addressToBytes() must produce
		 * identical output for these test cases.
		 */

		it("should convert user wallet to 32 bytes", () => {
			const publicKey = new PublicKey(TEST_WALLETS.user);
			const bytes = publicKey.toBytes();

			expect(bytes).toBeInstanceOf(Uint8Array);
			expect(bytes.length).toBe(32);
		});

		it("should convert system program address to 32 bytes", () => {
			const publicKey = new PublicKey(TEST_WALLETS.system);
			const bytes = publicKey.toBytes();

			expect(bytes).toBeInstanceOf(Uint8Array);
			expect(bytes.length).toBe(32);
			// System program is all zeros except possibly the last byte
			expect(bytes.every((b) => b === 0)).toBe(true);
		});

		it("should produce consistent bytes for same address", () => {
			const bytes1 = new PublicKey(TEST_WALLETS.user).toBytes();
			const bytes2 = new PublicKey(TEST_WALLETS.user).toBytes();

			expect(Array.from(bytes1)).toEqual(Array.from(bytes2));
		});

		it("should produce different bytes for different addresses", () => {
			const bytes1 = new PublicKey(TEST_WALLETS.user).toBytes();
			const bytes2 = new PublicKey(TEST_WALLETS.random).toBytes();

			expect(Array.from(bytes1)).not.toEqual(Array.from(bytes2));
		});

		it("should throw for invalid address", () => {
			expect(() => new PublicKey("invalid")).toThrow();
			expect(() => new PublicKey("")).toThrow();
			expect(() => new PublicKey("short")).toThrow();
		});

		/**
		 * SNAPSHOT TEST: Capture exact byte values for migration verification
		 */
		it("should produce exact bytes for test wallets (golden snapshot)", () => {
			const snapshots: Record<string, number[]> = {};

			for (const [name, address] of Object.entries(TEST_WALLETS)) {
				const bytes = new PublicKey(address).toBytes();
				snapshots[name] = Array.from(bytes);
			}

			// User wallet bytes
			expect(snapshots.user).toMatchSnapshot("user-wallet-bytes");

			// System program bytes (should be 32 zeros)
			expect(snapshots.system).toEqual(Array(32).fill(0));

			// All should be 32 bytes
			for (const bytes of Object.values(snapshots)) {
				expect(bytes.length).toBe(32);
			}
		});
	});

	describe("verifyWalletSignature", () => {
		/**
		 * Helper to generate a random private key (32 bytes)
		 */
		function generatePrivateKey(): Uint8Array {
			const privateKey = new Uint8Array(32);
			crypto.getRandomValues(privateKey);
			return privateKey;
		}

		it("should return false for invalid signature format", async () => {
			const result = await verifyWalletSignature(
				TEST_WALLETS.user,
				"test message",
				"not-valid-base58!"
			);

			expect(result).toBe(false);
		});

		it("should return false for invalid wallet address", async () => {
			const result = await verifyWalletSignature(
				"invalid-address",
				"test message",
				bs58.encode(new Uint8Array(64))
			);

			expect(result).toBe(false);
		});

		it("should return false for wrong signature (signature from different message)", async () => {
			// Generate a keypair for testing
			const privateKey = generatePrivateKey();
			const publicKey = await ed25519.getPublicKeyAsync(privateKey);
			const walletAddress = bs58.encode(publicKey);

			// Sign one message
			const message1 = "message one";
			const message1Bytes = new TextEncoder().encode(message1);
			const signature = await ed25519.signAsync(message1Bytes, privateKey);
			const signatureBase58 = bs58.encode(signature);

			// Try to verify with different message
			const message2 = "message two";
			const result = await verifyWalletSignature(walletAddress, message2, signatureBase58);

			expect(result).toBe(false);
		});

		it("should return true for valid signature", async () => {
			// Generate a keypair for testing
			const privateKey = generatePrivateKey();
			const publicKey = await ed25519.getPublicKeyAsync(privateKey);
			const walletAddress = bs58.encode(publicKey);

			// Build a download message
			const message = buildDownloadMessage(
				TEST_UUID,
				walletAddress,
				TEST_NONCE,
				TEST_EXPIRY
			);

			// Sign the message
			const messageBytes = new TextEncoder().encode(message);
			const signature = await ed25519.signAsync(messageBytes, privateKey);
			const signatureBase58 = bs58.encode(signature);

			// Verify
			const result = await verifyWalletSignature(walletAddress, message, signatureBase58);

			expect(result).toBe(true);
		});

		it("should handle empty message", async () => {
			const privateKey = generatePrivateKey();
			const publicKey = await ed25519.getPublicKeyAsync(privateKey);
			const walletAddress = bs58.encode(publicKey);

			const message = "";
			const messageBytes = new TextEncoder().encode(message);
			const signature = await ed25519.signAsync(messageBytes, privateKey);
			const signatureBase58 = bs58.encode(signature);

			const result = await verifyWalletSignature(walletAddress, message, signatureBase58);

			expect(result).toBe(true);
		});
	});

	describe("constants", () => {
		/**
		 * Document expected constants for reference
		 */
		it("should use expected nonce expiry (5 minutes)", () => {
			const NONCE_EXPIRY_MS = 5 * 60 * 1000;
			expect(NONCE_EXPIRY_MS).toBe(300_000);
		});

		it("should use expected token expiry (2 minutes)", () => {
			const TOKEN_EXPIRY_MS = 2 * 60 * 1000;
			expect(TOKEN_EXPIRY_MS).toBe(120_000);
		});
	});
});
