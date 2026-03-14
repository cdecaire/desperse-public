export type MediaType = 'image' | 'video' | 'audio' | 'document' | '3d'

/** Detect media type from a URL based on file extension */
export function detectMediaType(url: string): MediaType {
	const extension = url.split('.').pop()?.toLowerCase()?.split('?')[0]

	if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(extension || '')) {
		return 'image'
	}
	if (['mp4', 'webm', 'mov'].includes(extension || '')) {
		return 'video'
	}
	if (['mp3', 'wav', 'ogg', 'aac'].includes(extension || '')) {
		return 'audio'
	}
	if (['pdf', 'zip'].includes(extension || '')) {
		return 'document'
	}
	if (['glb', 'gltf'].includes(extension || '')) {
		return '3d'
	}

	return 'image'
}
