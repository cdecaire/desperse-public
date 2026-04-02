// Re-export from the symlinked ComfyUI output — generated automatically by the image pipeline
export {
	type EchoAttribute,
	type EchoMetadata,
	COLLECTION_METADATA,
	ECHOES_METADATA,
	FACTION_COLORS,
	RANK_COLORS,
	TRAIT_TYPES,
} from "../../echoes-dev/echoes-metadata"

import type { EchoMetadata } from "../../echoes-dev/echoes-metadata"

/**
 * Resolve image path for an echo via the server proxy.
 * All image requests go through /api/v1/pfp/image/:index which gates by mint status.
 */
export function getDevImagePaths(item: EchoMetadata): string[] {
	// Extract numeric index from the image filename (e.g. "0.png" → 0)
	const index = item.image.replace(/\.png$/, "")
	return [`/api/v1/pfp/image/${index}`]
}

/** Ghost-class and classification traits — present only on some echoes, not used for filtering */
export const GHOST_TRAIT_TYPES = [
	"Echo Classification",
	"Continuity Class",
	"Ghost Reconstruction",
	"Ghost Distortion",
	"Ghost Face Integrity",
	"Ghost Projection",
	"Ghost Echo Artifact",
	"Ghost Interference",
] as const
