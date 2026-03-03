/**
 * Arweave Credit Sharing — Server-side ANS-104 data item construction.
 *
 * Android cannot use the Turbo SDK, so the server acts as a proxy:
 *   1. prepare — build unsigned data item, compute deep hash, return to client
 *   2. submit  — inject client's Ed25519 signature, upload to Turbo
 *
 * The signed data item format follows the ANS-104 spec:
 *   https://github.com/ArweaveTeam/arweave-standards/blob/master/ans/ANS-104.md
 *
 * Tag names match the Turbo SDK's internal credit-sharing tag names:
 *   shareCredits:   'x-approve-payment'  +  'x-amount'  (+  'x-expires-seconds')
 *   revokeCredits:  'x-delete-payment-approval'
 */

import { createHash, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import bs58 from "bs58";
import { env } from "@/config/env";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Solana signature type in ANS-104 */
const SIGNATURE_TYPE_SOLANA = 4;
const SIGNATURE_LENGTH = 64;
const OWNER_LENGTH = 32;

/** Session token validity (5 minutes) */
const SESSION_TTL_MS = 5 * 60 * 1000;

const DESPERSE_TURBO_WALLET = env.DESPERSE_TURBO_WALLET;

/** Default credit approval expiration: 90 days in seconds */
const DEFAULT_EXPIRES_SECONDS = 90 * 24 * 60 * 60;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Tag {
	name: string;
	value: string;
}

interface SessionPayload {
	type: "share" | "revoke";
	walletAddress: string;
	userId: string;
	wincAmount?: string;
	nonce: string;
	createdAt: number;
}

export interface PrepareResult {
	sessionToken: string;
	deepHashBase64: string;
}

export interface ShareSubmitResult {
	approvalDataItemId: string;
	approvedWincAmount: string;
}

export interface RevokeSubmitResult {
	success: boolean;
}

// ---------------------------------------------------------------------------
// 1. Avro Tag Serialization (ANS-104 format)
// ---------------------------------------------------------------------------

/**
 * Serialize tags using the Apache Avro binary encoding used by ANS-104.
 * Format: zigzag-varint count, then for each tag: varint name-len, name bytes,
 * varint value-len, value bytes. Terminated by a 0 byte.
 */
function serializeAvroTags(tags: Tag[]): Buffer {
	const parts: Buffer[] = [];

	// Avro array: write block count (positive = inline block)
	parts.push(encodeZigzagVarint(tags.length));

	for (const tag of tags) {
		const nameBytes = Buffer.from(tag.name, "utf-8");
		const valueBytes = Buffer.from(tag.value, "utf-8");
		parts.push(encodeZigzagVarint(nameBytes.length));
		parts.push(nameBytes);
		parts.push(encodeZigzagVarint(valueBytes.length));
		parts.push(valueBytes);
	}

	// Avro array terminator
	parts.push(Buffer.from([0]));

	return Buffer.concat(parts);
}

/** Encode a non-negative integer as a zigzag varint (Avro encoding). */
function encodeZigzagVarint(n: number): Buffer {
	// Zigzag encode: (n << 1) ^ (n >> 31)
	let zigzag = (n << 1) ^ (n >> 31);
	const bytes: number[] = [];
	// biome-ignore lint/suspicious/noAssignInExpressions: varint encoding loop
	do { bytes.push((zigzag & 0x7f) | (zigzag > 0x7f ? 0x80 : 0)); } while ((zigzag >>>= 7) > 0);
	return Buffer.from(bytes);
}

// ---------------------------------------------------------------------------
// 2. Deep Hash (SHA-384 recursive tree hash)
// ---------------------------------------------------------------------------

/**
 * Compute the ANS-104 / Arweave deep hash.
 * - For an array: fold left with SHA-384(acc || deepHash(item)), starting from SHA-384("list" + count)
 * - For a buffer: SHA-384(SHA-384("blob" + length) || SHA-384(data))
 */
async function deepHash(data: Buffer | Buffer[]): Promise<Buffer> {
	if (Array.isArray(data)) {
		const tag = Buffer.concat([
			Buffer.from("list", "utf-8"),
			Buffer.from(data.length.toString(), "utf-8"),
		]);
		let acc = sha384(tag);

		for (const item of data) {
			const itemHash = await deepHash(item);
			acc = sha384(Buffer.concat([acc, itemHash]));
		}

		return acc;
	}

	// Single buffer (blob)
	const tag = Buffer.concat([
		Buffer.from("blob", "utf-8"),
		Buffer.from(data.length.toString(), "utf-8"),
	]);
	return sha384(Buffer.concat([sha384(tag), sha384(data)]));
}

function sha384(data: Buffer): Buffer {
	return createHash("sha384").update(data).digest();
}

// ---------------------------------------------------------------------------
// 3. ANS-104 Data Item Construction
// ---------------------------------------------------------------------------

/**
 * Compute the deep hash for an ANS-104 data item (what gets signed).
 * Signature type 4 (Solana) uses hex encoding before signing.
 */
async function computeSignatureData(
	ownerPublicKey: Buffer,
	tags: Tag[],
	dataPayload: Buffer,
): Promise<Buffer> {
	const rawTags = serializeAvroTags(tags);

	const hash = await deepHash([
		Buffer.from("dataitem", "utf-8"),
		Buffer.from("1", "utf-8"), // version
		Buffer.from(SIGNATURE_TYPE_SOLANA.toString(), "utf-8"),
		ownerPublicKey,
		Buffer.alloc(0), // target (empty — no target)
		Buffer.alloc(0), // anchor (empty)
		rawTags,
		dataPayload,
	]);

	return hash;
}

/**
 * Build the full binary ANS-104 data item with signature inserted.
 *
 * Binary layout:
 *   [2B LE sig type] [64B signature] [32B owner]
 *   [1B target flag=0] [1B anchor flag=0]
 *   [8B LE tag count] [8B LE tag bytes length]
 *   [N bytes serialized tags]
 *   [M bytes data]
 */
function buildDataItemBinary(
	signature: Buffer,
	ownerPublicKey: Buffer,
	tags: Tag[],
	dataPayload: Buffer,
): Buffer {
	const rawTags = serializeAvroTags(tags);

	// Signature type (2 bytes little-endian)
	const sigTypeBuf = Buffer.alloc(2);
	sigTypeBuf.writeUInt16LE(SIGNATURE_TYPE_SOLANA);

	// Target and anchor flags (both absent)
	const targetFlag = Buffer.from([0]);
	const anchorFlag = Buffer.from([0]);

	// Number of tags (8 bytes LE)
	const tagCountBuf = Buffer.alloc(8);
	tagCountBuf.writeBigUInt64LE(BigInt(tags.length));

	// Tag bytes length (8 bytes LE)
	const tagBytesBuf = Buffer.alloc(8);
	tagBytesBuf.writeBigUInt64LE(BigInt(rawTags.length));

	return Buffer.concat([
		sigTypeBuf,
		signature,
		ownerPublicKey,
		targetFlag,
		anchorFlag,
		tagCountBuf,
		tagBytesBuf,
		rawTags,
		dataPayload,
	]);
}

// ---------------------------------------------------------------------------
// 4. Encrypted Stateless Session Tokens (AES-256-GCM)
// ---------------------------------------------------------------------------

/** Derive a 32-byte AES key from the Turbo server private key. */
function getSessionKey(): Buffer {
	const secret = env.TURBO_SERVER_PRIVATE_KEY;
	if (!secret) throw new Error("TURBO_SERVER_PRIVATE_KEY not configured");
	return createHash("sha256")
		.update(`arweave-session:${secret}`)
		.digest();
}

function encryptSession(payload: SessionPayload): string {
	const key = getSessionKey();
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", key, iv);
	const json = JSON.stringify(payload);
	const encrypted = Buffer.concat([
		cipher.update(json, "utf-8"),
		cipher.final(),
	]);
	const authTag = cipher.getAuthTag();
	// Format: base64(iv + authTag + ciphertext)
	return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

function decryptSession(token: string): SessionPayload {
	const key = getSessionKey();
	const raw = Buffer.from(token, "base64");
	if (raw.length < 28) throw new Error("Invalid session token");

	const iv = raw.subarray(0, 12);
	const authTag = raw.subarray(12, 28);
	const ciphertext = raw.subarray(28);

	const decipher = createDecipheriv("aes-256-gcm", key, iv);
	decipher.setAuthTag(authTag);
	const decrypted = Buffer.concat([
		decipher.update(ciphertext),
		decipher.final(),
	]);

	const payload = JSON.parse(decrypted.toString("utf-8")) as SessionPayload;

	// Check expiry
	if (Date.now() - payload.createdAt > SESSION_TTL_MS) {
		throw new Error("Session token expired");
	}

	return payload;
}

// ---------------------------------------------------------------------------
// 5. Upload Signed Data Item to Turbo
// ---------------------------------------------------------------------------

async function uploadDataItemToTurbo(dataItem: Buffer): Promise<Record<string, unknown>> {
	const uploadUrl = env.TURBO_UPLOAD_URL || "https://upload.ardrive.io";
	const url = `${uploadUrl}/v1/tx/solana`;

	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/octet-stream" },
		body: new Uint8Array(dataItem),
	});

	if (!response.ok) {
		const text = await response.text().catch(() => "");
		throw new Error(
			`Turbo upload failed (${response.status}): ${text.slice(0, 200)}`,
		);
	}

	return (await response.json()) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// 6. Public API — Prepare & Submit
// ---------------------------------------------------------------------------

/**
 * Prepare a share-credits data item for signing by the user's wallet.
 *
 * @param walletAddress - The user's Solana wallet address (base58)
 * @param userId        - The authenticated user ID (bound to session)
 * @param wincAmount    - Amount of winc to share
 * @returns Session token and deep hash (hex-encoded, as bytes, base64-wrapped) for signing
 */
export async function prepareShareCredits(
	walletAddress: string,
	userId: string,
	wincAmount: string,
): Promise<PrepareResult> {
	if (!DESPERSE_TURBO_WALLET) {
		throw new Error("DESPERSE_TURBO_WALLET not configured");
	}

	const ownerPubkey = Buffer.from(bs58.decode(walletAddress));
	if (ownerPubkey.length !== OWNER_LENGTH) {
		throw new Error("Invalid wallet address");
	}

	// Build tags matching Turbo SDK credit-sharing tag names
	const tags: Tag[] = [
		{ name: "x-approve-payment", value: DESPERSE_TURBO_WALLET },
		{ name: "x-amount", value: wincAmount },
		{ name: "x-expires-seconds", value: DEFAULT_EXPIRES_SECONDS.toString() },
	];

	// Nonce data = approvedAddress + wincAmount + timestamp (matches Turbo SDK)
	const timestamp = Date.now();
	const nonce = `${DESPERSE_TURBO_WALLET}${wincAmount}${timestamp}`;
	const dataPayload = Buffer.from(nonce, "utf-8");

	// Compute deep hash
	const rawDeepHash = await computeSignatureData(ownerPubkey, tags, dataPayload);

	// Solana signature type 4 uses hex encoding before signing
	const hexEncoded = Buffer.from(rawDeepHash.toString("hex"), "utf-8");

	// Encrypt session state
	const sessionToken = encryptSession({
		type: "share",
		walletAddress,
		userId,
		wincAmount,
		nonce,
		createdAt: timestamp,
	});

	return {
		sessionToken,
		deepHashBase64: hexEncoded.toString("base64"),
	};
}

/**
 * Prepare a revoke-credits data item for signing by the user's wallet.
 */
export async function prepareRevokeCredits(
	walletAddress: string,
	userId: string,
): Promise<PrepareResult> {
	if (!DESPERSE_TURBO_WALLET) {
		throw new Error("DESPERSE_TURBO_WALLET not configured");
	}

	const ownerPubkey = Buffer.from(bs58.decode(walletAddress));
	if (ownerPubkey.length !== OWNER_LENGTH) {
		throw new Error("Invalid wallet address");
	}

	const tags: Tag[] = [
		{ name: "x-delete-payment-approval", value: DESPERSE_TURBO_WALLET },
	];

	const timestamp = Date.now();
	const nonce = `${DESPERSE_TURBO_WALLET}${timestamp}`;
	const dataPayload = Buffer.from(nonce, "utf-8");

	const rawDeepHash = await computeSignatureData(ownerPubkey, tags, dataPayload);
	const hexEncoded = Buffer.from(rawDeepHash.toString("hex"), "utf-8");

	const sessionToken = encryptSession({
		type: "revoke",
		walletAddress,
		userId,
		nonce,
		createdAt: timestamp,
	});

	return {
		sessionToken,
		deepHashBase64: hexEncoded.toString("base64"),
	};
}

/**
 * Submit a signed data item to Turbo.
 *
 * Reconstructs the data item from the session token, injects the signature,
 * and uploads to the Turbo upload service.
 *
 * @param sessionToken    - Encrypted session token from prepare step
 * @param signatureBase64 - Base64-encoded Ed25519 signature from the user's wallet
 * @param userId          - Authenticated user ID (must match session)
 * @returns Upload result from Turbo
 */
export async function submitSignedShareCredits(
	sessionToken: string,
	signatureBase64: string,
	userId: string,
): Promise<ShareSubmitResult> {
	const session = decryptSession(sessionToken);

	// Verify session ownership
	if (session.userId !== userId) {
		throw new Error("Session does not belong to this user");
	}
	if (session.type !== "share") {
		throw new Error("Invalid session type");
	}

	const signature = Buffer.from(signatureBase64, "base64");
	if (signature.length !== SIGNATURE_LENGTH) {
		throw new Error(`Invalid signature length: expected ${SIGNATURE_LENGTH}, got ${signature.length}`);
	}

	const ownerPubkey = Buffer.from(bs58.decode(session.walletAddress));

	const tags: Tag[] = [
		{ name: "x-approve-payment", value: DESPERSE_TURBO_WALLET },
		{ name: "x-amount", value: session.wincAmount! },
		{ name: "x-expires-seconds", value: DEFAULT_EXPIRES_SECONDS.toString() },
	];

	const dataPayload = Buffer.from(session.nonce, "utf-8");

	const dataItem = buildDataItemBinary(signature, ownerPubkey, tags, dataPayload);
	const result = await uploadDataItemToTurbo(dataItem);

	// Extract approval from Turbo response
	const createdApproval = result.createdApproval as Record<string, unknown> | undefined;

	return {
		approvalDataItemId: (createdApproval?.approvalDataItemId as string) ?? (result.id as string) ?? "",
		approvedWincAmount: session.wincAmount!,
	};
}

export async function submitSignedRevokeCredits(
	sessionToken: string,
	signatureBase64: string,
	userId: string,
): Promise<RevokeSubmitResult> {
	const session = decryptSession(sessionToken);

	if (session.userId !== userId) {
		throw new Error("Session does not belong to this user");
	}
	if (session.type !== "revoke") {
		throw new Error("Invalid session type");
	}

	const signature = Buffer.from(signatureBase64, "base64");
	if (signature.length !== SIGNATURE_LENGTH) {
		throw new Error(`Invalid signature length: expected ${SIGNATURE_LENGTH}, got ${signature.length}`);
	}

	const ownerPubkey = Buffer.from(bs58.decode(session.walletAddress));

	const tags: Tag[] = [
		{ name: "x-delete-payment-approval", value: DESPERSE_TURBO_WALLET },
	];

	const dataPayload = Buffer.from(session.nonce, "utf-8");

	const dataItem = buildDataItemBinary(signature, ownerPubkey, tags, dataPayload);
	await uploadDataItemToTurbo(dataItem);

	return { success: true };
}
