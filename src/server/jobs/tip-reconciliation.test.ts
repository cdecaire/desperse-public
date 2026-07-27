import { describe, expect, it, vi } from "vitest";
import { reconcilePendingTips, verificationBackoffMs, type ClaimedTip } from "./tip-reconciliation";

const row: ClaimedTip = {
	id: "tip-1",
	txSignature: "signature",
	claimKey: "claim",
	attempts: 1,
	preparedMessageHash: "hash",
	preparedBlockhash: "blockhash",
};

describe("tip reconciliation", () => {
	it("uses bounded exponential backoff with deterministic jitter", () => {
		expect(verificationBackoffMs(1, () => 0)).toBe(15_000);
		expect(verificationBackoffMs(6, () => 0)).toBe(600_000);
		expect(verificationBackoffMs(99, () => 1)).toBe(720_000);
	});

	it("retries delayed RPC visibility, then confirms on a later run", async () => {
		const finalize = vi.fn().mockResolvedValueOnce("retried").mockResolvedValueOnce("confirmed");
		const verify = vi.fn().mockResolvedValueOnce("confirmation_pending").mockResolvedValueOnce("confirmed");
		const claim = vi.fn().mockResolvedValue([row]);

		const first = await reconcilePendingTips({ claim, verify, finalize, random: () => 0 });
		const second = await reconcilePendingTips({ claim, verify, finalize, random: () => 0 });

		expect(first).toMatchObject({ claimed: 1, retried: 1, confirmed: 0 });
		expect(second).toMatchObject({ claimed: 1, retried: 0, confirmed: 1 });
	});

	it("records terminal invalid evidence and ignores duplicate runs with no claim", async () => {
		const finalize = vi.fn().mockResolvedValue("failed");
		const first = await reconcilePendingTips({ claim: async () => [row], verify: async () => "prepared_message_mismatch", finalize });
		const duplicate = await reconcilePendingTips({ claim: async () => [], finalize });

		expect(first).toMatchObject({ failed: 1, confirmed: 0 });
		expect(duplicate).toEqual({ claimed: 0, confirmed: 0, retried: 0, failed: 0 });
	});
});
