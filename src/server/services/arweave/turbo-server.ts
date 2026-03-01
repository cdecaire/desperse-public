/**
 * Server-side Turbo client for Arweave permanent storage uploads.
 *
 * Uses @ardrive/turbo-sdk with a Solana keypair (TURBO_SERVER_PRIVATE_KEY)
 * to authenticate uploads and manage credit sharing with creators.
 *
 * This file lives in src/server/services/ — it may freely import Node APIs,
 * env config, and third-party server SDKs.
 */

import { TurboFactory } from "@ardrive/turbo-sdk";
import type {
	TurboAuthenticatedClientInterface,
	TurboPriceResponse,
} from "@ardrive/turbo-sdk";
import { env } from "@/config/env";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Upload timeout in milliseconds (60 seconds) */
const UPLOAD_TIMEOUT_MS = 60_000;

/**
 * Minimum winc balance we consider "sufficient" for a creator to cover
 * a typical upload. 100_000_000 winc ~ a few hundred KB of data.
 */
const MIN_SUFFICIENT_WINC = "100000000";

// ---------------------------------------------------------------------------
// 1. Singleton Turbo Client
// ---------------------------------------------------------------------------

let turboInstance: TurboAuthenticatedClientInterface | null = null;

/**
 * Returns a singleton authenticated Turbo client backed by the platform
 * Solana keypair (`TURBO_SERVER_PRIVATE_KEY`).
 *
 * The keypair is a base58-encoded Solana secret key stored in env.
 */
export function getTurboClient(): TurboAuthenticatedClientInterface {
	if (!turboInstance) {
		const privateKey = env.TURBO_SERVER_PRIVATE_KEY;
		if (!privateKey) {
			throw new Error(
				"[ArweaveTurbo] TURBO_SERVER_PRIVATE_KEY is not configured. " +
					"Arweave uploads are unavailable.",
			);
		}

		turboInstance = TurboFactory.authenticated({
			privateKey,
			token: "solana",
			...(env.TURBO_PAYMENT_URL && {
				paymentServiceConfig: { url: env.TURBO_PAYMENT_URL },
			}),
			...(env.TURBO_UPLOAD_URL && {
				uploadServiceConfig: { url: env.TURBO_UPLOAD_URL },
			}),
		});

		console.log("[ArweaveTurbo] Authenticated Turbo client initialized");
	}

	return turboInstance;
}

// ---------------------------------------------------------------------------
// 2. Upload media (from Vercel Blob URL) to Arweave
// ---------------------------------------------------------------------------

/**
 * Fetches media from a Vercel Blob URL and uploads it to Arweave via Turbo.
 *
 * @param blobUrl    - The source URL (typically a Vercel Blob URL)
 * @param contentType - MIME type of the media (e.g. "image/jpeg")
 * @param paidBy     - Solana wallet address whose shared credits should be charged
 * @returns The Arweave transaction ID
 */
export async function uploadMediaToArweave(
	blobUrl: string,
	contentType: string,
	paidBy: string,
): Promise<{ txId: string }> {
	const turbo = getTurboClient();

	console.log(
		`[ArweaveTurbo] Uploading media to Arweave — contentType=${contentType}, paidBy=${paidBy.slice(0, 8)}...`,
	);

	// Fetch original media
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

	try {
		const response = await fetch(blobUrl, { signal: controller.signal });
		if (!response.ok) {
			throw new Error(
				`[ArweaveTurbo] Failed to fetch media from blob URL: HTTP ${response.status}`,
			);
		}

		const arrayBuffer = await response.arrayBuffer();
		const data = Buffer.from(arrayBuffer);

		console.log(
			`[ArweaveTurbo] Fetched ${data.length} bytes from blob URL`,
		);

		// Upload to Arweave
		const uploadResult = await turbo.upload({
			data,
			dataItemOpts: {
				tags: [{ name: "Content-Type", value: contentType }],
				paidBy,
			},
			signal: controller.signal,
		});

		console.log(
			`[ArweaveTurbo] Media uploaded successfully — txId=${uploadResult.id}`,
		);

		return { txId: uploadResult.id };
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			console.error(
				"[ArweaveTurbo] Media upload timed out after 60 seconds",
			);
			throw new Error(
				"[ArweaveTurbo] Upload timed out — the file may be too large or the network is slow",
			);
		}
		console.error(
			"[ArweaveTurbo] Media upload failed:",
			error instanceof Error ? error.message : "Unknown error",
		);
		throw error;
	} finally {
		clearTimeout(timeout);
	}
}

// ---------------------------------------------------------------------------
// 3. Upload JSON metadata to Arweave
// ---------------------------------------------------------------------------

/**
 * Uploads a JSON metadata object to Arweave via Turbo.
 *
 * @param metadata - Arbitrary JSON-serializable object (e.g. NFT metadata)
 * @param paidBy   - Solana wallet address whose shared credits should be charged
 * @returns The Arweave transaction ID
 */
export async function uploadMetadataToArweave(
	metadata: Record<string, unknown>,
	paidBy: string,
): Promise<{ txId: string }> {
	const turbo = getTurboClient();

	console.log(
		`[ArweaveTurbo] Uploading metadata to Arweave — paidBy=${paidBy.slice(0, 8)}...`,
	);

	const jsonString = JSON.stringify(metadata);
	const data = Buffer.from(jsonString, "utf-8");

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

	try {
		const uploadResult = await turbo.upload({
			data,
			dataItemOpts: {
				tags: [{ name: "Content-Type", value: "application/json" }],
				paidBy,
			},
			signal: controller.signal,
		});

		console.log(
			`[ArweaveTurbo] Metadata uploaded successfully — txId=${uploadResult.id}, size=${data.length} bytes`,
		);

		return { txId: uploadResult.id };
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			console.error(
				"[ArweaveTurbo] Metadata upload timed out after 60 seconds",
			);
			throw new Error(
				"[ArweaveTurbo] Metadata upload timed out",
			);
		}
		console.error(
			"[ArweaveTurbo] Metadata upload failed:",
			error instanceof Error ? error.message : "Unknown error",
		);
		throw error;
	} finally {
		clearTimeout(timeout);
	}
}

