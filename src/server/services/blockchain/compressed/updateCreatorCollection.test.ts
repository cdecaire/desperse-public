/**
 * Tests for updateCreatorCollection — editing a LIVE creator collection.
 *
 * Covers the guard matrix (no collection, subsidy breaker, rate-limit cooldown,
 * authority mismatch) and the happy path (persist overrides → versioned upload →
 * on-chain updateCollection → stamp cooldown). Blockchain + blob + db are mocked;
 * generateCreatorCollectionMetadata / retryWithBackoff / bs58 run for real (pure).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const FEE_PAYER = "FeePayerUpdateAuthority1111111111111111111111";
const COLLECTION_MINT = "Co11ectionMintAddr11111111111111111111111111";

const mocks = vi.hoisted(() => ({
	mockDbSelect: vi.fn(),
	mockDbUpdate: vi.fn(),
	mockUpdateCollection: vi.fn(),
	mockSendAndConfirm: vi.fn(),
	mockFetchCollection: vi.fn(),
	mockUpload: vi.fn(),
	env: { DISABLE_FEE_SUBSIDY: false, COLLECTION_EDIT_LIMIT_DAYS: 90 },
	selectResults: [] as unknown[][],
	// Literal (not FEE_PAYER) — vi.hoisted runs before the const initializers.
	updateAuthority: "FeePayerUpdateAuthority1111111111111111111111",
}));

vi.mock("@/server/db", () => ({
	db: { select: mocks.mockDbSelect, update: mocks.mockDbUpdate },
}));

vi.mock("@/config/env", () => ({ env: mocks.env }));

vi.mock("./umiClient", () => ({
	getUmi: () => ({ identity: { publicKey: { toString: () => FEE_PAYER } } }),
}));

vi.mock("@metaplex-foundation/umi", () => ({
	// Identity — the util only needs a stable handle back for the collection.
	publicKey: (v: string) => v,
}));

vi.mock("@metaplex-foundation/mpl-core", () => ({
	updateCollection: mocks.mockUpdateCollection,
	fetchCollection: mocks.mockFetchCollection,
}));

vi.mock("@/server/storage/blob", () => ({
	uploadCollectionMetadataJson: mocks.mockUpload,
}));

// Run the operation once with no backoff delay (keeps the failure test fast).
vi.mock("@/lib/retryUtils", () => ({
	retryWithBackoff: (fn: () => Promise<unknown>) => fn(),
}));

import { updateCreatorCollection } from "./updateCreatorCollection";

function makeSelectBuilder() {
	const result = mocks.selectResults.length ? mocks.selectResults.shift() : [];
	const builder: Record<string, unknown> = {};
	for (const m of ["from", "where"]) builder[m] = () => builder;
	(builder as { limit: unknown }).limit = () => Promise.resolve(result);
	return builder;
}

function makeUpdateBuilder() {
	const builder: Record<string, unknown> = {};
	builder.set = () => builder;
	// The util awaits `.where(...)` directly (no `.returning()`), so it must resolve.
	builder.where = () => Promise.resolve([]);
	return builder;
}

function creatorRow(overrides: Record<string, unknown> = {}) {
	return {
		id: "creator-1",
		collectionMint: COLLECTION_MINT,
		collectionUpdatedAt: null,
		displayName: "Jane",
		usernameSlug: "jane",
		avatarUrl: null,
		collectionName: null,
		collectionImageUrl: null,
		...overrides,
	};
}

describe("updateCreatorCollection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.env.DISABLE_FEE_SUBSIDY = false;
		mocks.env.COLLECTION_EDIT_LIMIT_DAYS = 90;
		mocks.selectResults = [];
		mocks.updateAuthority = FEE_PAYER;
		mocks.mockDbSelect.mockImplementation(() => makeSelectBuilder());
		mocks.mockDbUpdate.mockImplementation(() => makeUpdateBuilder());
		mocks.mockUpload.mockResolvedValue({ success: true, url: "https://blob.example/collection-creator-1-123.json" });
		mocks.mockSendAndConfirm.mockResolvedValue({ signature: new Uint8Array([1, 2, 3]) });
		mocks.mockUpdateCollection.mockReturnValue({ sendAndConfirm: mocks.mockSendAndConfirm });
		mocks.mockFetchCollection.mockImplementation(() =>
			Promise.resolve({ updateAuthority: { toString: () => mocks.updateAuthority } }),
		);
	});

	it("fails with no_collection when the creator has no collection yet", async () => {
		mocks.selectResults = [[creatorRow({ collectionMint: null })]];
		const res = await updateCreatorCollection("creator-1", { collectionName: "New" });
		expect(res.success).toBe(false);
		expect(res.success === false && res.code).toBe("no_collection");
		expect(mocks.mockUpdateCollection).not.toHaveBeenCalled();
	});

	it("fails with subsidy_disabled when the fee-subsidy breaker is tripped", async () => {
		mocks.env.DISABLE_FEE_SUBSIDY = true;
		mocks.selectResults = [[creatorRow()]];
		const res = await updateCreatorCollection("creator-1", { collectionName: "New" });
		expect(res.success === false && res.code).toBe("subsidy_disabled");
		expect(mocks.mockUpdateCollection).not.toHaveBeenCalled();
	});

	it("rate-limits when the last edit is within the window", async () => {
		const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
		mocks.selectResults = [[creatorRow({ collectionUpdatedAt: tenDaysAgo })]];
		const res = await updateCreatorCollection("creator-1", { collectionName: "New" });
		expect(res.success === false && res.code).toBe("rate_limited");
		expect(res.success === false && res.remainingDays).toBeGreaterThan(75);
		expect(mocks.mockUpdateCollection).not.toHaveBeenCalled();
	});

	it("allows the edit once the window has elapsed", async () => {
		const longAgo = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
		mocks.selectResults = [[creatorRow({ collectionUpdatedAt: longAgo })]];
		const res = await updateCreatorCollection("creator-1", { collectionName: "New" });
		expect(res.success).toBe(true);
		expect(mocks.mockUpdateCollection).toHaveBeenCalledTimes(1);
	});

	it("fails with not_authority when the fee-payer is not the update authority", async () => {
		mocks.updateAuthority = "SomeOtherAuthority1111111111111111111111111";
		mocks.selectResults = [[creatorRow()]];
		const res = await updateCreatorCollection("creator-1", { collectionName: "New" });
		expect(res.success === false && res.code).toBe("not_authority");
		expect(mocks.mockUpdateCollection).not.toHaveBeenCalled();
	});

	it("happy path: uploads versioned JSON, repoints on-chain, stamps cooldown", async () => {
		mocks.selectResults = [[creatorRow()]]; // first edit (collectionUpdatedAt null)
		const res = await updateCreatorCollection("creator-1", {
			collectionName: "My Collection",
			collectionImageUrl: "https://img.example/x.png",
		});
		expect(res.success).toBe(true);
		expect(res.success && res.txSignature).toBeTruthy();
		expect(res.success && res.url).toContain("creator-1");

		// Upload used the versioned form (4th arg = version token).
		expect(mocks.mockUpload).toHaveBeenCalledTimes(1);
		expect(mocks.mockUpload.mock.calls[0][3]).toBeDefined();

		// On-chain update called with name + uri.
		expect(mocks.mockUpdateCollection).toHaveBeenCalledTimes(1);
		const updateArgs = mocks.mockUpdateCollection.mock.calls[0][1];
		expect(updateArgs.name).toBe("My Collection");
		expect(updateArgs.uri).toContain("creator-1");

		// One db.update AFTER on-chain success: overrides + collectionUpdatedAt stamp.
		expect(mocks.mockDbUpdate).toHaveBeenCalledTimes(1);
	});

	it("returns a failure (never throws) when the on-chain update fails", async () => {
		mocks.selectResults = [[creatorRow()]];
		mocks.mockSendAndConfirm.mockRejectedValue(new Error("RPC unavailable"));
		const res = await updateCreatorCollection("creator-1", { collectionName: "New" });
		expect(res.success === false && res.code).toBe("failed");
	});
});
