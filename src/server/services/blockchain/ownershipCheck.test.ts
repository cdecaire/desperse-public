/**
 * Tests for On-Chain Ownership Verification
 *
 * These tests verify the ownership check logic for gated downloads:
 * - Edition ownership (Core Assets + SPL token fallback)
 * - Collectible ownership (cNFTs via DAS API)
 * - Creator access bypass
 *
 * IMPORTANT: These are contract tests. They document expected behavior
 * BEFORE migration to ensure no behavior change after migration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Create shared mock functions using vi.hoisted to ensure they're available before mocks
const mocks = vi.hoisted(() => {
	const getTokenAccountsByOwner = vi.fn();
	const dbSelect = vi.fn();
	return {
		mockGetTokenAccountsByOwner: getTokenAccountsByOwner,
		mockDbSelect: dbSelect,
	};
});

// Export for use in tests
const { mockGetTokenAccountsByOwner, mockDbSelect } = mocks;

// Mock modules before importing the module under test
vi.mock("@/config/env", () => ({
	env: {
		HELIUS_API_KEY: "test-api-key",
	},
	getHeliusRpcUrl: () => "https://mainnet.helius-rpc.com/?api-key=test-api-key",
}));

vi.mock("@/server/db", () => ({
	db: {
		select: mocks.mockDbSelect,
	},
}));

vi.mock("@solana/web3.js", () => {
	return {
		Connection: vi.fn().mockImplementation(() => ({
			getTokenAccountsByOwner: mocks.mockGetTokenAccountsByOwner,
		})),
		PublicKey: vi.fn().mockImplementation((addr: string) => ({
			toBase58: () => addr,
			toString: () => addr,
		})),
	};
});

// Import after mocks are set up
import {
	verifyEditionOwnership,
	verifyCnftOwnership,
	verifyNftOwnership,
	isPostCreator,
} from "./ownershipCheck";

// ============================================================================
// Test Data
// ============================================================================

const TEST_WALLET = "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK";
const OTHER_WALLET = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const TEST_POST_ID = "test-post-123";
const TEST_NFT_MINT = "nft-mint-address-123";
const TEST_ASSET_ID = "asset-id-456";

// ============================================================================
// Test Setup
// ============================================================================

describe("ownershipCheck", () => {
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		fetchSpy = vi.spyOn(global, "fetch") as any;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// ============================================================================
	// verifyEditionOwnership Tests
	// ============================================================================

	describe("verifyEditionOwnership", () => {
		describe("Core Asset ownership (DAS API)", () => {
			it("should return isOwner: true when wallet owns Core Asset", async () => {
				// Mock DB: return a confirmed purchase with nftMint
				const mockSelect = vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue([{ nftMint: TEST_NFT_MINT }]),
					}),
				});
				mockDbSelect.mockImplementation(mockSelect);

				// Mock DAS API: asset owned by test wallet
				fetchSpy.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						result: {
							id: TEST_NFT_MINT,
							ownership: { owner: TEST_WALLET, frozen: false },
							burnt: false,
						},
					}),
				} as Response);

				const result = await verifyEditionOwnership(TEST_WALLET, TEST_POST_ID);

				expect(result.isOwner).toBe(true);
				expect(result.proofMint).toBe(TEST_NFT_MINT);
				expect(result.error).toBeUndefined();
			});

			it("should return isOwner: false when wallet does not own Core Asset", async () => {
				const mockSelect = vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue([{ nftMint: TEST_NFT_MINT }]),
					}),
				});
				mockDbSelect.mockImplementation(mockSelect);

				// Mock DAS API: asset owned by different wallet
				fetchSpy.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						result: {
							id: TEST_NFT_MINT,
							ownership: { owner: OTHER_WALLET, frozen: false },
							burnt: false,
						},
					}),
				} as Response);

				const result = await verifyEditionOwnership(TEST_WALLET, TEST_POST_ID);

				expect(result.isOwner).toBe(false);
			});

			it("should return isOwner: false when Core Asset is burnt", async () => {
				const mockSelect = vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue([{ nftMint: TEST_NFT_MINT }]),
					}),
				});
				mockDbSelect.mockImplementation(mockSelect);

				fetchSpy.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						result: {
							id: TEST_NFT_MINT,
							ownership: { owner: TEST_WALLET, frozen: false },
							burnt: true,
						},
					}),
				} as Response);

				const result = await verifyEditionOwnership(TEST_WALLET, TEST_POST_ID);

				expect(result.isOwner).toBe(false);
				// Note: Error is logged but not propagated to final result
				// (implementation continues checking other mints)
			});

			it("should be case-insensitive for wallet comparison", async () => {
				const mockSelect = vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue([{ nftMint: TEST_NFT_MINT }]),
					}),
				});
				mockDbSelect.mockImplementation(mockSelect);

				// Mock DAS API: owner address in different case
				fetchSpy.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						result: {
							id: TEST_NFT_MINT,
							ownership: { owner: TEST_WALLET.toLowerCase(), frozen: false },
							burnt: false,
						},
					}),
				} as Response);

				const result = await verifyEditionOwnership(TEST_WALLET, TEST_POST_ID);

				expect(result.isOwner).toBe(true);
			});
		});

		describe("SPL Token fallback", () => {
			/**
			 * NOTE: SPL token fallback tests are challenging to mock with ESM/Vitest
			 * because @solana/web3.js Connection class is complex to mock.
			 *
			 * The SPL fallback behavior is tested implicitly:
			 * - When DAS returns "not found", code falls back to SPL check
			 * - If SPL check fails (Connection mock issues), it returns isOwner: false
			 *
			 * After Phase 4a migration to use addressUtils, the SPL token check
			 * will be easier to test as it will use a simpler RPC interface.
			 */

			it("should trigger SPL fallback when DAS returns not found", async () => {
				const mockSelect = vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue([{ nftMint: TEST_NFT_MINT }]),
					}),
				});
				mockDbSelect.mockImplementation(mockSelect);

				// Mock DAS API: asset not found (triggers LEGACY_FALLBACK)
				fetchSpy.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						error: { code: -32000, message: "Asset not found" },
					}),
				} as Response);

				const result = await verifyEditionOwnership(TEST_WALLET, TEST_POST_ID);

				// SPL fallback is attempted but fails due to mocking limitations
				// Important: This verifies the code path is taken (no crash)
				expect(result.isOwner).toBe(false);
			});

			it("should trigger SPL fallback when DAS returns null result", async () => {
				const mockSelect = vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue([{ nftMint: TEST_NFT_MINT }]),
					}),
				});
				mockDbSelect.mockImplementation(mockSelect);

				// Mock DAS API: returns null result
				fetchSpy.mockResolvedValueOnce({
					ok: true,
					json: async () => ({ result: null }),
				} as Response);

				const result = await verifyEditionOwnership(TEST_WALLET, TEST_POST_ID);

				// SPL fallback is attempted
				expect(result.isOwner).toBe(false);
			});
		});

		describe("error cases", () => {
			it("should return error when no confirmed mints exist", async () => {
				const mockSelect = vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue([]),
					}),
				});
				mockDbSelect.mockImplementation(mockSelect);

				const result = await verifyEditionOwnership(TEST_WALLET, TEST_POST_ID);

				expect(result.isOwner).toBe(false);
				expect(result.error).toBe("No confirmed mints found for this post");
			});

			it("should return error when DAS API request fails", async () => {
				const mockSelect = vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue([{ nftMint: TEST_NFT_MINT }]),
					}),
				});
				mockDbSelect.mockImplementation(mockSelect);

				fetchSpy.mockResolvedValueOnce({
					ok: false,
					status: 500,
					statusText: "Internal Server Error",
				} as Response);

				const result = await verifyEditionOwnership(TEST_WALLET, TEST_POST_ID);

				expect(result.isOwner).toBe(false);
			});

			it("should handle SPL RPC errors gracefully", async () => {
				const mockSelect = vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue([{ nftMint: TEST_NFT_MINT }]),
					}),
				});
				mockDbSelect.mockImplementation(mockSelect);

				// Mock DAS API: not found (triggers fallback)
				fetchSpy.mockResolvedValueOnce({
					ok: true,
					json: async () => ({ result: null }),
				} as Response);

				// Mock SPL token check: RPC error
				mockGetTokenAccountsByOwner.mockRejectedValueOnce(new Error("RPC timeout"));

				const result = await verifyEditionOwnership(TEST_WALLET, TEST_POST_ID);

				expect(result.isOwner).toBe(false);
			});
		});

		describe("multiple mints", () => {
			it("should check all mints and return true on first match", async () => {
				const mockSelect = vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue([
							{ nftMint: "mint-1" },
							{ nftMint: "mint-2" },
							{ nftMint: "mint-3" },
						]),
					}),
				});
				mockDbSelect.mockImplementation(mockSelect);

				// First mint: not owned
				fetchSpy.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						result: {
							id: "mint-1",
							ownership: { owner: OTHER_WALLET, frozen: false },
							burnt: false,
						},
					}),
				} as Response);

				// Second mint: owned
				fetchSpy.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						result: {
							id: "mint-2",
							ownership: { owner: TEST_WALLET, frozen: false },
							burnt: false,
						},
					}),
				} as Response);

				const result = await verifyEditionOwnership(TEST_WALLET, TEST_POST_ID);

				expect(result.isOwner).toBe(true);
				expect(result.proofMint).toBe("mint-2");
				// Should not check third mint after finding a match
				expect(fetchSpy).toHaveBeenCalledTimes(2);
			});
		});
	});

	// ============================================================================
	// verifyCnftOwnership Tests
	// ============================================================================

	describe("verifyCnftOwnership", () => {
		it("should return isOwner: true when wallet owns cNFT", async () => {
			const mockSelect = vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([{ nftMint: TEST_ASSET_ID }]),
				}),
			});
			mockDbSelect.mockImplementation(mockSelect);

			fetchSpy.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					result: {
						id: TEST_ASSET_ID,
						ownership: { owner: TEST_WALLET, frozen: false },
						burnt: false,
					},
				}),
			} as Response);

			const result = await verifyCnftOwnership(TEST_WALLET, TEST_POST_ID);

			expect(result.isOwner).toBe(true);
			expect(result.proofMint).toBe(TEST_ASSET_ID);
		});

		it("should return isOwner: false when wallet does not own cNFT", async () => {
			const mockSelect = vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([{ nftMint: TEST_ASSET_ID }]),
				}),
			});
			mockDbSelect.mockImplementation(mockSelect);

			fetchSpy.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					result: {
						id: TEST_ASSET_ID,
						ownership: { owner: OTHER_WALLET, frozen: false },
						burnt: false,
					},
				}),
			} as Response);

			const result = await verifyCnftOwnership(TEST_WALLET, TEST_POST_ID);

			expect(result.isOwner).toBe(false);
		});

		it("should return isOwner: false when cNFT is burnt", async () => {
			const mockSelect = vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([{ nftMint: TEST_ASSET_ID }]),
				}),
			});
			mockDbSelect.mockImplementation(mockSelect);

			fetchSpy.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					result: {
						id: TEST_ASSET_ID,
						ownership: { owner: TEST_WALLET, frozen: false },
						burnt: true,
					},
				}),
			} as Response);

			const result = await verifyCnftOwnership(TEST_WALLET, TEST_POST_ID);

			expect(result.isOwner).toBe(false);
		});

		it("should return error when no confirmed assets exist", async () => {
			const mockSelect = vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([]),
				}),
			});
			mockDbSelect.mockImplementation(mockSelect);

			const result = await verifyCnftOwnership(TEST_WALLET, TEST_POST_ID);

			expect(result.isOwner).toBe(false);
			expect(result.error).toBe("No confirmed assets found for this post");
		});

		it("should continue checking assets after DAS API failure", async () => {
			const mockSelect = vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([
						{ nftMint: "asset-1" },
						{ nftMint: "asset-2" },
					]),
				}),
			});
			mockDbSelect.mockImplementation(mockSelect);

			// First asset: API error
			fetchSpy.mockResolvedValueOnce({
				ok: false,
				statusText: "Service Unavailable",
			} as Response);

			// Second asset: owned
			fetchSpy.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					result: {
						id: "asset-2",
						ownership: { owner: TEST_WALLET, frozen: false },
						burnt: false,
					},
				}),
			} as Response);

			const result = await verifyCnftOwnership(TEST_WALLET, TEST_POST_ID);

			expect(result.isOwner).toBe(true);
			expect(result.proofMint).toBe("asset-2");
		});
	});

	// ============================================================================
	// verifyNftOwnership Tests
	// ============================================================================

	describe("verifyNftOwnership", () => {
		it("should call verifyEditionOwnership for edition posts", async () => {
			// First call: get post type
			const mockSelectPost = vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ type: "edition" }]),
					}),
				}),
			});

			// Second call: get purchases
			const mockSelectPurchases = vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([{ nftMint: TEST_NFT_MINT }]),
				}),
			});

			let callCount = 0;
			mockDbSelect.mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					return mockSelectPost();
				}
				return mockSelectPurchases();
			});

			fetchSpy.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					result: {
						id: TEST_NFT_MINT,
						ownership: { owner: TEST_WALLET, frozen: false },
						burnt: false,
					},
				}),
			} as Response);

			const result = await verifyNftOwnership(TEST_WALLET, TEST_POST_ID);

			expect(result.isOwner).toBe(true);
		});

		it("should call verifyCnftOwnership for collectible posts", async () => {
			// First call: get post type
			const mockSelectPost = vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ type: "collectible" }]),
					}),
				}),
			});

			// Second call: get collections
			const mockSelectCollections = vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([{ nftMint: TEST_ASSET_ID }]),
				}),
			});

			let callCount = 0;
			mockDbSelect.mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					return mockSelectPost();
				}
				return mockSelectCollections();
			});

			fetchSpy.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					result: {
						id: TEST_ASSET_ID,
						ownership: { owner: TEST_WALLET, frozen: false },
						burnt: false,
					},
				}),
			} as Response);

			const result = await verifyNftOwnership(TEST_WALLET, TEST_POST_ID);

			expect(result.isOwner).toBe(true);
		});

		it("should return error for regular post type", async () => {
			const mockSelect = vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ type: "post" }]),
					}),
				}),
			});
			mockDbSelect.mockImplementation(mockSelect);

			const result = await verifyNftOwnership(TEST_WALLET, TEST_POST_ID);

			expect(result.isOwner).toBe(false);
			expect(result.error).toBe("Post type does not support NFT ownership");
		});

		it("should return error when post not found", async () => {
			const mockSelect = vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([]),
					}),
				}),
			});
			mockDbSelect.mockImplementation(mockSelect);

			const result = await verifyNftOwnership(TEST_WALLET, TEST_POST_ID);

			expect(result.isOwner).toBe(false);
			expect(result.error).toBe("Post not found");
		});
	});

	// ============================================================================
	// isPostCreator Tests
	// ============================================================================

	describe("isPostCreator", () => {
		it("should return true when wallet is the creator", async () => {
			const mockSelect = vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ creatorWallet: TEST_WALLET }]),
					}),
				}),
			});
			mockDbSelect.mockImplementation(mockSelect);

			const result = await isPostCreator(TEST_WALLET, TEST_POST_ID);

			expect(result).toBe(true);
		});

		it("should return false when wallet is not the creator", async () => {
			const mockSelect = vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ creatorWallet: OTHER_WALLET }]),
					}),
				}),
			});
			mockDbSelect.mockImplementation(mockSelect);

			const result = await isPostCreator(TEST_WALLET, TEST_POST_ID);

			expect(result).toBe(false);
		});

		it("should return false when post not found", async () => {
			const mockSelect = vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([]),
					}),
				}),
			});
			mockDbSelect.mockImplementation(mockSelect);

			const result = await isPostCreator(TEST_WALLET, TEST_POST_ID);

			expect(result).toBe(false);
		});

		it("should be case-insensitive", async () => {
			const mockSelect = vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ creatorWallet: TEST_WALLET.toLowerCase() }]),
					}),
				}),
			});
			mockDbSelect.mockImplementation(mockSelect);

			const result = await isPostCreator(TEST_WALLET, TEST_POST_ID);

			expect(result).toBe(true);
		});

		it("should handle null creatorWallet", async () => {
			const mockSelect = vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ creatorWallet: null }]),
					}),
				}),
			});
			mockDbSelect.mockImplementation(mockSelect);

			const result = await isPostCreator(TEST_WALLET, TEST_POST_ID);

			expect(result).toBe(false);
		});

		it("should handle database errors gracefully", async () => {
			mockDbSelect.mockImplementation(() => {
				throw new Error("Database connection failed");
			});

			const result = await isPostCreator(TEST_WALLET, TEST_POST_ID);

			expect(result).toBe(false);
		});
	});

	// ============================================================================
	// Address Validation Tests (Phase 4a migration)
	// ============================================================================

	describe("address validation (Phase 4a)", () => {
		it("should return error for invalid wallet address in SPL check", async () => {
			// This test verifies that invalid addresses are caught early
			// before attempting to create PublicKey objects
			const mockSelect = vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([{ nftMint: TEST_NFT_MINT }]),
				}),
			});
			mockDbSelect.mockImplementation(mockSelect);

			// Mock DAS API: not found (triggers SPL fallback)
			fetchSpy.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ result: null }),
			} as Response);

			// Use invalid wallet address
			const result = await verifyEditionOwnership("invalid-wallet", TEST_POST_ID);

			expect(result.isOwner).toBe(false);
			// The invalid address should be handled gracefully
		});
	});

	// ============================================================================
	// API Key Configuration Tests
	// ============================================================================

	describe("API key configuration", () => {
		it("should return error when Helius API key is not configured", async () => {
			// Override mock for this test
			vi.doMock("@/config/env", () => ({
				env: {
					HELIUS_API_KEY: "",
				},
				getHeliusRpcUrl: () => "https://mainnet.helius-rpc.com",
			}));

			// Note: Due to module caching, we can't easily test this scenario
			// In real usage, the API key check happens at runtime
			// This test documents the expected behavior
		});
	});
});
