/**
 * Tests for tip confirmation — the money-critical path.
 *
 * confirmTipInternal is what gates DM unlocks and tip stats, so a client must
 * NOT be able to mark a tip "confirmed" without a real on-chain payment. These
 * tests drive the real function with a mocked RPC (`getTransaction`) and DB, and
 * assert the guards (ownership, status, signature reuse) and the on-chain
 * verification decision (confirmed / underpaid / not-credited / failed / pending).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
	mockDbSelect: vi.fn(),
	mockDbUpdate: vi.fn(),
	mockDbInsert: vi.fn(),
	mockGetTransaction: vi.fn(),
	mockGetPrimaryWallet: vi.fn(),
	// Per-test queue: each db.select() call shifts the next array off the front.
	selectResults: [] as unknown[][],
	// Records every db.update(...).set(payload) payload so we can assert the write.
	updateSets: [] as Record<string, unknown>[],
}));

vi.mock("@/server/db", () => ({
	db: {
		select: mocks.mockDbSelect,
		update: mocks.mockDbUpdate,
		insert: mocks.mockDbInsert,
	},
}));

vi.mock("@/config/env", () => ({
	getHeliusRpcUrl: () => "https://mainnet.helius-rpc.com/?api-key=test",
}));

vi.mock("./tip-transaction", () => ({
	buildTipTransaction: vi.fn(),
	skrToRawAmount: vi.fn((n: number) => BigInt(Math.round(n * 1_000_000))),
	rawAmountToSkr: vi.fn((r: bigint) => Number(r) / 1_000_000),
}));

vi.mock("./wallet-compat", () => ({
	getPrimaryWalletAddress: mocks.mockGetPrimaryWallet,
}));

vi.mock("@solana/web3.js", () => {
	class MockConnection {
		constructor(_url: string, _commitment?: string) {}
		getTransaction = mocks.mockGetTransaction;
	}
	return { Connection: MockConnection };
});

import { confirmTipInternal } from "./tips-internal";

// ── Fixtures ────────────────────────────────────────────────────────────────
const ME = "user-me";
const RECIPIENT = "user-recipient";
const RECIPIENT_WALLET = "RecipientWa11etAddress1111111111111111111111";
const MINT = "SKRMint1111111111111111111111111111111111111";
const TIP_RAW = 1_000_000n; // 1 SKR at 6 decimals
const SIG = "5xTxSignature1111111111111111111111111111111111111111111111111111";

function pendingTip(overrides: Record<string, unknown> = {}) {
	return {
		id: "tip-1",
		fromUserId: ME,
		toUserId: RECIPIENT,
		amount: TIP_RAW,
		tokenMint: MINT,
		status: "pending",
		...overrides,
	};
}

/** A getTransaction result whose token-balance delta credits `amount` to the recipient. */
function txCrediting(amount: bigint, err: unknown = null) {
	return {
		meta: {
			err,
			preTokenBalances: [
				{ accountIndex: 3, mint: MINT, owner: RECIPIENT_WALLET, uiTokenAmount: { amount: "0" } },
			],
			postTokenBalances: [
				{ accountIndex: 3, mint: MINT, owner: RECIPIENT_WALLET, uiTokenAmount: { amount: amount.toString() } },
			],
		},
	};
}

// db.select() → consumes the next queued result; supports .from().where().limit() and await.
function makeSelectBuilder() {
	const result = mocks.selectResults.length ? mocks.selectResults.shift() : [];
	const builder: Record<string, unknown> = {};
	for (const m of ["from", "where", "orderBy", "limit"]) builder[m] = () => builder;
	(builder as { then: unknown }).then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
		Promise.resolve(result).then(res, rej);
	(builder as { limit: unknown }).limit = () => Promise.resolve(result);
	return builder;
}

// db.update().set(payload).where() → records payload, resolves.
function makeUpdateBuilder() {
	let payload: Record<string, unknown> = {};
	const builder: Record<string, unknown> = {
		set: (p: Record<string, unknown>) => {
			payload = p;
			return builder;
		},
		where: () => {
			mocks.updateSets.push(payload);
			return Promise.resolve(undefined);
		},
	};
	return builder;
}

