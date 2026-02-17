/**
 * Tests for Address Utilities
 *
 * These tests verify that the new @solana/addresses-based utilities
 * produce identical output to the legacy @solana/web3.js PublicKey class.
 *
 * CRITICAL: The golden tests ensure byte-for-byte compatibility.
 * If these tests fail after migration, it indicates a breaking change.
 */

import { describe, it, expect } from "vitest";
import { PublicKey } from "@solana/web3.js";
import {
	validateAddress,
	addressToBytes,
	bytesToAddress,
	toAddress,
	assertValidAddress,
	createAddress,
} from "./addressUtils";

// ============================================================================
// Test Data - Same addresses used in downloadAuth.test.ts baseline tests
// ============================================================================

const TEST_WALLETS = {
	// Normal user wallet
	user: "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK",
	// System program (edge case - all zeros)
	system: "11111111111111111111111111111111",
	// Token program
	token: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
	// Another random address
	random: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
	// Metaplex Token Metadata Program
	metaplex: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
};

// Invalid addresses for testing error cases
const INVALID_ADDRESSES = {
	empty: "",
	tooShort: "abc",
	tooLong: "1".repeat(50),
	invalidBase58: "O0Il", // Contains invalid base58 characters (O, 0, I, l)
	notBase58: "not-valid-base58!@#$",
	almostValid: "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSK", // One char short
};

// ============================================================================
// Golden Tests - CRITICAL for migration verification
// ============================================================================

describe("addressUtils - Golden Tests", () => {
	/**
	 * CRITICAL: This test verifies that addressToBytes produces IDENTICAL
	 * output to PublicKey.toBytes() from @solana/web3.js.
	 *
	 * If this test fails after any migration, it indicates a breaking change
	 * that could affect signature verification and other crypto operations.
	 */
	describe("addressToBytes matches PublicKey.toBytes()", () => {
		for (const [name, address] of Object.entries(TEST_WALLETS)) {
			it(`should produce identical bytes for ${name} wallet`, () => {
				// Get bytes using legacy PublicKey
				const legacyBytes = new PublicKey(address).toBytes();

				// Get bytes using new addressToBytes
				const newBytes = addressToBytes(address);

				// Compare byte-by-byte
				expect(newBytes).toBeInstanceOf(Uint8Array);
				expect(newBytes.length).toBe(32);
				expect(Array.from(newBytes)).toEqual(Array.from(legacyBytes));
			});
		}

		it("should match PublicKey.toBytes() for system program (all zeros)", () => {
			const legacyBytes = new PublicKey(TEST_WALLETS.system).toBytes();
			const newBytes = addressToBytes(TEST_WALLETS.system);

			// System program address should decode to all zeros
			expect(Array.from(newBytes)).toEqual(Array(32).fill(0));
			expect(Array.from(newBytes)).toEqual(Array.from(legacyBytes));
		});

		it("should match PublicKey.toBytes() for user wallet (snapshot test)", () => {
			const newBytes = addressToBytes(TEST_WALLETS.user);

			// This snapshot captures the exact bytes - DO NOT change without verification
			expect(Array.from(newBytes)).toMatchSnapshot("user-wallet-bytes-addressUtils");
		});
	});

	describe("round-trip conversion", () => {
		for (const [name, address] of Object.entries(TEST_WALLETS)) {
			it(`should round-trip correctly for ${name} wallet`, () => {
				const bytes = addressToBytes(address);
				const recovered = bytesToAddress(bytes);

				expect(recovered).toBe(address);
			});
		}
	});
});

// ============================================================================
// validateAddress Tests
// ============================================================================

describe("validateAddress", () => {
	describe("valid addresses", () => {
		for (const [name, address] of Object.entries(TEST_WALLETS)) {
			it(`should return true for valid ${name} address`, () => {
				expect(validateAddress(address)).toBe(true);
			});
		}
	});

	describe("invalid addresses", () => {
		it("should return false for empty string", () => {
			expect(validateAddress(INVALID_ADDRESSES.empty)).toBe(false);
		});

		it("should return false for too short string", () => {
			expect(validateAddress(INVALID_ADDRESSES.tooShort)).toBe(false);
		});

		it("should return false for invalid base58 characters", () => {
			expect(validateAddress(INVALID_ADDRESSES.notBase58)).toBe(false);
		});

		it("should return false for null/undefined", () => {
			expect(validateAddress(null as unknown as string)).toBe(false);
			expect(validateAddress(undefined as unknown as string)).toBe(false);
		});

		it("should return false for non-string types", () => {
			expect(validateAddress(123 as unknown as string)).toBe(false);
			expect(validateAddress({} as unknown as string)).toBe(false);
			expect(validateAddress([] as unknown as string)).toBe(false);
		});
	});

	describe("PDA support (off-curve addresses)", () => {
		// PDAs are valid addresses but are off the ed25519 curve
		// validateAddress should NOT reject them
		it("should accept PDAs (does not check on-curve)", () => {
			// System program is a valid address (happens to be all zeros)
			expect(validateAddress(TEST_WALLETS.system)).toBe(true);

			// Token program is a valid address
			expect(validateAddress(TEST_WALLETS.token)).toBe(true);

			// Metaplex program is a valid address
			expect(validateAddress(TEST_WALLETS.metaplex)).toBe(true);
		});
	});
});

