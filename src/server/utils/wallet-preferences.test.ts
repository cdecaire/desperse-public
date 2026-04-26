/**
 * Regression tests for wallet preferences.
 *
 * Phase 0 of Privy ETH enablement: codify the rules that must hold
 * before, during, and after we allow ETH wallets to link to a Desperse
 * account. The Desperse app is Solana-only — ETH wallets are linked
 * for verification/provenance only and must NEVER become the primary
 * wallet that signs Solana transactions.
 *
 * The "guard" tests in this file fail today (no guard exists yet) and
 * are expected to pass after Phase 1 lands the address-format check
 * inside setDefaultWalletDirect.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
	const mockAuthenticate = vi.fn();
	const mockDbSelect = vi.fn();
	const mockDbUpdate = vi.fn();
	const mockDbInsert = vi.fn();
	return { mockAuthenticate, mockDbSelect, mockDbUpdate, mockDbInsert };
});

vi.mock("@/server/auth", () => ({
	authenticateWithToken: mocks.mockAuthenticate,
}));

vi.mock("@/server/db", () => ({
	db: {
		select: mocks.mockDbSelect,
		update: mocks.mockDbUpdate,
		insert: mocks.mockDbInsert,
	},
}));

vi.mock("@/server/db/schema", () => ({
	userWallets: {
		id: "id",
		userId: "userId",
		address: "address",
		isPrimary: "isPrimary",
		type: "type",
		connector: "connector",
		label: "label",
		createdAt: "createdAt",
	},
}));

const SOLANA_ADDRESS = "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK";
const ETH_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";
const USER_ID = "user-uuid-123";
const WALLET_ID = "wallet-uuid-456";

describe("setDefaultWalletDirect — Solana-only primary guard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.mockAuthenticate.mockResolvedValue({ userId: USER_ID });

		const updateChain = {
			set: vi.fn().mockReturnThis(),
			where: vi.fn().mockResolvedValue(undefined),
		};
		mocks.mockDbUpdate.mockReturnValue(updateChain);
	});

	function mockWalletLookup(wallet: { id: string; address: string } | null) {
		mocks.mockDbSelect.mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					limit: vi.fn().mockResolvedValue(wallet ? [wallet] : []),
				}),
			}),
		});
	}

	it("succeeds when target wallet is a Solana (base58) address", async () => {
		mockWalletLookup({ id: WALLET_ID, address: SOLANA_ADDRESS });
		const { setDefaultWalletDirect } = await import("./wallet-preferences");

		const result = await setDefaultWalletDirect("token", WALLET_ID);

		expect(result.success).toBe(true);
		expect(mocks.mockDbUpdate).toHaveBeenCalled();
	});

	it("rejects when target wallet is an Ethereum (0x) address", async () => {
		mockWalletLookup({ id: WALLET_ID, address: ETH_ADDRESS });
		const { setDefaultWalletDirect } = await import("./wallet-preferences");

		const result = await setDefaultWalletDirect("token", WALLET_ID);

		expect(result.success).toBe(false);
		expect(result.error).toMatch(/solana|ethereum|not supported/i);
		expect(mocks.mockDbUpdate).not.toHaveBeenCalled();
	});

	it("rejects unauthenticated callers before touching the database", async () => {
		mocks.mockAuthenticate.mockResolvedValue(null);
		const { setDefaultWalletDirect } = await import("./wallet-preferences");

		const result = await setDefaultWalletDirect("bad-token", WALLET_ID);

		expect(result.success).toBe(false);
		expect(result.error).toMatch(/auth/i);
		expect(mocks.mockDbSelect).not.toHaveBeenCalled();
	});

	it("rejects when target wallet does not belong to the user", async () => {
		mockWalletLookup(null);
		const { setDefaultWalletDirect } = await import("./wallet-preferences");

		const result = await setDefaultWalletDirect("token", WALLET_ID);

		expect(result.success).toBe(false);
		expect(result.error).toMatch(/not found/i);
		expect(mocks.mockDbUpdate).not.toHaveBeenCalled();
	});
});

describe("addWalletDirect — isPrimary by chain", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.mockAuthenticate.mockResolvedValue({ userId: USER_ID });
	});

	function setup({
		walletCount,
		insertedAddress,
	}: {
		walletCount: number;
		insertedAddress: string;
	}) {
		// db.select() → from() → where() → resolves to [{ value: walletCount }]
		mocks.mockDbSelect.mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue([{ value: walletCount }]),
			}),
		});

		const captured: { values?: Record<string, unknown> } = {};
		const insertChain = {
			values: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
				captured.values = vals;
				return insertChain;
			}),
			returning: vi.fn().mockImplementation(() =>
				Promise.resolve([
					{
						id: WALLET_ID,
						address: insertedAddress,
						type: "external",
						connector: null,
						label: "External Wallet",
						isPrimary: captured.values?.isPrimary ?? false,
						createdAt: new Date(),
					},
				]),
			),
		};
		mocks.mockDbInsert.mockReturnValue(insertChain);
		return { insertChain, captured };
	}

	it("marks Solana address as primary when it is the user's first wallet", async () => {
		const insert = setup({ walletCount: 0, insertedAddress: SOLANA_ADDRESS });
		const { addWalletDirect } = await import("./wallet-preferences");

		const result = await addWalletDirect("token", SOLANA_ADDRESS, "embedded");

		expect(result.success).toBe(true);
		expect(insert.captured.values?.isPrimary).toBe(true);
	});

	it("does NOT mark ETH address as primary even when it is the first wallet", async () => {
		const insert = setup({ walletCount: 0, insertedAddress: ETH_ADDRESS });
		const { addWalletDirect } = await import("./wallet-preferences");

		const result = await addWalletDirect("token", ETH_ADDRESS, "external");

		expect(result.success).toBe(true);
		expect(insert.captured.values?.isPrimary).toBe(false);
	});

	it("does not mark a Solana address as primary when other wallets already exist", async () => {
		const insert = setup({ walletCount: 1, insertedAddress: SOLANA_ADDRESS });
		const { addWalletDirect } = await import("./wallet-preferences");

		await addWalletDirect("token", SOLANA_ADDRESS, "external");

		expect(insert.captured.values?.isPrimary).toBe(false);
	});
});
