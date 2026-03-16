/**
 * Transfer Transaction Builder (server-only)
 * Builds SOL/USDC/SKR transfer transactions for wallet sends.
 * Allowlisted assets only — client passes asset key, server resolves mint/decimals.
 * This file should NEVER be imported from client code.
 */

import {
	Connection,
	PublicKey,
	SystemProgram,
	TransactionMessage,
	VersionedTransaction,
} from "@solana/web3.js";
import {
	ASSOCIATED_TOKEN_PROGRAM_ID,
	TOKEN_PROGRAM_ID,
	createAssociatedTokenAccountIdempotentInstruction,
	createTransferCheckedInstruction,
	getAssociatedTokenAddress,
} from "@solana/spl-token";
import { Buffer } from "buffer";
import { getHeliusRpcUrl } from "@/config/env";
import { validateAddress } from "@/server/services/blockchain/addressUtils";
import { USDC_MAINNET_MINT, SKR_MINT } from "@/constants/tokens";

export type SendableAsset = "sol" | "usdc" | "skr";

const SENDABLE_ASSETS: Record<
	SendableAsset,
	| { type: "native"; decimals: number }
	| { type: "spl"; mint: string; decimals: number }
> = {
	sol: { type: "native", decimals: 9 },
	usdc: { type: "spl", mint: USDC_MAINNET_MINT, decimals: 6 },
	skr: { type: "spl", mint: SKR_MINT, decimals: 6 },
} as const;

/**
 * Parse a human-readable amount string to base units with exact string math.
 * Rejects amounts with more decimal places than the asset supports.
 * "1.23" with decimals=6 → 1_230_000n
 * "1.2345678" with decimals=6 → REJECT (too many decimal places)
 */
export function parseTokenAmount(amountStr: string, decimals: number): bigint {
	let trimmed = amountStr.trim();

	// Handle exponential notation (e.g. "5e-7" from number inputs)
	if (/[eE]/.test(trimmed)) {
		const num = Number(trimmed);
		if (Number.isNaN(num) || num <= 0) {
			throw new Error("Invalid amount format");
		}
		// Convert to fixed-point string with enough precision
		trimmed = num.toFixed(decimals);
	}

	// Normalize: strip trailing dot ("1." → "1"), add leading zero (".5" → "0.5")
	if (trimmed.startsWith(".")) {
		trimmed = `0${trimmed}`;
	}
	if (trimmed.endsWith(".")) {
		trimmed = trimmed.slice(0, -1);
	}

	// Validate format: digits with optional decimal
	if (!/^\d+(\.\d+)?$/.test(trimmed)) {
		throw new Error("Invalid amount format");
	}

	const parts = trimmed.split(".");
	const wholePart = parts[0];
	const rawFrac = parts[1] || "";
	// Trim trailing zeros for precision check (toFixed may add them)
	const significantFrac = rawFrac.replace(/0+$/, "");

	if (significantFrac.length > decimals) {
		throw new Error(
			`Too many decimal places. Maximum ${decimals} allowed for this asset.`,
		);
	}

	// Pad fractional part to full decimals using the raw value
	const paddedFrac = rawFrac.slice(0, decimals).padEnd(decimals, "0");
	const raw = wholePart + paddedFrac;

	// Remove leading zeros but keep at least "0"
	const result = BigInt(raw);

	if (result <= 0n) {
		throw new Error("Amount must be greater than 0");
	}

	return result;
}

export interface TransferTransactionParams {
	from: string;
	to: string;
	amount: string;
	asset: SendableAsset;
}

export interface TransferTransactionResult {
	transactionBase64: string;
	blockhash: string;
	lastValidBlockHeight: number;
}

/**
 * Build a transfer transaction for the given asset.
 * SOL: SystemProgram.transfer
 * USDC/SKR: idempotent ATA creation + createTransferCheckedInstruction
 */
export async function buildTransferTransaction(
	params: TransferTransactionParams,
): Promise<TransferTransactionResult> {
	const rpcUrl = getHeliusRpcUrl();
	if (!rpcUrl) {
		throw new Error("RPC configuration missing");
	}

	// Validate asset
	const assetConfig = SENDABLE_ASSETS[params.asset];
	if (!assetConfig) {
		throw new Error(`Unsupported asset: ${params.asset}`);
	}

	// Validate addresses
	if (!validateAddress(params.from)) {
		throw new Error(`Invalid sender address: ${params.from}`);
	}
	if (!validateAddress(params.to)) {
		throw new Error("Invalid recipient address");
	}
	if (params.from === params.to) {
		throw new Error("Cannot send to yourself");
	}

	// Parse amount with exact string math
	const amountRaw = parseTokenAmount(params.amount, assetConfig.decimals);

	const connection = new Connection(rpcUrl, "confirmed");
	const sender = new PublicKey(params.from);
	const recipient = new PublicKey(params.to);

	// Get latest blockhash with retry
	const { retryWithBackoff } = await import("@/lib/retryUtils");
	const latestBlockhash = await retryWithBackoff(
		() => connection.getLatestBlockhash(),
		{ maxRetries: 3, baseDelayMs: 1000 },
	);

	const instructions = [];

	if (assetConfig.type === "native") {
		// SOL transfer
		instructions.push(
			SystemProgram.transfer({
				fromPubkey: sender,
				toPubkey: recipient,
				lamports: amountRaw,
			}),
		);
	} else {
		// SPL token transfer (USDC, SKR)
		const mintPubkey = new PublicKey(assetConfig.mint);

		const senderAta = await getAssociatedTokenAddress(
			mintPubkey,
			sender,
			false,
			TOKEN_PROGRAM_ID,
			ASSOCIATED_TOKEN_PROGRAM_ID,
		);
		const recipientAta = await getAssociatedTokenAddress(
			mintPubkey,
			recipient,
			false,
			TOKEN_PROGRAM_ID,
			ASSOCIATED_TOKEN_PROGRAM_ID,
		);

		// Ensure sender ATA exists
		instructions.push(
			createAssociatedTokenAccountIdempotentInstruction(
				sender,
				senderAta,
				sender,
				mintPubkey,
				TOKEN_PROGRAM_ID,
				ASSOCIATED_TOKEN_PROGRAM_ID,
			),
		);

		// Ensure recipient ATA exists (sender pays for creation)
		instructions.push(
			createAssociatedTokenAccountIdempotentInstruction(
				sender,
				recipientAta,
				recipient,
				mintPubkey,
				TOKEN_PROGRAM_ID,
				ASSOCIATED_TOKEN_PROGRAM_ID,
			),
		);

		// Checked transfer with on-chain decimals validation
		instructions.push(
			createTransferCheckedInstruction(
				senderAta,
				mintPubkey,
				recipientAta,
				sender,
				amountRaw,
				assetConfig.decimals,
				[],
				TOKEN_PROGRAM_ID,
			),
		);
	}

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
