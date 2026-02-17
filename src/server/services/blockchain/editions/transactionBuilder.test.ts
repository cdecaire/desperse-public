/**
 * Tests for Edition Transaction Builder
 *
 * These tests verify the payment transaction building logic for edition purchases.
 *
 * IMPORTANT: These are contract tests. They document expected behavior
 * BEFORE migration to ensure no behavior change after migration.
 *
 * Focus areas:
 * - SOL payment transaction structure
 * - USDC payment transaction structure
 * - Fee calculations (platform fee, minting fee)
 * - Address validation
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Create shared mock functions using vi.hoisted
const mocks = vi.hoisted(() => {
	const mockGetLatestBlockhash = vi.fn();
	const mockGetAssociatedTokenAddress = vi.fn();
	return {
		mockGetLatestBlockhash,
		mockGetAssociatedTokenAddress,
	};
});

// Mock modules before importing
vi.mock("@/config/env", () => ({
	getHeliusRpcUrl: () => "https://mainnet.helius-rpc.com/?api-key=test-key",
	env: {
		HELIUS_API_KEY: "test-key",
		PLATFORM_FEE_BPS: 250, // 2.5%
	},
}));

vi.mock("@/lib/retryUtils", () => ({
	retryWithBackoff: vi.fn((fn) => fn()),
}));

// Mock @solana/web3.js with class-based mocks
vi.mock("@solana/web3.js", () => {
	class MockPublicKey {
		private addr: string;
		constructor(addr: string) {
			this.addr = addr;
		}
		toBase58() {
			return this.addr;
		}
		toString() {
			return this.addr;
		}
		equals(other: { toBase58: () => string }) {
			return this.addr === other.toBase58();
		}
	}

	class MockConnection {
		constructor(_url: string, _commitment?: string) {}
		getLatestBlockhash = mocks.mockGetLatestBlockhash;
	}

	class MockTransactionMessage {
		private config: any;
		constructor(config: any) {
			this.config = config;
		}
		compileToV0Message() {
			return {
				payerKey: this.config.payerKey,
				recentBlockhash: this.config.recentBlockhash,
				instructions: this.config.instructions,
			};
		}
	}

	class MockVersionedTransaction {
		private message: any;
		constructor(message: any) {
			this.message = message;
		}
		serialize() {
			// Return a mock serialized transaction (just some bytes for testing)
			return new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
		}
	}

	const MockSystemProgram = {
		transfer: vi.fn(({ fromPubkey, toPubkey, lamports }) => ({
			programId: new MockPublicKey("11111111111111111111111111111111"),
			keys: [
				{ pubkey: fromPubkey, isSigner: true, isWritable: true },
				{ pubkey: toPubkey, isSigner: false, isWritable: true },
			],
			data: Buffer.alloc(12), // SOL transfer instruction data
			lamports,
		})),
	};

	return {
		Connection: MockConnection,
		PublicKey: MockPublicKey,
		SystemProgram: MockSystemProgram,
		TransactionMessage: MockTransactionMessage,
		VersionedTransaction: MockVersionedTransaction,
		TransactionInstruction: class {},
	};
});

// Mock @solana/spl-token
vi.mock("@solana/spl-token", () => {
	const { PublicKey } = require("@solana/web3.js");
	return {
		TOKEN_PROGRAM_ID: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
		ASSOCIATED_TOKEN_PROGRAM_ID: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
		getAssociatedTokenAddress: mocks.mockGetAssociatedTokenAddress,
		createAssociatedTokenAccountIdempotentInstruction: vi.fn(() => ({
			programId: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
			keys: [],
			data: Buffer.alloc(0),
		})),
		createTransferInstruction: vi.fn(() => ({
			programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
			keys: [],
			data: Buffer.alloc(0),
		})),
	};
});

// Import after mocks are set up
import {
	buildEditionPaymentTransaction,
	MINTING_FEE_LAMPORTS,
	USDC_MINT,
	type EditionPaymentTxParams,
} from "./transactionBuilder";

// ============================================================================
// Test Data
// ============================================================================

const TEST_BUYER = "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK";
const TEST_CREATOR = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const TEST_PLATFORM = "5wGjfxu2HN2UBmwQWwt2zVyr35oGvVVGHznGbNoiWcU5";
const TEST_BLOCKHASH = "GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi";

// ============================================================================
// SOL Payment Tests
// ============================================================================

describe("transactionBuilder - SOL payments", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.mockGetLatestBlockhash.mockResolvedValue({
			blockhash: TEST_BLOCKHASH,
			lastValidBlockHeight: 123456789,
		});
	});

	it("should build a valid SOL payment transaction", async () => {
		const params: EditionPaymentTxParams = {
			buyer: TEST_BUYER,
			creator: TEST_CREATOR,
			platform: TEST_PLATFORM,
			price: 100_000_000, // 0.1 SOL
			currency: "SOL",
		};

		const result = await buildEditionPaymentTransaction(params);

		expect(result).toBeDefined();
		expect(result.transactionBase64).toBeDefined();
		expect(result.blockhash).toBe(TEST_BLOCKHASH);
		expect(result.lastValidBlockHeight).toBe(123456789);
	});

	it("should include correct fee calculations for SOL", async () => {
		const price = 100_000_000; // 0.1 SOL = 100,000,000 lamports
		const platformFeeBps = 250; // 2.5%
		const expectedPlatformFee = Math.floor((price * platformFeeBps) / 10_000);
		const expectedCreatorAmount = price - expectedPlatformFee;

		const params: EditionPaymentTxParams = {
			buyer: TEST_BUYER,
			creator: TEST_CREATOR,
			platform: TEST_PLATFORM,
			price,
			currency: "SOL",
		};

		await buildEditionPaymentTransaction(params);

		// Verify SystemProgram.transfer was called correctly
		const { SystemProgram } = await import("@solana/web3.js");

		// Should have 3 transfers: creator payment, platform fee, minting fee
		expect(SystemProgram.transfer).toHaveBeenCalledTimes(3);

		// Check creator payment
		expect(SystemProgram.transfer).toHaveBeenCalledWith(
			expect.objectContaining({
				lamports: expectedCreatorAmount,
			})
		);

		// Check platform fee
		expect(SystemProgram.transfer).toHaveBeenCalledWith(
			expect.objectContaining({
				lamports: expectedPlatformFee,
			})
		);

		// Check minting fee
		expect(SystemProgram.transfer).toHaveBeenCalledWith(
			expect.objectContaining({
				lamports: MINTING_FEE_LAMPORTS,
			})
		);
	});

	it("should handle zero price (free edition)", async () => {
		const params: EditionPaymentTxParams = {
			buyer: TEST_BUYER,
			creator: TEST_CREATOR,
			platform: TEST_PLATFORM,
			price: 0,
			currency: "SOL",
		};

		const result = await buildEditionPaymentTransaction(params);

		expect(result).toBeDefined();
		// Should still include minting fee even for free editions
		const { SystemProgram } = await import("@solana/web3.js");
		expect(SystemProgram.transfer).toHaveBeenCalledWith(
			expect.objectContaining({
				lamports: MINTING_FEE_LAMPORTS,
			})
		);
	});

	it("should return base64-encoded transaction", async () => {
		const params: EditionPaymentTxParams = {
			buyer: TEST_BUYER,
			creator: TEST_CREATOR,
			platform: TEST_PLATFORM,
			price: 100_000_000,
			currency: "SOL",
		};

		const result = await buildEditionPaymentTransaction(params);

		// Should be valid base64
		expect(() => Buffer.from(result.transactionBase64, "base64")).not.toThrow();
	});
});

// ============================================================================
// USDC Payment Tests
// ============================================================================

describe("transactionBuilder - USDC payments", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.mockGetLatestBlockhash.mockResolvedValue({
			blockhash: TEST_BLOCKHASH,
			lastValidBlockHeight: 123456789,
		});
		// Mock ATA addresses
		mocks.mockGetAssociatedTokenAddress.mockImplementation((mint, owner) => {
			return Promise.resolve({
				toBase58: () => `ata-${owner.toBase58()}-${mint.toBase58().slice(0, 8)}`,
				toString: () => `ata-${owner.toBase58()}-${mint.toBase58().slice(0, 8)}`,
			});
		});
	});

	it("should build a valid USDC payment transaction", async () => {
		const params: EditionPaymentTxParams = {
			buyer: TEST_BUYER,
			creator: TEST_CREATOR,
			platform: TEST_PLATFORM,
			price: 5_000_000, // 5 USDC (6 decimals)
			currency: "USDC",
		};

		const result = await buildEditionPaymentTransaction(params);

		expect(result).toBeDefined();
		expect(result.transactionBase64).toBeDefined();
		expect(result.blockhash).toBe(TEST_BLOCKHASH);
	});

	it("should create ATA instructions for USDC payments", async () => {
		const params: EditionPaymentTxParams = {
			buyer: TEST_BUYER,
			creator: TEST_CREATOR,
			platform: TEST_PLATFORM,
			price: 5_000_000,
			currency: "USDC",
		};

		await buildEditionPaymentTransaction(params);

		const { createAssociatedTokenAccountIdempotentInstruction } = await import("@solana/spl-token");

		// Should create ATAs for buyer, creator, and platform
		expect(createAssociatedTokenAccountIdempotentInstruction).toHaveBeenCalledTimes(3);
	});

	it("should include USDC transfer instructions", async () => {
		const params: EditionPaymentTxParams = {
			buyer: TEST_BUYER,
			creator: TEST_CREATOR,
			platform: TEST_PLATFORM,
			price: 5_000_000,
			currency: "USDC",
		};

		await buildEditionPaymentTransaction(params);

		const { createTransferInstruction } = await import("@solana/spl-token");

		// Should have 2 USDC transfers: to creator and to platform
		expect(createTransferInstruction).toHaveBeenCalledTimes(2);
	});

	it("should still include SOL minting fee for USDC payments", async () => {
		const params: EditionPaymentTxParams = {
			buyer: TEST_BUYER,
			creator: TEST_CREATOR,
			platform: TEST_PLATFORM,
			price: 5_000_000,
			currency: "USDC",
		};

		await buildEditionPaymentTransaction(params);

		const { SystemProgram } = await import("@solana/web3.js");

		// Should include minting fee in SOL even for USDC payments
		expect(SystemProgram.transfer).toHaveBeenCalledWith(
			expect.objectContaining({
				lamports: MINTING_FEE_LAMPORTS,
			})
		);
	});
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("transactionBuilder - constants", () => {
	it("should export correct MINTING_FEE_LAMPORTS", () => {
		expect(MINTING_FEE_LAMPORTS).toBe(10_000_000); // 0.01 SOL
	});

	it("should export correct USDC_MINT address", () => {
		expect(USDC_MINT.toBase58()).toBe("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
	});
});

// ============================================================================
// Address Validation Tests (Phase 4c migration)
// ============================================================================

describe("transactionBuilder - address validation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.mockGetLatestBlockhash.mockResolvedValue({
			blockhash: TEST_BLOCKHASH,
			lastValidBlockHeight: 123456789,
		});
	});

	it("should accept valid Solana addresses", async () => {
		const params: EditionPaymentTxParams = {
			buyer: TEST_BUYER,
			creator: TEST_CREATOR,
			platform: TEST_PLATFORM,
			price: 100_000_000,
			currency: "SOL",
		};

		// Should not throw with valid addresses
		const result = await buildEditionPaymentTransaction(params);
		expect(result).toBeDefined();
	});

	it("should handle addresses in transaction building", async () => {
		const params: EditionPaymentTxParams = {
			buyer: TEST_BUYER,
			creator: TEST_CREATOR,
			platform: TEST_PLATFORM,
			price: 100_000_000,
			currency: "SOL",
		};

		const result = await buildEditionPaymentTransaction(params);

		// Transaction should be buildable with valid addresses
		expect(result.transactionBase64).toBeDefined();
		expect(typeof result.transactionBase64).toBe("string");
	});
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe("transactionBuilder - error handling", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should handle RPC errors gracefully", async () => {
		mocks.mockGetLatestBlockhash.mockRejectedValueOnce(new Error("RPC timeout"));

		const params: EditionPaymentTxParams = {
			buyer: TEST_BUYER,
			creator: TEST_CREATOR,
			platform: TEST_PLATFORM,
			price: 100_000_000,
			currency: "SOL",
		};

		await expect(buildEditionPaymentTransaction(params)).rejects.toThrow("Failed to build payment transaction");
	});

	it("should include original error message in thrown error", async () => {
		mocks.mockGetLatestBlockhash.mockRejectedValueOnce(new Error("Network connection failed"));

		const params: EditionPaymentTxParams = {
			buyer: TEST_BUYER,
			creator: TEST_CREATOR,
			platform: TEST_PLATFORM,
			price: 100_000_000,
			currency: "SOL",
		};

		await expect(buildEditionPaymentTransaction(params)).rejects.toThrow("Network connection failed");
	});
});

// ============================================================================
// Integration Scenario Tests
// ============================================================================

describe("transactionBuilder - integration scenarios", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.mockGetLatestBlockhash.mockResolvedValue({
			blockhash: TEST_BLOCKHASH,
			lastValidBlockHeight: 123456789,
		});
		mocks.mockGetAssociatedTokenAddress.mockImplementation((mint, owner) => {
			return Promise.resolve({
				toBase58: () => `ata-${owner.toBase58()}-${mint.toBase58().slice(0, 8)}`,
				toString: () => `ata-${owner.toBase58()}-${mint.toBase58().slice(0, 8)}`,
			});
		});
	});

	it("should build complete SOL payment flow transaction", async () => {
		const params: EditionPaymentTxParams = {
			buyer: TEST_BUYER,
			creator: TEST_CREATOR,
			platform: TEST_PLATFORM,
			price: 1_000_000_000, // 1 SOL
			currency: "SOL",
		};

		const result = await buildEditionPaymentTransaction(params);

		expect(result).toMatchObject({
			transactionBase64: expect.any(String),
			blockhash: TEST_BLOCKHASH,
			lastValidBlockHeight: 123456789,
		});
	});

	it("should build complete USDC payment flow transaction", async () => {
		const params: EditionPaymentTxParams = {
			buyer: TEST_BUYER,
			creator: TEST_CREATOR,
			platform: TEST_PLATFORM,
			price: 10_000_000, // 10 USDC
			currency: "USDC",
		};

		const result = await buildEditionPaymentTransaction(params);

		expect(result).toMatchObject({
			transactionBase64: expect.any(String),
			blockhash: TEST_BLOCKHASH,
			lastValidBlockHeight: 123456789,
		});
	});

	it("should handle high-value transactions", async () => {
		const params: EditionPaymentTxParams = {
			buyer: TEST_BUYER,
			creator: TEST_CREATOR,
			platform: TEST_PLATFORM,
			price: 100_000_000_000, // 100 SOL
			currency: "SOL",
		};

		const result = await buildEditionPaymentTransaction(params);
		expect(result).toBeDefined();
	});
});
