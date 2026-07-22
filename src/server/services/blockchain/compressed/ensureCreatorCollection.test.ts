/**
 * Tests for ensureCreatorCollection — the lazy, idempotent per-creator collection.
 *
 * The critical properties: create once and reuse; win/lose the concurrent-creation
 * race deterministically (atomic WHERE collection_mint IS NULL); and never throw into
 * the mint path — any failure (RPC, upload, breaker) returns null so the collectible
 * mints ungrouped and retries next collect.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const COLLECTION_ADDR = "Co11ectionMintAddr11111111111111111111111111";

const mocks = vi.hoisted(() => ({
	mockDbSelect: vi.fn(),
	mockDbUpdate: vi.fn(),
	mockCreateCollection: vi.fn(),
	mockSendAndConfirm: vi.fn(),
	mockUpload: vi.fn(),
	env: { DISABLE_FEE_SUBSIDY: false },
	selectResults: [] as unknown[][],
	updateResult: [] as unknown[],
}));

vi.mock("@/server/db", () => ({
	db: { select: mocks.mockDbSelect, update: mocks.mockDbUpdate },
}));

vi.mock("@/config/env", () => ({ env: mocks.env }));

vi.mock("./umiClient", () => ({ getUmi: () => ({}) }));

vi.mock("@metaplex-foundation/umi", () => ({
	generateSigner: () => ({ publicKey: { toString: () => COLLECTION_ADDR } }),
}));

vi.mock("@metaplex-foundation/mpl-core", () => ({
	createCollection: mocks.mockCreateCollection,
	// Resolves immediately so the propagation-wait loop breaks on the first attempt.
	fetchCollection: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/server/storage/blob", () => ({
	uploadCollectionMetadataJson: mocks.mockUpload,
}));

import { ensureCreatorCollection } from "./ensureCreatorCollection";

function makeSelectBuilder() {
	const result = mocks.selectResults.length ? mocks.selectResults.shift() : [];
	const builder: Record<string, unknown> = {};
	for (const m of ["from", "where"]) builder[m] = () => builder;
	(builder as { limit: unknown }).limit = () => Promise.resolve(result);
	(builder as { then: unknown }).then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
		Promise.resolve(result).then(res, rej);
	return builder;
}

function makeUpdateBuilder() {
	const builder: Record<string, unknown> = {};
	builder.set = () => builder;
	builder.where = () => builder;
	builder.returning = () => Promise.resolve(mocks.updateResult);
	return builder;
}

function creatorRow(collectionMint: string | null) {
	return { id: "creator-1", collectionMint, displayName: "Jane", usernameSlug: "jane", avatarUrl: null };
}

describe("ensureCreatorCollection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.env.DISABLE_FEE_SUBSIDY = false;
		mocks.selectResults = [];
		mocks.updateResult = [];
		mocks.mockDbSelect.mockImplementation(() => makeSelectBuilder());
		mocks.mockDbUpdate.mockImplementation(() => makeUpdateBuilder());
		mocks.mockUpload.mockResolvedValue({ success: true, url: "https://blob.example/collection.json" });
		mocks.mockSendAndConfirm.mockResolvedValue({ signature: new Uint8Array([1, 2, 3]) });
		mocks.mockCreateCollection.mockReturnValue({ sendAndConfirm: mocks.mockSendAndConfirm });
	});

	it("reuses an existing collection without creating a new one", async () => {
		mocks.selectResults = [[creatorRow("ExistingCollectionAddr")]];
		const res = await ensureCreatorCollection("creator-1");
		expect(res).toBe("ExistingCollectionAddr");
		expect(mocks.mockCreateCollection).not.toHaveBeenCalled();
		expect(mocks.mockUpload).not.toHaveBeenCalled();
	});

	it("returns null (mint ungrouped) when the fee-subsidy breaker is tripped", async () => {
		mocks.env.DISABLE_FEE_SUBSIDY = true;
		mocks.selectResults = [[creatorRow(null)]];
		const res = await ensureCreatorCollection("creator-1");
		expect(res).toBeNull();
		expect(mocks.mockCreateCollection).not.toHaveBeenCalled();
	});

	it("creates + persists the collection and returns its address (won the race)", async () => {
		mocks.selectResults = [[creatorRow(null)]];
		mocks.updateResult = [{ collectionMint: COLLECTION_ADDR }]; // atomic persist won
		const res = await ensureCreatorCollection("creator-1");
		expect(res).toBe(COLLECTION_ADDR);
		expect(mocks.mockCreateCollection).toHaveBeenCalledTimes(1);
		expect(mocks.mockSendAndConfirm).toHaveBeenCalledTimes(1);
	});

	it("reuses the winner's collection when it loses the concurrent-creation race", async () => {
		mocks.selectResults = [
			[creatorRow(null)], // initial read: no collection yet
			[{ collectionMint: "WinnerCollectionAddr" }], // re-read after losing the persist
		];
		mocks.updateResult = []; // atomic persist affected 0 rows → lost the race
		const res = await ensureCreatorCollection("creator-1");
		expect(res).toBe("WinnerCollectionAddr");
	});

	it("returns null when the collection metadata upload fails", async () => {
		mocks.selectResults = [[creatorRow(null)]];
		mocks.mockUpload.mockResolvedValue({ success: false, error: "blob down" });
		const res = await ensureCreatorCollection("creator-1");
		expect(res).toBeNull();
		expect(mocks.mockCreateCollection).not.toHaveBeenCalled();
	});

	it("returns null (never throws) when on-chain creation fails", async () => {
		mocks.selectResults = [[creatorRow(null)]];
		mocks.mockSendAndConfirm.mockRejectedValue(new Error("RPC unavailable"));
		const res = await ensureCreatorCollection("creator-1");
		expect(res).toBeNull();
	});

	it("returns null when the creator does not exist", async () => {
		mocks.selectResults = [[]];
		const res = await ensureCreatorCollection("missing");
		expect(res).toBeNull();
	});
});
