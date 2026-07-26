import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	selectResults: [] as unknown[][],
	updateResults: [] as unknown[][],
	updateError: null as unknown,
	updateSets: [] as Record<string, unknown>[],
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

vi.mock("@/server/db", () => ({
	db: {
		select: () => selectBuilder(mocks.selectResults.shift() ?? []),
		update: () => updateBuilder(),
		insert: vi.fn(),
	},
}));

vi.mock("@/server/auth", () => ({
	getPrivyClient: vi.fn(),
}));

vi.mock("./tip-payment-verifier", () => ({
	validateTransactionSignature: () => true,
	verifyTipTransaction: mocks.verify,
}));

import { confirmTipInternal } from "./tips-internal";

const input = { tipId: "tip-1", txSignature: "signature-1" };

describe("confirmTipInternal", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.selectResults = [];
		mocks.updateResults = [];
		mocks.updateError = null;
		mocks.updateSets = [];
	});

	it("persists and claims the signature before verification, then conditionally confirms", async () => {
		mocks.updateResults = [
			[
				{
					id: "tip-1",
					preparedMessageHash: "prepared-hash",
					preparedBlockhash: "prepared-blockhash",
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
