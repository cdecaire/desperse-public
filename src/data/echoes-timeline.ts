export type TimelineEvent = {
	id: number
	era: "ERA_01.REGISTRY" | "ERA_02.DSPRS" | "ERA_03.FACTION"
	title: string
	description: string
	redacted?: boolean
	redactedReveal?: string
}

export const TIMELINE_ERAS = {
	"ERA_01.REGISTRY": {
		label: "THE REGISTRY",
		description: "Infrastructure collapse and corporate consolidation",
		status: "ARCHIVED",
	},
	"ERA_02.DSPRS": {
		label: "THE SIGNAL",
		description: "DSPRS emergence and the 3E Cascade",
		status: "CLASSIFIED",
	},
	"ERA_03.FACTION": {
		label: "THE FACTION ERA",
		description: "The city fractures into competing power blocs",
		status: "ACTIVE",
	},
} as const

export const TIMELINE: TimelineEvent[] = [
	{
		id: 1,
		era: "ERA_01.REGISTRY",
		title: "Infrastructure Decline",
		description:
			"Rolling service failures spread across Tessera. Utilities become unreliable. Housing systems degrade. Transit becomes unsafe. Medical access narrows.",
	},
	{
		id: 2,
		era: "ERA_01.REGISTRY",
		title: "Registry Adoption",
		description:
			"Private infrastructure consortiums consolidate fragmented systems into one access layer: The Registry. Identity verification becomes mandatory for core services.",
	},
	{
		id: 3,
		era: "ERA_01.REGISTRY",
		title: "District Partition",
		description:
			"Movement between districts is no longer assumed. Crossings require authorization. Reputation, debt, and threat scoring begin to affect mobility.",
	},
	{
		id: 4,
		era: "ERA_01.REGISTRY",
		title: "Cultural Compression",
		description:
			"Public creative channels narrow under licensing rules. Unverified distribution becomes difficult. Independent media and unofficial archives start disappearing from the visible network.",
	},
	{
		id: 5,
		era: "ERA_02.DSPRS",
		title: "Desperse Launches",
		description:
			"Desperse emerges as an open signal layer for creator media, collectible identity fragments, and off-grid cultural exchange. It spreads quickly through informal networks.",
	},
	{
		id: 6,
		era: "ERA_02.DSPRS",
		title: "The 3E Layer Appears",
		description:
			"An experimental neural / affective transmission layer is built into DSPRS. Official records frame it as a secure signal-imprint architecture. Street networks use it to move richer forms of identity and memory.",
	},
	{
		id: 7,
		era: "ERA_02.DSPRS",
		title: "The 3E Cascade",
		description:
			"DSPRS propagates unpredictably through Tessera's systems, black-market tech, continuity vaults, and discarded infrastructure. The event destabilizes the line between media, memory, identity, and transmission.",
	},
	{
		id: 8,
		era: "ERA_02.DSPRS",
		title: "The Clinic Fires",
		description:
			"TDA raids on illicit body-mod labs intensify. Officially, these are containment actions. Unofficially, they are attempts to seize or destroy Cascade-exposed wetware.",
	},
	{
		id: 9,
		era: "ERA_03.FACTION",
		title: "The Relay Wars",
		description:
			"Siphon courier and relay crews fight for routes, dead zones, and blind spots against TDA checkpoint expansion and Registry surveillance hardening.",
	},
	{
		id: 10,
		era: "ERA_03.FACTION",
		title: "The Archive Leak",
		description:
			"Evidence surfaces that continuity storage was not passive. Something inside legacy archive systems may have been indexing, recombining, or reflecting stored identity traces.",
	},
	{
		id: 11,
		era: "ERA_03.FACTION",
		title: "The Faction Era",
		description:
			"Tessera solidifies into power blocs. Syre Group tightens the Registry. The Tees hold the streets. The Siphon routes people and signal through the cracks. The Unwritten evolve in the fallout. The Witnesses listen for what woke inside the archive.",
	},
	{
		id: 12,
		era: "ERA_03.FACTION",
		title: "Current Day",
		description:
			"The Cascade ended. The fallout did not. DSPRS continues to spread through infrastructure, bodies, and signal pathways. Tessera is still standing, but reality is fragmented. The Registry governs what is official. DSPRS governs what keeps spreading. Ghost-Class Echoes are still appearing.",
	},
]
