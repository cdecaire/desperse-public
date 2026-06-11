export type LegacyAttachmentDownloadAsset = {
	id: string
	storageKey: string
	mimeType?: string | null
}

export type LegacyAttachmentPost = {
	id: string
	mediaUrl: string
	coverUrl: string | null
	downloadAssets: LegacyAttachmentDownloadAsset[]
}

export type LegacyAttachmentMigrationPlan = {
	postId: string
	mediaUrl: string
	coverUrl: string
	coverMimeType: string
	storageProvider: "vercel-blob" | "r2" | "s3"
	matchedDownloadAssetIds: string[]
	reason: "media-url-matches-download-asset" | "non-displayable-media-url"
}

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
	avif: "image/avif",
	gif: "image/gif",
	jpeg: "image/jpeg",
	jpg: "image/jpeg",
	png: "image/png",
	svg: "image/svg+xml",
	webp: "image/webp",
}

const NON_DISPLAYABLE_ATTACHMENT_EXTENSIONS = new Set(["epub", "pdf", "zip"])

export function normalizeAssetUrl(url: string): string {
	return url.trim()
}

export function getUrlExtension(url: string): string | null {
	const trimmed = url.trim()
	if (!trimmed) return null

	let path = trimmed
	try {
		path = new URL(trimmed).pathname
	} catch {
		path = trimmed.split(/[?#]/, 1)[0] || trimmed
	}

	const fileName = path.split("/").pop() || ""
	const dotIndex = fileName.lastIndexOf(".")
	if (dotIndex < 0 || dotIndex === fileName.length - 1) return null
	return fileName.slice(dotIndex + 1).toLowerCase()
}

export function inferCoverMimeType(url: string): string | null {
	const extension = getUrlExtension(url)
	if (!extension) return null
	return IMAGE_MIME_BY_EXTENSION[extension] || null
}

export function isNonDisplayableAttachmentUrl(url: string): boolean {
	const extension = getUrlExtension(url)
	return extension ? NON_DISPLAYABLE_ATTACHMENT_EXTENSIONS.has(extension) : false
}

export function getStorageProvider(url: string): "vercel-blob" | "r2" | "s3" {
	if (url.includes("vercel-storage.com") || url.includes("blob.vercel-storage.com")) return "vercel-blob"
	if (url.includes(".r2.cloudflarestorage.com")) return "r2"
	if (url.includes(".s3.") || url.includes("amazonaws.com")) return "s3"
	return "vercel-blob"
}

export function buildLegacyAttachmentMigrationPlan(post: LegacyAttachmentPost): LegacyAttachmentMigrationPlan | null {
	if (!post.coverUrl) return null
	if (post.downloadAssets.length === 0) return null

	const coverMimeType = inferCoverMimeType(post.coverUrl)
	if (!coverMimeType) return null

	const mediaUrl = normalizeAssetUrl(post.mediaUrl)
	const matchedDownloadAssetIds = post.downloadAssets
		.filter((asset) => normalizeAssetUrl(asset.storageKey) === mediaUrl)
		.map((asset) => asset.id)

	if (matchedDownloadAssetIds.length > 0) {
		return {
			postId: post.id,
			mediaUrl: post.mediaUrl,
			coverUrl: post.coverUrl,
			coverMimeType,
			storageProvider: getStorageProvider(post.coverUrl),
			matchedDownloadAssetIds,
			reason: "media-url-matches-download-asset",
		}
	}

	if (isNonDisplayableAttachmentUrl(post.mediaUrl)) {
		return {
			postId: post.id,
			mediaUrl: post.mediaUrl,
			coverUrl: post.coverUrl,
			coverMimeType,
			storageProvider: getStorageProvider(post.coverUrl),
			matchedDownloadAssetIds: [],
			reason: "non-displayable-media-url",
		}
	}

	return null
}
