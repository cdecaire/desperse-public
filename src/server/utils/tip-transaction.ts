/**
 * Tip Transaction Builder (server-only)
 * Builds SPL token transfer transactions for Seeker (SKR) tips.
 * This file should NEVER be imported from client code.
 */

import {
	Connection,
	PublicKey,
	TransactionMessage,
	VersionedTransaction,
} from "@solana/web3.js";
import {
	ASSOCIATED_TOKEN_PROGRAM_ID,
	TOKEN_PROGRAM_ID,
	createAssociatedTokenAccountIdempotentInstruction,
	createTransferInstruction,
	getAssociatedTokenAddress,
} from "@solana/spl-token";
import { Buffer } from "buffer";
import { getHeliusRpcUrl } from "@/config/env";
import { validateAddress } from "@/server/services/blockchain/addressUtils";
import { SKR_MINT } from "@/constants/tokens";

const SKR_MINT_PUBKEY = new PublicKey(SKR_MINT);

// SKR has 6 decimals (like USDC)
export const SKR_DECIMALS = 6;

export interface TipTransactionParams {
	/** Sender wallet address */
	from: string;
	/** Recipient wallet address */
	to: string;
	/** Amount in raw token units (smallest denomination) */
	amount: bigint;
}

export interface TipTransactionResult {
	transactionBase64: string;
	blockhash: string;
	lastValidBlockHeight: number;
}

/**
 * Convert human-readable SKR amount to raw token units
 * e.g. 5.0 SKR -> 5_000_000_000n
 */
export function skrToRawAmount(amount: number): bigint {
	return BigInt(Math.round(amount * 10 ** SKR_DECIMALS));
}

/**
 * Convert raw token units to human-readable SKR amount
 * e.g. 5_000_000_000n -> 5.0
 */
export function rawAmountToSkr(amount: bigint): number {
	return Number(amount) / 10 ** SKR_DECIMALS;
}

/**
 * Build an SPL token transfer transaction for a Seeker tip.
 * The transaction is unsigned - the sender signs on the client.
 */
export async function buildTipTransaction(
	params: TipTransactionParams,
): Promise<TipTransactionResult> {
	const rpcUrl = getHeliusRpcUrl();
	if (!rpcUrl) {
		throw new Error(
			"HELIUS_API_KEY is required. Please set HELIUS_API_KEY environment variable.",
		);
	}

	// Validate addresses
	if (!validateAddress(params.from)) {
		throw new Error(`Invalid sender address: ${params.from}`);
	}
	if (!validateAddress(params.to)) {
		throw new Error(`Invalid recipient address: ${params.to}`);
	}
	if (params.from === params.to) {
		throw new Error("Cannot tip yourself");
	}
	if (params.amount <= 0n) {
		throw new Error("Tip amount must be greater than 0");
	}

	const connection = new Connection(rpcUrl, "confirmed");
	const sender = new PublicKey(params.from);
	const recipient = new PublicKey(params.to);

	// Get latest blockhash
	const { retryWithBackoff } = await import("@/lib/retryUtils");
	const latestBlockhash = await retryWithBackoff(
		() => connection.getLatestBlockhash(),
		{ maxRetries: 3, baseDelayMs: 1000 },
	);

	// Get associated token accounts for SKR
	const senderAta = await getAssociatedTokenAddress(
		SKR_MINT_PUBKEY,
		sender,
		false,
		TOKEN_PROGRAM_ID,
		ASSOCIATED_TOKEN_PROGRAM_ID,
	);
	const recipientAta = await getAssociatedTokenAddress(
		SKR_MINT_PUBKEY,
		recipient,
		false,
		TOKEN_PROGRAM_ID,
		ASSOCIATED_TOKEN_PROGRAM_ID,
	);

	const instructions = [];

	// Ensure sender ATA exists (should already exist if they have SKR)
	instructions.push(
		createAssociatedTokenAccountIdempotentInstruction(
			sender,
			senderAta,
			sender,
			SKR_MINT_PUBKEY,
			TOKEN_PROGRAM_ID,
			ASSOCIATED_TOKEN_PROGRAM_ID,
		),
	);

	// Ensure recipient ATA exists (creates it if needed, sender pays)
	instructions.push(
		createAssociatedTokenAccountIdempotentInstruction(
			sender,
			recipientAta,
			recipient,
			SKR_MINT_PUBKEY,
			TOKEN_PROGRAM_ID,
			ASSOCIATED_TOKEN_PROGRAM_ID,
		),
	);

	// Transfer SKR tokens
	instructions.push(
		createTransferInstruction(
			senderAta,
			recipientAta,
			sender,
			params.amount,
			[],
			TOKEN_PROGRAM_ID,
		),
	);

	// Build versioned transaction (unsigned)
	const messageV0 = new TransactionMessage({
		payerKey: sender,
		recentBlockhash: latestBlockhash.blockhash,
		instructions,
	}).compileToV0Message();

	const transaction = new VersionedTransaction(messageV0);
	const serialized = transaction.serialize();

	return {
		transactionBase64: Buffer.from(serialized).toString("base64"),
		blockhash: latestBlockhash.blockhash,
		lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
	};
}