// ---------------------------------------------------------------------------
// 4. Estimate upload costs
// ---------------------------------------------------------------------------

/**
 * Returns real-time Turbo upload cost estimates for one or more file sizes.
 *
 * @param bytes - Array of file sizes in bytes to estimate
 * @returns Combined cost in winc and approximate USD equivalent
 */
export async function estimateUploadCost(
	bytes: number[],
): Promise<{ winc: string; usd: number }> {
	const turbo = getTurboClient();

	console.log(
		`[ArweaveTurbo] Estimating upload cost for ${bytes.length} item(s): [${bytes.join(", ")}] bytes`,
	);

	try {
		const costs: TurboPriceResponse[] = await turbo.getUploadCosts({
			bytes,
		});

		// Sum up the total winc across all items
		let totalWinc = BigInt(0);
		for (const cost of costs) {
			totalWinc += BigInt(cost.winc);
		}

		// Convert winc to USD estimate
		// 1 AR = 1e12 winc; use fiat rates for a more precise conversion
		const fiatRates = await turbo.getFiatRates();
		const usdRate = fiatRates.fiat.usd;
		// winc → AR → USD
		const arAmount = Number(totalWinc) / 1e12;
		const usd = arAmount * usdRate;

		console.log(
			`[ArweaveTurbo] Estimated cost: ${totalWinc.toString()} winc (~$${usd.toFixed(4)} USD)`,
		);

		return {
			winc: totalWinc.toString(),
			usd: Math.round(usd * 10000) / 10000, // 4 decimal places
		};
	} catch (error) {
		console.error(
			"[ArweaveTurbo] Failed to estimate upload cost:",
			error instanceof Error ? error.message : "Unknown error",
		);
		throw error;
	}
}

// ---------------------------------------------------------------------------
// 5. Check creator shared balance
// ---------------------------------------------------------------------------

/**
 * Checks whether a creator has shared sufficient Turbo credits with the
 * Desperse platform wallet for uploads.
 *
 * @param creatorWallet - The creator's Solana wallet address
 * @returns Available shared winc, sufficiency flag, and expiration date
 */
export async function checkCreatorSharedBalance(
	creatorWallet: string,
): Promise<{
	availableWinc: string;
	sufficient: boolean;
	expiresAt: Date | null;
}> {
	const turbo = getTurboClient();
	const desperseWallet = env.DESPERSE_TURBO_WALLET;

	if (!desperseWallet) {
		console.error(
			"[ArweaveTurbo] DESPERSE_TURBO_WALLET is not configured — cannot check shared balance",
		);
		return {
			availableWinc: "0",
			sufficient: false,
			expiresAt: null,
		};
	}

	console.log(
		`[ArweaveTurbo] Checking shared balance from creator ${creatorWallet.slice(0, 8)}... to platform ${desperseWallet.slice(0, 8)}...`,
	);

	try {
		const approvals = await turbo.getCreditShareApprovals({
			userAddress: creatorWallet,
		});

		// Find approvals given by this creator TO the Desperse platform wallet
		const relevantApprovals = approvals.givenApprovals.filter(
			(a) =>
				a.approvedAddress.toLowerCase() ===
				desperseWallet.toLowerCase(),
		);

		if (relevantApprovals.length === 0) {
			console.log(
				`[ArweaveTurbo] No shared credit approvals found from creator ${creatorWallet.slice(0, 8)}...`,
			);
			return {
				availableWinc: "0",
				sufficient: false,
				expiresAt: null,
			};
		}

		// Sum available winc across all relevant approvals (approved - used)
		let totalAvailableWinc = BigInt(0);
		let earliestExpiration: Date | null = null;

		for (const approval of relevantApprovals) {
			const approved = BigInt(approval.approvedWincAmount);
			const used = BigInt(approval.usedWincAmount);
			const remaining = approved - used;

			if (remaining > BigInt(0)) {
				totalAvailableWinc += remaining;
			}

			// Track the earliest expiration among active approvals
			if (approval.expirationDate) {
				const expDate = new Date(approval.expirationDate);
				if (!earliestExpiration || expDate < earliestExpiration) {
					earliestExpiration = expDate;
				}
			}
		}

		const sufficient =
			totalAvailableWinc >= BigInt(MIN_SUFFICIENT_WINC);

		console.log(
			`[ArweaveTurbo] Creator shared balance: ${totalAvailableWinc.toString()} winc, sufficient=${sufficient}`,
		);

		return {
			availableWinc: totalAvailableWinc.toString(),
			sufficient,
			expiresAt: earliestExpiration,
		};
	} catch (error) {
		console.error(
			"[ArweaveTurbo] Failed to check creator shared balance:",
			error instanceof Error ? error.message : "Unknown error",
		);
		throw error;
	}
}

// ---------------------------------------------------------------------------
// Internal: Reset singleton (for testing)
// ---------------------------------------------------------------------------

/** @internal Reset the cached Turbo client instance. */
export function resetTurboClient(): void {
	turboInstance = null;
}
