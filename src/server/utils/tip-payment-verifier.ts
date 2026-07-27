import { createHash } from "node:crypto";
import { Buffer } from "buffer";
import bs58 from "bs58";
import { Connection } from "@solana/web3.js";
import { getHeliusRpcUrl } from "@/config/env";

export type TipVerificationCode =
	| "confirmed"
	| "confirmation_pending"
	| "blockhash_expired"
	| "transaction_failed"
	| "prepared_message_mismatch";

export interface PreparedTipEvidence {
	preparedMessageHash: string;
	preparedBlockhash: string;
	lastValidBlockHeight: number;
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
	connection: Pick<Connection, "getTransaction" | "getBlockHeight"> = new Connection(
		getHeliusRpcUrl(),
		"confirmed",
	),
): Promise<TipVerificationCode> {
	const transaction = await connection.getTransaction(signature, {
		commitment: "confirmed",
		maxSupportedTransactionVersion: 0,
	});

	if (!transaction) {
		const blockHeight = await connection.getBlockHeight("confirmed");
		return blockHeight > prepared.lastValidBlockHeight
			? "blockhash_expired"
			: "confirmation_pending";
	}
	if (transaction.meta?.err) return "transaction_failed";

	return verifyPreparedMessage(
		transaction.transaction.message.serialize(),
		transaction.transaction.message.recentBlockhash,
		prepared,
	);
}