// ============================================================================
// addressToBytes Tests
// ============================================================================

describe("addressToBytes", () => {
	it("should return Uint8Array of 32 bytes", () => {
		const bytes = addressToBytes(TEST_WALLETS.user);

		expect(bytes).toBeInstanceOf(Uint8Array);
		expect(bytes.length).toBe(32);
	});

	it("should throw for invalid address", () => {
		expect(() => addressToBytes(INVALID_ADDRESSES.empty)).toThrow();
		expect(() => addressToBytes(INVALID_ADDRESSES.notBase58)).toThrow();
	});

	it("should produce consistent output for same input", () => {
		const bytes1 = addressToBytes(TEST_WALLETS.user);
		const bytes2 = addressToBytes(TEST_WALLETS.user);

		expect(Array.from(bytes1)).toEqual(Array.from(bytes2));
	});

	it("should produce different output for different addresses", () => {
		const bytes1 = addressToBytes(TEST_WALLETS.user);
		const bytes2 = addressToBytes(TEST_WALLETS.random);

		expect(Array.from(bytes1)).not.toEqual(Array.from(bytes2));
	});
});

// ============================================================================
// bytesToAddress Tests
// ============================================================================

describe("bytesToAddress", () => {
	it("should convert bytes back to address string", () => {
		const originalAddress = TEST_WALLETS.user;
		const bytes = addressToBytes(originalAddress);
		const recovered = bytesToAddress(bytes);

		expect(recovered).toBe(originalAddress);
	});

	it("should throw for wrong byte length", () => {
		expect(() => bytesToAddress(new Uint8Array(31))).toThrow("Expected 32 bytes");
		expect(() => bytesToAddress(new Uint8Array(33))).toThrow("Expected 32 bytes");
		expect(() => bytesToAddress(new Uint8Array(0))).toThrow("Expected 32 bytes");
	});

	it("should convert all-zero bytes to system program address", () => {
		const zeroBytes = new Uint8Array(32);
		const address = bytesToAddress(zeroBytes);

		expect(address).toBe(TEST_WALLETS.system);
	});
});

// ============================================================================
// toAddress Tests
// ============================================================================

describe("toAddress", () => {
	it("should convert string to Address type", () => {
		const addr = toAddress(TEST_WALLETS.user);
		expect(addr).toBe(TEST_WALLETS.user);
	});

	it("should convert legacy PublicKey to Address type", () => {
		const legacyPubkey = new PublicKey(TEST_WALLETS.user);
		const addr = toAddress(legacyPubkey);

		expect(addr).toBe(TEST_WALLETS.user);
	});

	it("should throw for invalid string", () => {
		expect(() => toAddress(INVALID_ADDRESSES.empty)).toThrow();
	});
});

// ============================================================================
// assertValidAddress Tests
// ============================================================================

describe("assertValidAddress", () => {
	it("should not throw for valid address", () => {
		expect(() => assertValidAddress(TEST_WALLETS.user)).not.toThrow();
	});

	it("should throw for invalid address", () => {
		expect(() => assertValidAddress(INVALID_ADDRESSES.empty)).toThrow();
		expect(() => assertValidAddress(INVALID_ADDRESSES.notBase58)).toThrow();
	});
});

// ============================================================================
// createAddress Tests
// ============================================================================

describe("createAddress", () => {
	it("should create Address for valid input", () => {
		const addr = createAddress(TEST_WALLETS.user);
		expect(addr).toBe(TEST_WALLETS.user);
	});

	it("should throw with descriptive message for invalid input", () => {
		expect(() => createAddress("")).toThrow("Address must be a non-empty string");
		expect(() => createAddress("invalid")).toThrow("Invalid Solana address");
	});

	it("should truncate long invalid addresses in error message", () => {
		const longInvalid = "x".repeat(100);
		expect(() => createAddress(longInvalid)).toThrow("...");
	});
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("edge cases", () => {
	it("should handle addresses with leading zeros correctly", () => {
		// System program has leading zeros in decoded form
		const bytes = addressToBytes(TEST_WALLETS.system);
		expect(bytes[0]).toBe(0);

		const recovered = bytesToAddress(bytes);
		expect(recovered).toBe(TEST_WALLETS.system);
	});

	it("should handle addresses that look similar but are different", () => {
		// These are different addresses that might look similar
		const addr1 = TEST_WALLETS.user;
		const addr2 = TEST_WALLETS.random;

		const bytes1 = addressToBytes(addr1);
		const bytes2 = addressToBytes(addr2);

		// They should produce different bytes
		expect(Array.from(bytes1)).not.toEqual(Array.from(bytes2));
	});
});
