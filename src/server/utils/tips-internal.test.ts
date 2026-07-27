import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	selectResults: [] as unknown[][],
	updateResults: [] as unknown[][],
	updateError: null as unknown,
	updateSets: [] as Record<string, unknown>[],
	insertValues: [] as Record<string, unknown>[],
	insertResults: [] as unknown[][],
	getUserById: vi.fn(),
	buildTipTransaction: vi.fn(),
	verify: vi.fn(),
}));

function selectBuilder(result: unknown[]) {
	const builder = {
		from: () => builder,
		where: () => builder,
		limit: () => Promise.resolve(result),
	};
	return builder;
}

function updateBuilder() {
	const builder = {
		set: (payload: Record<string, unknown>) => {
			mocks.updateSets.push(payload);
			return builder;
		},
		where: () => builder,
		returning: async () => {
			if (mocks.updateError) throw mocks.updateError;
			return mocks.updateResults.shift() ?? [];
		},
	};
	return builder;
}

function insertBuilder() {
	const builder = {
		values: (payload: Record<string, unknown>) => {
			mocks.insertValues.push(payload);
			return builder;
		},
		returning: async () => mocks.insertResults.shift() ?? [],
	};
	return builder;
}

vi.mock("@/server/db", () => ({
	db: {
		select: () => selectBuilder(mocks.selectResults.shift() ?? []),
		update: () => updateBuilder(),
		insert: () => insertBuilder(),
	},
}));

vi.mock("@/server/auth", () => ({
	getPrivyClient: () => ({ getUserById: mocks.getUserById }),
}));

vi.mock("./tip-transaction", () => ({
	buildTipTransaction: mocks.buildTipTransaction,
	rawAmountToSkr: (amount: bigint) => Number(amount) / 1_000_000,
	SKR_DECIMALS: 6,
	skrToRawAmount: (amount: number) => BigInt(Math.round(amount * 1_000_000)),
}));

vi.mock("./tip-payment-verifier", () => ({
	validateTransactionSignature: () => true,
	verifyTipTransaction: mocks.verify,
}));

import { confirmTipInternal, prepareTipInternal } from "./tips-internal";

const input = { tipId: "tip-1", txSignature: "signature-1" };

function resetMocks() {
	vi.clearAllMocks();
	mocks.selectResults = [];
	mocks.updateResults = [];
	mocks.updateError = null;
	mocks.updateSets = [];
	mocks.insertValues = [];
	mocks.insertResults = [];
}

describe("confirmTipInternal", () => {
	beforeEach(resetMocks);

	it("persists and claims the signature before verification, then conditionally confirms", async () => {
		mocks.updateResults = [
			[
				{
					id: "tip-1",
					preparedMessageHash: "prepared-hash",
					preparedBlockhash: "prepared-blockhash",
					lastValidBlockHeight: 100,
				},
			],
			[{ id: "tip-1" }],
		];
		mocks.verify.mockResolvedValue("confirmed");

		const result = await confirmTipInternal("user-1", input);

		expect(result).toEqual({ success: true, status: "confirmed" });
		expect(mocks.updateSets[0]).toMatchObject({
			txSignature: "signature-1",
			verificationClaimKey: expect.any(String),
		});
		expect(mocks.verify).toHaveBeenCalledWith("signature-1", {
			preparedMessageHash: "prepared-hash",
			preparedBlockhash: "prepared-blockhash",
			lastValidBlockHeight: 100,
		});
		expect(mocks.updateSets.at(-1)).toMatchObject({ status: "confirmed" });
	});

	it("maps a concurrent unique-index collision to signature_reused", async () => {
		mocks.updateError = { code: "23505" };

		const result = await confirmTipInternal("user-1", input);

		expect(result).toMatchObject({ success: false, status: "signature_reused" });
		expect(mocks.verify).not.toHaveBeenCalled();
	});

	it("returns idempotent success when the same tip is already confirmed with the signature", async () => {
		mocks.updateResults = [[]];
		mocks.selectResults = [
			[
				{
					fromUserId: "user-1",
					status: "confirmed",
					txSignature: "signature-1",
					lastVerificationCode: "confirmed",
				},
			],
		];

		const result = await confirmTipInternal("user-1", input);

		expect(result).toEqual({ success: true, status: "confirmed" });
		expect(mocks.verify).not.toHaveBeenCalled();
	});
});

describe("prepareTipInternal", () => {
	beforeEach(resetMocks);

	it("prepares a tip for a SIWS sender without looking up the synthetic Privy ID", async () => {
		const senderWallet = "11111111111111111111111111111111";
		const recipientWallet = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

		mocks.getUserById.mockImplementation(async (privyId: string) => {
			if (privyId.startsWith("siws:")) throw new Error("Privy user not found");
			return {
				linkedAccounts: [
					{
						type: "wallet",
						chainType: "solana",
						address: recipientWallet,
						walletClientType: "privy",
					},
				],
			};
		});
		mocks.selectResults = [
			[{ id: "recipient-1", walletAddress: recipientWallet, privyId: "did:privy:recipient" }],
			[],
			[],
		];
		mocks.insertResults = [[{ id: "tip-1" }]];
		mocks.buildTipTransaction.mockResolvedValue({
			transactionBase64: "prepared-transaction",
			blockhash: "prepared-blockhash",
			lastValidBlockHeight: 123,
			messageHash: "prepared-hash",
			sourceTokenAccount: "source-token-account",
			destinationTokenAccount: "destination-token-account",
			tokenProgram: "token-program",
		});

		const result = await prepareTipInternal(
			"sender-1",
			`siws:${senderWallet}`,
			senderWallet,
			{ toUserId: "recipient-1", amount: 1, context: "profile" },
		);

		expect(result).toMatchObject({ success: true, tipId: "tip-1" });
		expect(mocks.getUserById).toHaveBeenCalledTimes(1);
		expect(mocks.getUserById).toHaveBeenCalledWith("did:privy:recipient");
		expect(mocks.insertValues[0]).toMatchObject({ fromWalletAddress: senderWallet });
	});
});
