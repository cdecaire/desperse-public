/**
 * First-mint finalization service for Arweave editions
 *
 * When a collector buys the first edition of an Arweave-enabled post,
 * this service uploads canonical media + metadata to Arweave before minting.
 *
 * State machine: funded → uploading → uploaded (or → failed → uploading → uploaded)
 * See CLAUDE.md plan for full state diagram.
 */

import { db } from "@/server/db"
import { posts, postAssets } from "@/server/db/schema"
import { eq, and, asc } from "drizzle-orm"
import { sql } from "drizzle-orm"
import { arweaveTxIdToUrl } from "@/lib/imageUrl"
import { generateNftMetadata } from "@/server/utils/nft-metadata"
import { stringsToCategories } from "@/constants/categories"

export interface FinalizationResult {
	success: boolean
	metadataUrl?: string
	status?: "uploaded" | "in_progress" | "unfunded" | "failed"
	error?: string
}

/**
 * Finalize Arweave assets for a post (first-mint trigger).
 *
 * Idempotent: if already uploaded, returns immediately.
 * Concurrent-safe: uses atomic UPDATE WHERE to acquire lock.
 * Partial-failure-safe: persists media tx ID before metadata upload.
 */
export async function finalizeArweaveAssets(
	postId: string,
	creatorWallet: string,
): Promise<FinalizationResult> {
	console.log(`[finalizeArweaveAssets] Starting for post ${postId}`)

	// Step 1: Read current state
	const [postData] = await db
		.select({
			id: posts.id,
			userId: posts.userId,
			arweaveStatus: posts.arweaveStatus,
			arweaveMediaTxId: posts.arweaveMediaTxId,
			arweaveMetadataTxId: posts.arweaveMetadataTxId,
			mediaUrl: posts.mediaUrl,
			coverUrl: posts.coverUrl,
			caption: posts.caption,
			type: posts.type,
			maxSupply: posts.maxSupply,
			price: posts.price,
			currency: posts.currency,
			nftName: posts.nftName,
			nftSymbol: posts.nftSymbol,
			nftDescription: posts.nftDescription,
			sellerFeeBasisPoints: posts.sellerFeeBasisPoints,
			isMutable: posts.isMutable,
			categories: posts.categories,
			storageType: posts.storageType,
		})
		.from(posts)
		.where(eq(posts.id, postId))
		.limit(1)

	if (!postData) {
		return { success: false, status: "failed", error: "Post not found" }
	}

	// Idempotent: already uploaded
	if (postData.arweaveStatus === "uploaded" && postData.arweaveMetadataTxId) {
		console.log(`[finalizeArweaveAssets] Already uploaded for post ${postId}`)
		return {
			success: true,
			status: "uploaded",
			metadataUrl: arweaveTxIdToUrl(postData.arweaveMetadataTxId),
		}
	}

	// Another process is uploading
	if (postData.arweaveStatus === "uploading") {
		console.log(`[finalizeArweaveAssets] Upload in progress by another process for post ${postId}`)
		return { success: false, status: "in_progress" }
	}

	// Not an Arweave post
	if (postData.storageType !== "arweave") {
		return { success: false, status: "failed", error: "Post is not configured for Arweave storage" }
	}

	// Step 2: Acquire lock atomically — only from 'funded' or 'failed' states
	const lockResult = await db
		.update(posts)
		.set({
			arweaveStatus: "uploading",
			arweaveError: null,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(posts.id, postId),
				sql`${posts.arweaveStatus} IN ('funded', 'failed')`,
			),
		)
		.returning({ id: posts.id })

	if (lockResult.length === 0) {
		// Could not acquire lock — unexpected state or race condition
		console.warn(`[finalizeArweaveAssets] Failed to acquire lock for post ${postId}, current status: ${postData.arweaveStatus}`)
		return {
			success: false,
			status: postData.arweaveStatus === "unfunded" ? "unfunded" : "failed",
			error: `Cannot finalize: post is in '${postData.arweaveStatus}' state`,
		}
	}

	console.log(`[finalizeArweaveAssets] Lock acquired for post ${postId}`)

	try {
		// Step 3: Dynamically import Turbo service (avoids circular deps)
		const { uploadMediaToArweave, uploadMetadataToArweave, checkCreatorSharedBalance } = await import(
			"@/server/services/arweave/turbo-server"
		)

		// Step 4: Re-check creator's shared credits
		const creditCheck = await checkCreatorSharedBalance(creatorWallet)
		if (!creditCheck.sufficient) {
			console.warn(`[finalizeArweaveAssets] Insufficient credits for post ${postId}, creator: ${creatorWallet.slice(0, 8)}...`)
			await db
				.update(posts)
				.set({ arweaveStatus: "unfunded", updatedAt: new Date() })
				.where(eq(posts.id, postId))

			return {
				success: false,
				status: "unfunded",
				error: "Creator has insufficient Arweave storage credits",
			}
		}

		// Step 5: Determine canonical cover source
		let mediaSourceUrl: string
		let mediaContentType: string

		if (postData.coverUrl) {
			mediaSourceUrl = postData.coverUrl
			mediaContentType = inferContentType(postData.coverUrl)
		} else {
			// Use first previewable asset from postAssets
			const [firstAsset] = await db
				.select({
					storageKey: postAssets.storageKey,
					mimeType: postAssets.mimeType,
				})
				.from(postAssets)
				.where(eq(postAssets.postId, postId))
				.orderBy(asc(postAssets.sortOrder))
				.limit(1)

			if (firstAsset) {
				mediaSourceUrl = firstAsset.storageKey
				mediaContentType = firstAsset.mimeType
			} else {
				// Fallback to mediaUrl
				mediaSourceUrl = postData.mediaUrl
				mediaContentType = inferContentType(postData.mediaUrl)
			}
		}

		// Step 6: Upload media (skip if already done — partial failure recovery)
		let mediaTxId = postData.arweaveMediaTxId

		if (!mediaTxId) {
			console.log(`[finalizeArweaveAssets] Uploading media to Arweave for post ${postId}`)
			const mediaResult = await uploadMediaToArweave(
				mediaSourceUrl,
				mediaContentType,
				creatorWallet,
			)
			mediaTxId = mediaResult.txId

			// Persist media tx ID immediately (partial failure safe)
			await db
				.update(posts)
				.set({ arweaveMediaTxId: mediaTxId, updatedAt: new Date() })
				.where(eq(posts.id, postId))

			console.log(`[finalizeArweaveAssets] Media uploaded: ${mediaTxId}`)
		} else {
			console.log(`[finalizeArweaveAssets] Media already uploaded: ${mediaTxId}, skipping`)
		}

		// Step 7: Generate canonical metadata JSON
		// Fetch creator info for metadata
		const { users } = await import("@/server/db/schema")
		const [creatorData] = await db
			.select({
				displayName: users.displayName,
				usernameSlug: users.usernameSlug,
				walletAddress: users.walletAddress,
			})
			.from(users)
			.where(eq(users.id, postData.userId))
			.limit(1)

		if (!creatorData) {
			throw new Error("Creator user not found")
		}

		// Fetch assets for multi-asset metadata
		const assets = await db
			.select({
				id: postAssets.id,
				storageKey: postAssets.storageKey,
				mimeType: postAssets.mimeType,
				isPreviewable: postAssets.isPreviewable,
				isGated: postAssets.isGated,
			})
			.from(postAssets)
			.where(eq(postAssets.postId, postId))
			.orderBy(asc(postAssets.sortOrder))

		// Build canonical metadata with Arweave media URL
		const arweaveMediaUrl = arweaveTxIdToUrl(mediaTxId)

		const canonicalMetadata = generateCanonicalNftMetadata(
			{
				id: postData.id,
				caption: postData.caption,
				mediaUrl: postData.mediaUrl,
				coverUrl: postData.coverUrl,
				type: postData.type as "collectible" | "edition",
				maxSupply: postData.maxSupply,
				price: postData.price,
				currency: postData.currency,
				nftName: postData.nftName,
				nftSymbol: postData.nftSymbol,
				nftDescription: postData.nftDescription,
				sellerFeeBasisPoints: postData.sellerFeeBasisPoints,
				isMutable: postData.isMutable,
				categories: postData.categories ? stringsToCategories(postData.categories) : null,
				protectDownload: assets.some((a) => a.isGated),
				assets: assets.map((a) => ({
					id: a.id,
					url: a.storageKey,
					mimeType: a.mimeType,
					isPreviewable: a.isPreviewable,
				})),
			},
			creatorData,
			arweaveMediaUrl,
		)

		// Step 8: Upload metadata JSON
		console.log(`[finalizeArweaveAssets] Uploading metadata to Arweave for post ${postId}`)
		const metadataResult = await uploadMetadataToArweave(
			canonicalMetadata,
			creatorWallet,
		)

		// Step 9: Persist metadata tx ID and mark as uploaded
		await db
			.update(posts)
			.set({
				arweaveMetadataTxId: metadataResult.txId,
				arweaveStatus: "uploaded",
				arweaveError: null,
				updatedAt: new Date(),
			})
			.where(eq(posts.id, postId))

		const metadataUrl = arweaveTxIdToUrl(metadataResult.txId)
		console.log(`[finalizeArweaveAssets] Finalization complete for post ${postId}: ${metadataUrl}`)

		return {
			success: true,
			status: "uploaded",
			metadataUrl,
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error"

		console.error(`[finalizeArweaveAssets] Failed for post ${postId}: ${errorMessage}`)

		// Mark as failed, preserve partial tx IDs
		await db
			.update(posts)
			.set({
				arweaveStatus: "failed",
				arweaveError: errorMessage,
				updatedAt: new Date(),
			})
			.where(eq(posts.id, postId))

		return {
			success: false,
			status: "failed",
			error: errorMessage,
		}
	}
}

/**
 * Generate canonical NFT metadata with Arweave media URL.
 *
 * Uses the standard generateNftMetadata but overrides the image field
 * with the permanent Arweave URL. Gated assets still use the API endpoint.
 */
function generateCanonicalNftMetadata(
	post: Parameters<typeof generateNftMetadata>[0],
	creator: Parameters<typeof generateNftMetadata>[1],
	arweaveMediaUrl: string,
) {
	// Generate standard metadata first
	const metadata = generateNftMetadata(post, creator)

	// Override image with Arweave URL (the canonical permanent location)
	metadata.image = arweaveMediaUrl

	// Override animation_url if it was set and is not a gated API endpoint
	if (metadata.animation_url && !metadata.animation_url.includes("/api/assets/")) {
		metadata.animation_url = arweaveMediaUrl
	}

	// Update files array: replace non-gated media URLs with Arweave URL
	if (metadata.properties?.files) {
		metadata.properties.files = metadata.properties.files.map((file) => {
			// Keep gated API endpoint URLs as-is
			if (file.uri.includes("/api/assets/")) {
				return file
			}
			// Replace the primary media/cover URL with Arweave
			if (file.uri === post.mediaUrl || file.uri === post.coverUrl) {
				return { ...file, uri: arweaveMediaUrl }
			}
			return file
		})
	}

	return metadata
}

/**
 * Infer content type from URL extension
 */
function inferContentType(url: string): string {
	const ext = url.split(".").pop()?.toLowerCase()?.split("?")[0]
	const typeMap: Record<string, string> = {
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		png: "image/png",
		gif: "image/gif",
		webp: "image/webp",
		svg: "image/svg+xml",
		mp4: "video/mp4",
		webm: "video/webm",
		mp3: "audio/mpeg",
		wav: "audio/wav",
		ogg: "audio/ogg",
		pdf: "application/pdf",
		glb: "model/gltf-binary",
		gltf: "model/gltf+json",
	}
	return typeMap[ext || ""] || "application/octet-stream"
}
