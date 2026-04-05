export type District = {
	name: string
	slug: string
	controllingFaction: string
	description: string
	image?: string
	placeholderImage: string
}

/** District image paths (served from public/) */
const DISTRICT_IMAGES: Record<string, string> = {
	"registry-spire": "/registry-spire.jpg",
	"ward-delta": "/ward-delta.jpg",
	"the-conduits": "/the-conduits.jpg",
	"black-clinic-row": "/black-clinic-row.jpg",
	"the-vault-below": "/the-vault-below.jpg",
}

/** Resolve a district image path */
export function getDistrictImage(slug: string): string | undefined {
	return DISTRICT_IMAGES[slug]
}

export const DISTRICTS: District[] = [
	{
		name: "Registry Spire",
		slug: "registry-spire",
		controllingFaction: "Syre Group",
		description:
			"The central tower complex where identity verification, access licensing, and continuity archives are administered. Black glass facades reflect nothing back. Entry requires clearance. Exit requires permission.",
		image: DISTRICT_IMAGES["registry-spire"],
		placeholderImage: "Black glass towers rising through low neon fog, biometric scanners flanking every entrance",
	},
	{
		name: "Ward Delta",
		slug: "ward-delta",
		controllingFaction: "Tessera Wardens",
		description:
			"The enforcement perimeter. Floodlit checkpoints, armored barricade lanes, and scanning corridors divide Tessera into controllable sectors. Transit is a negotiation. Every crossing is logged.",
		image: DISTRICT_IMAGES["ward-delta"],
		placeholderImage: "Floodlit checkpoint corridor with armored barricades and scanner arrays",
	},
	{
		name: "The Conduits",
		slug: "the-conduits",
		controllingFaction: "The Siphon",
		description:
			"A network of service tunnels, relay towers, rooftop antenna rigs, and dead-drop nodes. Tessera's unofficial nervous system. If something moves without the Registry seeing it, it moves through the Conduits.",
		image: DISTRICT_IMAGES["the-conduits"],
		placeholderImage: "Rooftop antenna rigs silhouetted against ad-screen spill, service tunnel entrance below",
	},
	{
		name: "Black Clinic Row",
		slug: "black-clinic-row",
		controllingFaction: "The Unwritten",
		description:
			"Unlicensed modification labs, wetware stitchers, and neural grafting operations. Where bodies are rebuilt outside sanctioned systems. The lights are surgical. The work is not.",
		image: DISTRICT_IMAGES["black-clinic-row"],
		placeholderImage: "Narrow alley lined with neon medical crosses, surgical light spilling from unmarked doorways",
	},
	{
		name: "The Vault Below",
		slug: "the-vault-below",
		controllingFaction: "The Witnesses",
		description:
			"Deep infrastructure layers where legacy archive systems still run. Signal shrines, continuity chambers, and transmission halls. The Witnesses believe something woke here during the Cascade. They come to listen.",
		image: DISTRICT_IMAGES["the-vault-below"],
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
