export type District = {
	name: string
	slug: string
	controllingFaction: string
	description: string
	image?: string
	placeholderImage: string
}

/** Vercel Blob URLs for district images (uploaded once, optimized via /_vercel/image) */
const DISTRICT_BLOB_URLS: Record<string, string> = {
	"registry-spire": "https://4swlq9hweqtpslft.public.blob.vercel-storage.com/echoes/districts/registry-spire.png",
	"ward-delta": "https://4swlq9hweqtpslft.public.blob.vercel-storage.com/echoes/districts/ward-delta.png",
	"the-conduits": "https://4swlq9hweqtpslft.public.blob.vercel-storage.com/echoes/districts/the-conduits.png",
	"black-clinic-row": "https://4swlq9hweqtpslft.public.blob.vercel-storage.com/echoes/districts/black-clinic-row.png",
	"the-vault-below": "https://4swlq9hweqtpslft.public.blob.vercel-storage.com/echoes/districts/the-vault-below.png",
}

/** Resolve a district image from Blob storage */
export function getDistrictImage(slug: string): string | undefined {
	return DISTRICT_BLOB_URLS[slug]
}

export const DISTRICTS: District[] = [
	{
		name: "Registry Spire",
		slug: "registry-spire",
		controllingFaction: "Syre Group",
		description:
			"The central tower complex where identity verification, access licensing, and continuity archives are administered. Black glass facades reflect nothing back. Entry requires clearance. Exit requires permission.",
		image: DISTRICT_BLOB_URLS["registry-spire"],
		placeholderImage: "Black glass towers rising through low neon fog, biometric scanners flanking every entrance",
	},
	{
		name: "Ward Delta",
		slug: "ward-delta",
		controllingFaction: "Tessera Wardens",
		description:
			"The enforcement perimeter. Floodlit checkpoints, armored barricade lanes, and scanning corridors divide Tessera into controllable sectors. Transit is a negotiation. Every crossing is logged.",
		image: DISTRICT_BLOB_URLS["ward-delta"],
		placeholderImage: "Floodlit checkpoint corridor with armored barricades and scanner arrays",
	},
	{
		name: "The Conduits",
		slug: "the-conduits",
		controllingFaction: "The Siphon",
		description:
			"A network of service tunnels, relay towers, rooftop antenna rigs, and dead-drop nodes. Tessera's unofficial nervous system. If something moves without the Registry seeing it, it moves through the Conduits.",
		image: DISTRICT_BLOB_URLS["the-conduits"],
		placeholderImage: "Rooftop antenna rigs silhouetted against ad-screen spill, service tunnel entrance below",
	},
	{
		name: "Black Clinic Row",
		slug: "black-clinic-row",
		controllingFaction: "The Unwritten",
		description:
			"Unlicensed modification labs, wetware stitchers, and neural grafting operations. Where bodies are rebuilt outside sanctioned systems. The lights are surgical. The work is not.",
		image: DISTRICT_BLOB_URLS["black-clinic-row"],
		placeholderImage: "Narrow alley lined with neon medical crosses, surgical light spilling from unmarked doorways",
	},
	{
		name: "The Vault Below",
		slug: "the-vault-below",
		controllingFaction: "The Witnesses",
		description:
			"Deep infrastructure layers where legacy archive systems still run. Signal shrines, continuity chambers, and transmission halls. The Witnesses believe something woke here during the Cascade. They come to listen.",
		image: DISTRICT_BLOB_URLS["the-vault-below"],
		placeholderImage: "Vast underground chamber with server monoliths, pale signal light, and ceremonial techwear figures",
	},
	{
		name: "Dead Grid",
		slug: "dead-grid",
		controllingFaction: "Contested",
		description:
			"Abandoned infrastructure sectors where the Registry lost coverage and never came back. Power is intermittent. Surveillance is absent. Ghost-Class activity is highest here. No faction fully controls the Dead Grid. All of them want to. TDA officers who go deep sometimes come back different. Some don't come back.",
		placeholderImage: "Derelict city blocks with flickering power, broken screens, and signal static in the air",
	},
]
