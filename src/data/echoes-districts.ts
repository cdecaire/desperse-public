export type District = {
	name: string
	slug: string
	controllingFaction: string
	description: string
	image?: string
	placeholderImage: string
}

export const DISTRICTS: District[] = [
	{
		name: "Registry Spire",
		slug: "registry-spire",
		controllingFaction: "Syre Group",
		description:
			"The central tower complex where identity verification, access licensing, and continuity archives are administered. Black glass facades reflect nothing back. Entry requires clearance. Exit requires permission.",
		image: "/echoes-districts/registry-spire.png",
		placeholderImage: "Black glass towers rising through low neon fog, biometric scanners flanking every entrance",
	},
	{
		name: "Ward Delta",
		slug: "ward-delta",
		controllingFaction: "Tessera Wardens",
		description:
			"The enforcement perimeter. Floodlit checkpoints, armored barricade lanes, and scanning corridors divide Tessera into controllable sectors. Transit is a negotiation. Every crossing is logged.",
		image: "/echoes-districts/ward-delta.png",
		placeholderImage: "Floodlit checkpoint corridor with armored barricades and scanner arrays",
	},
	{
		name: "The Conduits",
		slug: "the-conduits",
		controllingFaction: "The Siphon",
		description:
			"A network of service tunnels, relay towers, rooftop antenna rigs, and dead-drop nodes. Tessera's unofficial nervous system. If something moves without the Registry seeing it, it moves through the Conduits.",
		image: "/echoes-districts/the-conduits.png",
		placeholderImage: "Rooftop antenna rigs silhouetted against ad-screen spill, service tunnel entrance below",
	},
	{
		name: "Black Clinic Row",
		slug: "black-clinic-row",
		controllingFaction: "The Unwritten",
		description:
			"Unlicensed modification labs, wetware stitchers, and neural grafting operations. Where bodies are rebuilt outside sanctioned systems. The lights are surgical. The work is not.",
		image: "/echoes-districts/black-clinic-row.png",
		placeholderImage: "Narrow alley lined with neon medical crosses, surgical light spilling from unmarked doorways",
	},
	{
		name: "The Vault Below",
		slug: "the-vault-below",
		controllingFaction: "The Witnesses",
		description:
			"Deep infrastructure layers where legacy archive systems still run. Signal shrines, continuity chambers, and transmission halls. The Witnesses believe something woke here during the Cascade. They come to listen.",
		image: "/echoes-districts/the-vault-below.png",
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
