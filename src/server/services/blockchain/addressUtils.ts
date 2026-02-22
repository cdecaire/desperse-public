/**
 * Solana Address Utilities
 *
 * Provides address validation and conversion utilities using @solana/addresses.
 * This module is used to migrate away from @solana/web3.js PublicKey usage.
 *
 * Key design decisions:
 * - Does NOT perform on-curve validation (PDAs are valid addresses but off-curve)
 * - Produces identical byte output to PublicKey.toBytes() for compatibility
 * - Uses @solana/addresses from @solana/kit (not @solana/web3.js)
 *
 * Migration path:
 * Before: new PublicKey(wallet).toBytes()
 * After:  addressToBytes(wallet)
 */

import {
	type Address,
	address,
	isAddress,
	assertIsAddress,
	getAddressEncoder,
	getAddressDecoder,
} from "@solana/addresses";

// Cache the encoder/decoder instances for performance
let encoderInstance: ReturnType<typeof getAddressEncoder> | null = null;
let decoderInstance: ReturnType<typeof getAddressDecoder> | null = null;

function getEncoder() {
	if (!encoderInstance) {
		encoderInstance = getAddressEncoder();
	}
	return encoderInstance;
}

function getDecoder() {
	if (!decoderInstance) {
		decoderInstance = getAddressDecoder();
	}
	return decoderInstance;
}

/**
 * Validate a Solana address string.
 *
 * Validation checks:
 * - Base58 decode succeeds
 * - Exactly 32 bytes when decoded
 *
 * IMPORTANT: Does NOT check if the address is on the ed25519 curve.
 * PDAs (Program Derived Addresses) are valid addresses but are intentionally
 * off-curve. This function accepts both regular addresses and PDAs.
 *
 * @param input - The string to validate as a Solana address
 * @returns true if the input is a valid Solana address, false otherwise
 *
 * @example
 * ```ts
 * if (validateAddress(userInput)) {
 *   // userInput is a valid Solana address
 * }
 * ```
 */
export function validateAddress(input: string): boolean {
	if (!input || typeof input !== "string") {
		return false;
	}

	// Use @solana/addresses isAddress which validates base58 and length
	return isAddress(input);
}

/**
 * Convert a Solana address string to bytes.
 *
 * This function produces identical output to `new PublicKey(addr).toBytes()`
 * from @solana/web3.js, making it a drop-in replacement for migration.
 *
 * @param addr - The Solana address string to convert
 * @returns Uint8Array of exactly 32 bytes
 * @throws Error if the address is invalid
 *
 * @example
 * ```ts
 * // Migration from @solana/web3.js:
 * // Before: const bytes = new PublicKey(wallet).toBytes();
 * // After:  const bytes = addressToBytes(wallet);
 *
 * const publicKeyBytes = addressToBytes(walletAddress);
 * const isValid = await ed25519.verifyAsync(signature, message, publicKeyBytes);
 * ```
 */
export function addressToBytes(addr: string): Uint8Array {
	// First validate the address - this throws if invalid
	assertIsAddress(addr);

	// Encode the address to bytes using @solana/addresses encoder
	const encoder = getEncoder();
	const bytes = encoder.encode(addr as Address);

	// Ensure we return exactly 32 bytes (encoder guarantees this, but be explicit)
	if (bytes.length !== 32) {
		throw new Error(`Address encoding produced ${bytes.length} bytes, expected 32`);
	}

	return bytes as Uint8Array;
}

/**
 * Convert bytes back to an address string.
 *
 * @param bytes - The 32-byte array to convert
 * @returns The base58-encoded address string
 * @throws Error if the bytes length is not exactly 32
 *
 * @example
 * ```ts
 * const address = bytesToAddress(publicKeyBytes);
 * ```
 */
export function bytesToAddress(bytes: Uint8Array): Address {
	if (bytes.length !== 32) {
		throw new Error(`Expected 32 bytes, got ${bytes.length}`);
	}

	const decoder = getDecoder();
	return decoder.decode(bytes);
}

/**
 * Convert a string or legacy PublicKey to @solana/addresses Address type.
 *
 * This is useful when interfacing with code that still uses the legacy PublicKey
 * type from @solana/web3.js.
 *
 * @param input - A string address or an object with a toBase58() method
 * @returns The validated Address type
 * @throws Error if the input is invalid
 *
 * @example
 * ```ts
 * // From string
 * const addr = toAddress("DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK");
 *
 * // From legacy PublicKey
 * const legacyPubkey = new PublicKey("...");
 * const addr = toAddress(legacyPubkey);
 * ```
 */
export function toAddress(input: string | { toBase58(): string }): Address {
	const addressString = typeof input === "string" ? input : input.toBase58();
	return address(addressString);
}

/**
 * Assert that a string is a valid Solana address and narrow the type.
 *
 * Use this when you need to validate an address and have TypeScript
 * recognize it as the Address type in subsequent code.
 *
 * @param input - The string to validate
 * @throws Error if the input is not a valid address
 *
 * @example
 * ```ts
 * function processPayment(walletAddress: string) {
 *   assertValidAddress(walletAddress);
 *   // TypeScript now knows walletAddress is Address type
 *   await sendTransaction(walletAddress);
 * }
 * ```
 */
export function assertValidAddress(input: string): asserts input is Address {
	assertIsAddress(input);
}

/**
 * Type-safe address creation with validation.
 *
 * A convenience wrapper around the @solana/addresses `address` function
 * that provides better error messages.
 *
 * @param input - The string to convert to an Address
 * @returns The validated Address
 * @throws Error with descriptive message if invalid
 */
export function createAddress(input: string): Address {
	if (!input || typeof input !== "string") {
		throw new Error("Address must be a non-empty string");
	}

	if (!isAddress(input)) {
		throw new Error(
			`Invalid Solana address: "${input.slice(0, 20)}${input.length > 20 ? "..." : ""}". ` +
				"Address must be a valid base58-encoded 32-byte value."
		);
	}

	return address(input);
}

// Re-export types for convenience
export type { Address };