describe("confirmTipInternal", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.selectResults = [];
		mocks.updateSets = [];
		mocks.mockDbSelect.mockImplementation(() => makeSelectBuilder());
		mocks.mockDbUpdate.mockImplementation(() => makeUpdateBuilder());
		mocks.mockGetPrimaryWallet.mockResolvedValue(RECIPIENT_WALLET);
	});

	// ── Guards ────────────────────────────────────────────────────────────────

	it("rejects a tip that does not exist", async () => {
		mocks.selectResults = [[]]; // get tip → none
		const res = await confirmTipInternal(ME, { tipId: "missing", txSignature: SIG });
		expect(res).toMatchObject({ success: false, status: "not_found" });
		expect(mocks.mockGetTransaction).not.toHaveBeenCalled();
	});

	it("rejects confirmation by a user who does not own the tip", async () => {
		mocks.selectResults = [[pendingTip({ fromUserId: "someone-else" })]];
		const res = await confirmTipInternal(ME, { tipId: "tip-1", txSignature: SIG });
		expect(res).toMatchObject({ success: false, status: "unauthorized" });
		expect(mocks.mockGetTransaction).not.toHaveBeenCalled();
	});

	it("rejects a tip that is not pending (no double-confirm)", async () => {
		mocks.selectResults = [[pendingTip({ status: "confirmed" })]];
		const res = await confirmTipInternal(ME, { tipId: "tip-1", txSignature: SIG });
		expect(res).toMatchObject({ success: false, status: "invalid_status" });
		expect(mocks.mockGetTransaction).not.toHaveBeenCalled();
	});

	it("rejects a signature already attached to another tip, pending or confirmed (no replay)", async () => {
		// The reuse guard matches ANY other tip carrying this signature — a client must
		// not attach one payment to a second tip even while the first is still pending.
		mocks.selectResults = [
			[pendingTip()], // get tip
			[{ id: "other-tip" }], // signature-reuse check finds a match (any status)
		];
		const res = await confirmTipInternal(ME, { tipId: "tip-1", txSignature: SIG });
		expect(res).toMatchObject({ success: false, status: "signature_reused" });
		expect(mocks.mockGetTransaction).not.toHaveBeenCalled();
	});

	it("rejects when the recipient has no resolvable wallet", async () => {
		mocks.mockGetPrimaryWallet.mockResolvedValue(null);
		mocks.selectResults = [
			[pendingTip()], // get tip
			[], // reuse check
			[{ walletAddress: null }], // recipient row (no legacy wallet either)
		];
		const res = await confirmTipInternal(ME, { tipId: "tip-1", txSignature: SIG });
		expect(res).toMatchObject({ success: false, status: "no_wallet" });
		expect(mocks.mockGetTransaction).not.toHaveBeenCalled();
	});

	// ── On-chain verification decision ─────────────────────────────────────────

	it("confirms when the tx credits the recipient with >= the tip amount", async () => {
		mocks.selectResults = [[pendingTip()], [], [{ walletAddress: RECIPIENT_WALLET }]];
		mocks.mockGetTransaction.mockResolvedValueOnce(txCrediting(TIP_RAW));
		const res = await confirmTipInternal(ME, { tipId: "tip-1", txSignature: SIG });
		expect(res).toEqual({ success: true, status: "confirmed" });
		expect(mocks.updateSets.at(-1)).toMatchObject({ status: "confirmed", txSignature: SIG });
	});

	it("fails when the tx transferred less than the tip amount", async () => {
		mocks.selectResults = [[pendingTip()], [], [{ walletAddress: RECIPIENT_WALLET }]];
		mocks.mockGetTransaction.mockResolvedValueOnce(txCrediting(TIP_RAW / 2n));
		const res = await confirmTipInternal(ME, { tipId: "tip-1", txSignature: SIG });
		expect(res).toMatchObject({ success: false, status: "failed" });
		expect(mocks.updateSets.at(-1)).toMatchObject({ status: "failed" });
	});

	it("fails when the tx did not credit the recipient's token account", async () => {
		mocks.selectResults = [[pendingTip()], [], [{ walletAddress: RECIPIENT_WALLET }]];
		mocks.mockGetTransaction.mockResolvedValueOnce({
			meta: {
				err: null,
				preTokenBalances: [],
				postTokenBalances: [
					// Credited a DIFFERENT wallet, not the recipient.
					{ accountIndex: 3, mint: MINT, owner: "SomeOtherWa11et", uiTokenAmount: { amount: TIP_RAW.toString() } },
				],
			},
		});
		const res = await confirmTipInternal(ME, { tipId: "tip-1", txSignature: SIG });
		expect(res).toMatchObject({ success: false, status: "failed" });
	});

	it("fails when the tx errored on-chain", async () => {
		mocks.selectResults = [[pendingTip()], [], [{ walletAddress: RECIPIENT_WALLET }]];
		mocks.mockGetTransaction.mockResolvedValueOnce(txCrediting(TIP_RAW, { InstructionError: [0, "Custom"] }));
		const res = await confirmTipInternal(ME, { tipId: "tip-1", txSignature: SIG });
		expect(res).toMatchObject({ success: false, status: "failed" });
		expect(mocks.updateSets.at(-1)).toMatchObject({ status: "failed" });
	});

	it("leaves the tip pending (never fail-open to confirmed) when the RPC errors", async () => {
		// An RPC/network failure must not credit the tip. verifyTipPayment catches and
		// returns 'pending' so reconcileTipsFromTo can finalize it later on-chain.
		mocks.selectResults = [[pendingTip()], [], [{ walletAddress: RECIPIENT_WALLET }]];
		mocks.mockGetTransaction.mockRejectedValue(new Error("RPC unavailable"));
		const res = await confirmTipInternal(ME, { tipId: "tip-1", txSignature: SIG });
		expect(res).toEqual({ success: true, status: "pending" });
		// Signature stored, but status was NOT flipped to confirmed.
		expect(mocks.updateSets.at(-1)).toMatchObject({ txSignature: SIG });
		expect(mocks.updateSets.some((s) => s.status === "confirmed")).toBe(false);
	});
});
