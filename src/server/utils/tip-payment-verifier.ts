import { createHash } from "node:crypto";
import { Buffer } from "buffer";
import bs58 from "bs58";
import { Connection } from "@solana/web3.js";
import { getHeliusRpcUrl } from "@/config/env";

export type TipVerificationCode =
	| "confirmed"
	| "confirmation_pending"
	| "transaction_failed"
	| "prepared_message_mismatch";

export interface PreparedTipEvidence {
	preparedMessageHash: string;
	preparedBlockhash: string;
}

export function validateTransactionSignature(signature: string): boolean {
	try {
		return bs58.decode(signature).length === 64;
	} catch {
		return false;
	}
}

export function verifyPreparedMessage(
	messageBytes: Uint8Array,
	recentBlockhash: string,
	prepared: PreparedTipEvidence,
): TipVerificationCode {
	const messageHash = createHash("sha256")
		.update(Buffer.from(messageBytes))
		.digest("hex");

	return messageHash === prepared.preparedMessageHash &&
		recentBlockhash === prepared.preparedBlockhash
		? "confirmed"
		: "prepared_message_mismatch";
}

export async function verifyTipTransaction(
	signature: string,
	prepared: PreparedTipEvidence,
): Promise<TipVerificationCode> {
	const connection = new Connection(getHeliusRpcUrl(), "confirmed");
	const transaction = await connection.getTransaction(signature, {
		commitment: "confirmed",
		maxSupportedTransactionVersion: 0,
	});

	if (!transaction) return "confirmation_pending";
	if (transaction.meta?.err) return "transaction_failed";

	return verifyPreparedMessage(
		transaction.transaction.message.serialize(),
		transaction.transaction.message.recentBlockhash,
		prepared,
	);
}