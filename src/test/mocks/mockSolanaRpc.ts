/**
 * Mock Solana RPC responses for testing
 *
 * Provides factory functions to create mock RPC clients
 * and predefined responses for common RPC calls.
 */

import { vi } from "vitest";

// ============================================================================
// Types
// ============================================================================

export interface MockBalanceResponse {
	value: bigint;
}

export interface MockSignatureStatus {
	slot: bigint;
	confirmations: number | null;
	err: unknown | null;
	confirmationStatus: "processed" | "confirmed" | "finalized" | null;
}

export interface MockSignatureStatusesResponse {
	value: (MockSignatureStatus | null)[];
}

export interface MockSlotResponse {
	slot: bigint;
}

// ============================================================================
// Mock RPC Client Factory
// ============================================================================

export interface MockRpcClient {
	getBalance: ReturnType<typeof vi.fn>;
	getSignatureStatuses: ReturnType<typeof vi.fn>;
	getSlot: ReturnType<typeof vi.fn>;
	sendTransaction: ReturnType<typeof vi.fn>;
	getLatestBlockhash: ReturnType<typeof vi.fn>;
	getAccountInfo: ReturnType<typeof vi.fn>;
	getTokenAccountsByOwner: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock RPC client with configurable responses
 */
export function createMockRpcClient(
	overrides: Partial<MockRpcClient> = {}
): MockRpcClient {
	const defaultClient: MockRpcClient = {
		getBalance: vi.fn().mockReturnValue({
			send: vi.fn().mockResolvedValue({ value: BigInt(1_000_000_000) }), // 1 SOL
		}),
		getSignatureStatuses: vi.fn().mockReturnValue({
			send: vi.fn().mockResolvedValue({
				value: [
					{
						slot: BigInt(100),
						confirmations: 32,
						err: null,
						confirmationStatus: "confirmed",
					},
				],
			}),
		}),
		getSlot: vi.fn().mockReturnValue({
			send: vi.fn().mockResolvedValue(BigInt(12345)),
		}),
		sendTransaction: vi.fn().mockReturnValue({
			send: vi.fn().mockResolvedValue("mock-signature-123"),
		}),
		getLatestBlockhash: vi.fn().mockReturnValue({
			send: vi.fn().mockResolvedValue({
				value: {
					blockhash: "mock-blockhash-123",
					lastValidBlockHeight: BigInt(1000),
				},
			}),
		}),
		getAccountInfo: vi.fn().mockReturnValue({
			send: vi.fn().mockResolvedValue({
				value: null, // Account not found by default
			}),
		}),
		getTokenAccountsByOwner: vi.fn().mockReturnValue({
			send: vi.fn().mockResolvedValue({
				value: [], // No token accounts by default
			}),
		}),
	};

	return { ...defaultClient, ...overrides };
}

// ============================================================================
// Predefined Response Factories
// ============================================================================

/**
 * Create a mock balance response
 */
export function mockBalanceResponse(lamports: bigint): MockBalanceResponse {
	return { value: lamports };
}

/**
 * Create mock signature statuses response
 */
export function mockSignatureStatuses(
	statuses: (MockSignatureStatus | null)[]
): MockSignatureStatusesResponse {
	return { value: statuses };
}

/**
 * Create a confirmed signature status
 */
export function confirmedStatus(slot = BigInt(100)): MockSignatureStatus {
	return {
		slot,
		confirmations: 32,
		err: null,
		confirmationStatus: "confirmed",
	};
}

/**
 * Create a finalized signature status
 */
export function finalizedStatus(slot = BigInt(100)): MockSignatureStatus {
	return {
		slot,
		confirmations: null, // finalized has no confirmations count
		err: null,
		confirmationStatus: "finalized",
	};
}

/**
 * Create a failed signature status
 */
export function failedStatus(
	error: unknown = { InstructionError: [0, "Custom error"] },
	slot = BigInt(100)
): MockSignatureStatus {
	return {
		slot,
		confirmations: null,
		err: error,
		confirmationStatus: "confirmed",
	};
}

/**
 * Create a pending signature status (null status)
 */
export function pendingStatus(): null {
	return null;
}

// ============================================================================
// Error Factories
// ============================================================================

/**
 * Create a network error for testing retry logic
 */
export function networkError(message = "Network error"): Error {
	return new Error(message);
}

/**
 * Create an RPC error
 */
export function rpcError(message = "RPC error", code = -32000): Error {
	const error = new Error(message);
	(error as Error & { code: number }).code = code;
	return error;
}

/**
 * Create a timeout error
 */
export function timeoutError(): Error {
	return new Error("Request timeout");
}

/**
 * Create a rate limit error
 */
export function rateLimitError(): Error & { status: number } {
	const error = new Error("Rate limited") as Error & { status: number };
	error.status = 429;
	return error;
}

// ============================================================================
// Module Mock Helpers
// ============================================================================

/**
 * Mock the solanaClient module with a custom RPC client
 *
 * Usage in tests:
 * ```ts
 * vi.mock('@/server/services/blockchain/solanaClient', () =>
 *   mockSolanaClientModule(createMockRpcClient())
 * )
 * ```
 */
export function mockSolanaClientModule(mockClient: MockRpcClient) {
	return {
		createSolanaClient: vi.fn().mockReturnValue(mockClient),
		getSolanaClient: vi.fn().mockReturnValue(mockClient),
		LAMPORTS_PER_SOL: 1_000_000_000,
		USDC_DECIMALS: 6,
		USDC_BASE_UNITS: 1_000_000,
		SOLANA_NETWORK: "mainnet-beta",
		lamportsToSol: (lamports: number | bigint) =>
			Number(lamports) / 1_000_000_000,
		solToLamports: (sol: number) => BigInt(Math.round(sol * 1_000_000_000)),
		baseUnitsToUsdc: (baseUnits: number | bigint) => Number(baseUnits) / 1_000_000,
		usdcToBaseUnits: (usdc: number) => BigInt(Math.round(usdc * 1_000_000)),
		formatAddress: (address: string, chars = 4) =>
			address.length >= chars * 2 + 3
				? `${address.slice(0, chars)}...${address.slice(-chars)}`
				: address,
		getExplorerUrl: (signature: string, type: "tx" | "address" = "tx") =>
			type === "address"
				? `https://www.orbmarkets.io/token/${signature}/history?hideSpam=true`
				: `https://www.orbmarkets.io/tx/${signature}`,
		checkSolBalance: vi.fn(),
		getCurrentSlot: vi.fn(),
		getTransactionStatus: vi.fn(),
	};
}
