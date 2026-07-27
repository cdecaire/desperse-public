import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import bs58 from "bs58";
import {
	validateTransactionSignature,
	verifyPreparedMessage,
	verifyTipTransaction,
} from "./tip-payment-verifier";

describe("tip payment verifier", () => {
	it("fails a missing transaction once its prepared blockhash expires", async () => {
		const prepared = {
			preparedMessageHash: "hash",
			preparedBlockhash: "prepared-blockhash",
			lastValidBlockHeight: 100,
		};
		const rpc = {
			getTransaction: async () => null,
			getBlockHeight: async () => 101,
		};

		await expect(verifyTipTransaction("signature", prepared, rpc as never)).resolves.toBe(
			"blockhash_expired",
		);
	});

	it("keeps retrying a missing transaction while its blockhash is still valid", async () => {
		const prepared = {
			preparedMessageHash: "hash",
			preparedBlockhash: "prepared-blockhash",
			lastValidBlockHeight: 100,
		};
		const rpc = {
			getTransaction: async () => null,
			getBlockHeight: async () => 100,
		};

		await expect(verifyTipTransaction("signature", prepared, rpc as never)).resolves.toBe(
			"confirmation_pending",
		);
	});

	it("accepts only 64-byte base58 signatures", () => {
		expect(validateTransactionSignature(bs58.encode(new Uint8Array(64)))).toBe(true);
		expect(validateTransactionSignature(bs58.encode(new Uint8Array(63)))).toBe(false);
		expect(validateTransactionSignature("not base58!")).toBe(false);
	});

	it("confirms only the exact prepared message and blockhash", () => {
		const message = new Uint8Array([1, 2, 3]);
		const prepared = {
			preparedMessageHash: createHash("sha256").update(message).digest("hex"),
			preparedBlockhash: "prepared-blockhash",
			lastValidBlockHeight: 100,
		};

		expect(verifyPreparedMessage(message, "prepared-blockhash", prepared)).toBe(
			"confirmed",
		);
		expect(verifyPreparedMessage(new Uint8Array([1, 2, 4]), "prepared-blockhash", prepared)).toBe(
			"prepared_message_mismatch",
		);
		expect(verifyPreparedMessage(message, "replacement-blockhash", prepared)).toBe(
			"prepared_message_mismatch",
		);
	});

	it.each([
		["spoofed sender", new Uint8Array([9, 2, 3])],
		["changed recipient", new Uint8Array([1, 9, 3])],
		["unrelated transfer", new Uint8Array([1, 2, 9])],
	])("rejects a %s transaction because it is not the prepared message", (_name, transactionMessage) => {
		const preparedMessage = new Uint8Array([1, 2, 3]);
		const prepared = {
			preparedMessageHash: createHash("sha256")
				.update(preparedMessage)
				.digest("hex"),
			preparedBlockhash: "prepared-blockhash",
			lastValidBlockHeight: 100,
		};

		expect(
			verifyPreparedMessage(
				transactionMessage,
				"prepared-blockhash",
				prepared,
			),
		).toBe("prepared_message_mismatch");
	});
});