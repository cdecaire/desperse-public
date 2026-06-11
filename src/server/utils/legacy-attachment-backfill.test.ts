import { describe, expect, it } from "vitest"
import {
	buildLegacyAttachmentMigrationPlan,
	getUrlExtension,
	inferCoverMimeType,
	isNonDisplayableAttachmentUrl,
} from "./legacy-attachment-backfill"

describe("legacy attachment backfill planning", () => {
	it("plans migration when mediaUrl matches a downloadable asset", () => {
		const plan = buildLegacyAttachmentMigrationPlan({
			id: "post-1",
			mediaUrl: "https://blob.vercel-storage.com/files/art-book.zip",
			coverUrl: "https://blob.vercel-storage.com/covers/art-book.png",
			downloadAssets: [
				{
					id: "asset-1",
					storageKey: "https://blob.vercel-storage.com/files/art-book.zip",
					mimeType: "application/zip",
				},
			],
		})

		expect(plan).toEqual({
			postId: "post-1",
			mediaUrl: "https://blob.vercel-storage.com/files/art-book.zip",
			coverUrl: "https://blob.vercel-storage.com/covers/art-book.png",
			coverMimeType: "image/png",
			storageProvider: "vercel-blob",
			matchedDownloadAssetIds: ["asset-1"],
			reason: "media-url-matches-download-asset",
		})
	})

	it("plans migration for known non-displayable attachment URLs", () => {
		const plan = buildLegacyAttachmentMigrationPlan({
			id: "post-2",
			mediaUrl: "https://cdn.example.com/legacy/catalog.pdf?download=1",
			coverUrl: "https://cdn.example.com/covers/catalog.webp",
			downloadAssets: [
				{
					id: "asset-2",
					storageKey: "https://cdn.example.com/downloads/catalog-v2.pdf",
					mimeType: "application/pdf",
				},
			],
		})

		expect(plan?.reason).toBe("non-displayable-media-url")
		expect(plan?.coverMimeType).toBe("image/webp")
		expect(plan?.matchedDownloadAssetIds).toEqual([])
	})

	it("skips posts already pointing at displayable media", () => {
		const plan = buildLegacyAttachmentMigrationPlan({
			id: "post-3",
			mediaUrl: "https://cdn.example.com/image.jpg",
			coverUrl: "https://cdn.example.com/cover.jpg",
			downloadAssets: [
				{
					id: "asset-3",
					storageKey: "https://cdn.example.com/download.zip",
				},
			],
		})

		expect(plan).toBeNull()
	})

	it("requires a usable cover image", () => {
		const plan = buildLegacyAttachmentMigrationPlan({
			id: "post-4",
			mediaUrl: "https://cdn.example.com/download.zip",
			coverUrl: "https://cdn.example.com/cover",
			downloadAssets: [
				{
					id: "asset-4",
					storageKey: "https://cdn.example.com/download.zip",
				},
			],
		})

		expect(plan).toBeNull()
	})

	it("parses URL extensions with query strings", () => {
		expect(getUrlExtension("https://cdn.example.com/file.EPUB?token=abc")).toBe("epub")
		expect(isNonDisplayableAttachmentUrl("https://cdn.example.com/file.zip#download")).toBe(true)
		expect(inferCoverMimeType("https://cdn.example.com/cover.avif")).toBe("image/avif")
	})

	it("normalizes logged mediaUrl values before returning a plan", () => {
		const plan = buildLegacyAttachmentMigrationPlan({
			id: "post-5",
			mediaUrl: "  https://blob.vercel-storage.com/files/art-book.zip  ",
			coverUrl: "https://blob.vercel-storage.com/covers/art-book.png",
			downloadAssets: [
				{
					id: "asset-5",
					storageKey: "https://blob.vercel-storage.com/files/art-book.zip",
					mimeType: "application/zip",
				},
			],
		})

		expect(plan?.mediaUrl).toBe("https://blob.vercel-storage.com/files/art-book.zip")
	})
})
