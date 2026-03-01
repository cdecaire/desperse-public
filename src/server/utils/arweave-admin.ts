/**
 * Arweave Admin Recovery Tools
 *
 * Diagnostic and recovery utilities for Arweave permanent storage.
 * Used by admin scripts and internal tooling.
 */

import { db } from "@/server/db";
import { posts } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";

// ---------------------------------------------------------------------------
// 1. retryArweaveFinalization — manually trigger finalization for failed posts
// ---------------------------------------------------------------------------

export interface RetryFinalizationResult {
	success: boolean;
	metadataUrl?: string;
	status?: string;
	error?: string;
}

/**
 * Manually retry Arweave finalization for a post in 'failed' state.
 *
 * Validates the post exists, has storageType = 'arweave', and arweaveStatus = 'failed'.
 * Then delegates to finalizeArweaveAssets which handles the upload flow.
 */
export async function retryArweaveFinalization(
	postId: string,
): Promise<RetryFinalizationResult> {
	console.log(
		`[retryArweaveFinalization] Starting retry for post ${postId}`,
	);

	// Validate post exists and is in the correct state
	const [post] = await db
		.select({
			id: posts.id,
			storageType: posts.storageType,
			arweaveStatus: posts.arweaveStatus,
			creatorWallet: posts.creatorWallet,
		})
		.from(posts)
		.where(eq(posts.id, postId))
		.limit(1);

	if (!post) {
		return { success: false, error: "Post not found" };
	}

	if (post.storageType !== "arweave") {
		return {
			success: false,
			error: `Post is not configured for Arweave storage (storageType: ${post.storageType})`,
		};
	}

	if (post.arweaveStatus !== "failed") {
		return {
			success: false,
			error: `Post arweaveStatus is '${post.arweaveStatus}', expected 'failed'. Only failed posts can be retried.`,
		};
	}

	if (!post.creatorWallet) {
		return {
			success: false,
			error: "Post has no creatorWallet set. Cannot finalize without a creator wallet.",
		};
	}

	// Delegate to finalization service
	const { finalizeArweaveAssets } = await import(
		"@/server/services/arweave/first-mint-finalization"
	);

	const result = await finalizeArweaveAssets(postId, post.creatorWallet);

	console.log(
		`[retryArweaveFinalization] Result for post ${postId}: success=${result.success}, status=${result.status}`,
	);

	return {
		success: result.success,
		metadataUrl: result.metadataUrl,
		status: result.status,
		error: result.error,
	};
}

// ---------------------------------------------------------------------------
// 2. inspectArweaveState — full Arweave state for debugging
// ---------------------------------------------------------------------------

export interface ArweaveStateInspection {
	postId: string;
	storageType: string;
	arweaveStatus: string | null;
	arweaveMediaTxId: string | null;
	arweaveMetadataTxId: string | null;
	arweaveError: string | null;
	creatorWallet: string | null;
	nftName: string | null;
	currentSupply: number;
	maxSupply: number | null;
	createdAt: Date;
	updatedAt: Date;
	creditBalance?: {
		availableWinc: string;
		sufficient: boolean;
		expiresAt: Date | null;
	};
}

/**
 * Returns full Arweave state for a post, including creator credit balance
 * if the post uses Arweave storage.
 */
export async function inspectArweaveState(
	postId: string,
): Promise<{ success: boolean; data?: ArweaveStateInspection; error?: string }> {
	const [post] = await db
		.select({
			id: posts.id,
			storageType: posts.storageType,
			arweaveStatus: posts.arweaveStatus,
			arweaveMediaTxId: posts.arweaveMediaTxId,
			arweaveMetadataTxId: posts.arweaveMetadataTxId,
			arweaveError: posts.arweaveError,
			creatorWallet: posts.creatorWallet,
			nftName: posts.nftName,
			currentSupply: posts.currentSupply,
			maxSupply: posts.maxSupply,
			createdAt: posts.createdAt,
			updatedAt: posts.updatedAt,
		})
		.from(posts)
		.where(eq(posts.id, postId))
		.limit(1);

	if (!post) {
		return { success: false, error: "Post not found" };
	}

	const inspection: ArweaveStateInspection = {
		postId: post.id,
		storageType: post.storageType,
		arweaveStatus: post.arweaveStatus,
		arweaveMediaTxId: post.arweaveMediaTxId,
		arweaveMetadataTxId: post.arweaveMetadataTxId,
		arweaveError: post.arweaveError,
		creatorWallet: post.creatorWallet,
		nftName: post.nftName,
		currentSupply: post.currentSupply,
		maxSupply: post.maxSupply,
		createdAt: post.createdAt,
		updatedAt: post.updatedAt,
	};

	// If Arweave storage, also check creator's credit balance
	if (post.storageType === "arweave" && post.creatorWallet) {
		try {
			const { checkCreatorSharedBalance } = await import(
				"@/server/services/arweave/turbo-server"
			);
			const balance = await checkCreatorSharedBalance(
				post.creatorWallet,
			);
			inspection.creditBalance = {
				availableWinc: balance.availableWinc,
				sufficient: balance.sufficient,
				expiresAt: balance.expiresAt,
			};
		} catch (err) {
			console.warn(
				`[inspectArweaveState] Failed to check credit balance for post ${postId}:`,
				err instanceof Error ? err.message : "Unknown error",
			);
			// Continue without credit balance — still return post data
		}
	}

	return { success: true, data: inspection };
}

// ---------------------------------------------------------------------------
// 3. listFailedFinalizations — all posts with arweave_status = 'failed'
// ---------------------------------------------------------------------------

export interface FailedFinalization {
	id: string;
	nftName: string | null;
	arweaveStatus: string | null;
	arweaveError: string | null;
	creatorWallet: string | null;
	createdAt: Date;
}

/**
 * List all posts with arweave_status = 'failed', ordered by createdAt desc.
 * Limited to 100 results.
 */
export async function listFailedFinalizations(): Promise<{
	success: boolean;
	data: FailedFinalization[];
}> {
	const failedPosts = await db
		.select({
			id: posts.id,
			nftName: posts.nftName,
			arweaveStatus: posts.arweaveStatus,
			arweaveError: posts.arweaveError,
			creatorWallet: posts.creatorWallet,
			createdAt: posts.createdAt,
		})
		.from(posts)
		.where(
			and(
				eq(posts.storageType, "arweave"),
				eq(posts.arweaveStatus, "failed"),
			),
		)
		.orderBy(desc(posts.createdAt))
		.limit(100);

	console.log(
		`[listFailedFinalizations] Found ${failedPosts.length} failed Arweave finalizations`,
	);

	return { success: true, data: failedPosts };
}
