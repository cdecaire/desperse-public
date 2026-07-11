/**
 * Picks a decorative avatar fallback from a stable piece of user identity.
 *
 * This intentionally does not use Math.random(): fallback avatars are rendered
 * on both the server and client, and a user should be recognizable wherever
 * they appear in the product.
 */
const avatarPatternClasses = [
	"avatar-fallback-pattern--aurora",
	"avatar-fallback-pattern--cinder",
	"avatar-fallback-pattern--lilac",
	"avatar-fallback-pattern--tide",
	"avatar-fallback-pattern--citrus",
	"avatar-fallback-pattern--coral",
	"avatar-fallback-pattern--orchid",
	"avatar-fallback-pattern--mint",
] as const

export type AvatarPatternClass = (typeof avatarPatternClasses)[number]

function hashSeed(seed: string): number {
	let hash = 0x811c9dc5

	for (let index = 0; index < seed.length; index += 1) {
		hash ^= seed.charCodeAt(index)
		hash = Math.imul(hash, 0x01000193)
	}

	return hash >>> 0
}

export function getAvatarPatternClass(seed?: string | null): AvatarPatternClass {
	const normalizedSeed = seed?.trim().toLowerCase() || "desperse-user"
	return avatarPatternClasses[hashSeed(normalizedSeed) % avatarPatternClasses.length]
}
