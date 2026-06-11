export type MediaType = 'image' | 'video' | 'audio' | 'document' | '3d'

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg']
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov']
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'aac']
const DOCUMENT_EXTENSIONS = ['pdf', 'zip', 'epub']
const THREE_D_EXTENSIONS = ['glb', 'gltf']

/** Media types that require a cover image and are not inline-previewable */
export const NON_PREVIEWABLE_TYPES: MediaType[] = ['3d', 'audio', 'document']

/** Detect media type from a URL based on file extension, with optional MIME type fallback */
export function detectMediaType(url: string, mimeType?: string | null): MediaType {
	const extension = url.split('.').pop()?.toLowerCase()?.split('?')[0]

	if (IMAGE_EXTENSIONS.includes(extension || '')) return 'image'
	if (VIDEO_EXTENSIONS.includes(extension || '')) return 'video'
	if (AUDIO_EXTENSIONS.includes(extension || '')) return 'audio'
	if (DOCUMENT_EXTENSIONS.includes(extension || '')) return 'document'
	if (THREE_D_EXTENSIONS.includes(extension || '')) return '3d'

	// Fallback: use MIME type when extension is ambiguous (e.g. .bin uploads)
	if (mimeType) {
		if (mimeType === 'model/gltf-binary' || mimeType === 'model/gltf+json') return '3d'
		if (mimeType.startsWith('image/')) return 'image'
		if (mimeType.startsWith('video/')) return 'video'
		if (mimeType.startsWith('audio/')) return 'audio'
		if (mimeType === 'application/pdf' || mimeType === 'application/zip' || mimeType === 'application/epub+zip') return 'document'
	}

	return 'image'
}