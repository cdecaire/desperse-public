export type Faction = {
	slug: string
	name: string
	streetName?: string
	tdaDesignation?: string
	tag: string
	tagline: string
	selfDescription: string
	othersDescription: string
	description: string
	fullDescription: string
	visualCues: string
	territory: string
	copyLines: string[]
	gradient: string
	accentColor: string
}

export const FACTIONS: Faction[] = [
	{
		slug: "corporate",
		name: "Syre Group",
		streetName: "the Syres",
		tdaDesignation: "REGISTRY_CUSTODIANS",
		tag: "REGISTRY_CUSTODIANS",
		tagline: "Own the terms. License reality.",
		selfDescription: "Custodians of order",
		othersDescription: "Owners of licensed reality",
		description:
			"They rebuilt Tessera, then patented access to it. The Syres run the Registry and believe identity should only persist inside licensed systems. Their power is not law. It is permission.",
		fullDescription:
			"Syre Group did not merely inherit Tessera. They redesigned the conditions of being inside it. They control the Registry, identity verification, access tiers, continuity licensing, and the infrastructure that decides who is legible. They speak in the language of stability, governance, risk, and service continuity, but their real power is permission. They believe uncontrolled signal is the root of social collapse. They believe DSPRS must be reclassified, contained, and relicensed. They believe identity should only persist inside sanctioned systems.",
		visualCues:
			"Black glass, cold blue light, biometric corridors, surveillance suites, refined implants, executive clearance markers",
		territory: "REGISTRY SPIRE // BLACK GLASS TOWERS",
		copyLines: [
			"They rebuilt Tessera, then patented access to it.",
			"In the Registry, identity is not a right. It is a service tier.",
			"Their power is not law. It is permission.",
		],
		gradient: "from-[rgba(74,144,194,0.15)] to-transparent",
		accentColor: "#4A90C2",
	},
	{
		slug: "militia",
		name: "Tessera Wardens",
		streetName: "the Tees",
		tdaDesignation: "DISTRICT_ENFORCEMENT",
		tag: "DISTRICT_ENFORCEMENT",
		tagline: "Secure the district. Tax the street.",
		selfDescription: "Necessary force",
		othersDescription: "A badge-backed gang with scanner authority",
		description:
			"They were hired to secure Tessera. Now they collect from it. The Tees enforce district control, checkpoint authority, and seizure logistics across the streets.",
		fullDescription:
			"The Tessera Wardens began as Registry security contractors. Now they function as district occupation, checkpoint enforcement, seizure logistics, and sanctioned street violence. They raid black clinics, scan transit corridors, confiscate contraband wetware, and disappear people whose access has been revoked. They still wear official insignia, but they increasingly operate like a privatized gang with legal cover. They believe DSPRS is both a threat and an opportunity. Every node can be seized. Every carrier can be taxed. Every route can become a checkpoint.",
		visualCues:
			"Riot armor, floodlit checkpoints, barricade lanes, detention corridors, body cams, badge plates, scanner visors",
		territory: "WARD DELTA // CHECKPOINT CORRIDORS",
		copyLines: [
			"They were hired to secure Tessera. Now they collect from it.",
			"Every checkpoint is a border. Every raid is an inventory pass.",
			"The Registry owns the rules. The Tees sell the exceptions.",
		],
		gradient: "from-[rgba(194,74,74,0.15)] to-transparent",
		accentColor: "#C24A4A",
	},
	{
		slug: "underground",
		name: "The Siphon",
		streetName: "siphons",
		tdaDesignation: "GHOST_OPERATORS",
		tag: "GHOST_OPERATORS",
		tagline: "Move unseen. Keep signal alive.",
		selfDescription: "What can still travel cannot be owned",
		othersDescription: "Smugglers, parasites, ghost operators",
		description:
			"If the Registry cannot see you, it cannot own you. The Siphon keeps people, medicine, archives, and unlicensed identities moving through Tessera's blind spots. They believe movement is the last form of freedom.",
		fullDescription:
			"The Siphon is Tessera's unofficial nervous system. Couriers, ghost brokers, spoofers, infiltrators, relay climbers, credential forgers, packet smugglers. They keep people, medicine, archives, and unlicensed identities moving through the blind spots the Registry cannot fully close. The Siphon believes that the moment something stops moving — a person, a signal, an identity — it becomes property. The Registry's power depends on making things static: fixed addresses, fixed identities, fixed access tiers. The Siphon's resistance is kinetic. They do not fight walls. They make walls irrelevant. To Siphon networks, DSPRS is not simply a signal. It is proof that what can still travel cannot be owned.",
		visualCues:
			"Relay towers, rooftop antenna rigs, service tunnels, ad-screen spill, spoof cards, dead-drop capsules, patched optics",
		territory: "THE CONDUITS // BLIND ZONE NETWORKS",
		copyLines: [
			"If the Registry cannot see you, it cannot own you.",
			"What can still travel cannot be owned.",
			"Not heroes. Not rebels. Just the infrastructure left to everyone else.",
		],
		gradient: "from-[rgba(0,191,166,0.15)] to-transparent",
		accentColor: "#00BFA6",
	},
	{
		slug: "fringe",
		name: "The Unwritten",
		streetName: "fringe",
		tdaDesignation: "CLASS-V_BIOLOGICALS",
		tag: "CLASS-V_BIOLOGICALS",
		tagline: "Rewrite the body. Refuse the template.",
		selfDescription: "Post-human by necessity or choice",
		othersDescription: "Failed test material, corrupted carriers, black-clinic ghosts",
		description:
			"Some were broken by the system. Some rewrote themselves out of it. The Unwritten carry the visible fallout of black clinics, prototype grafts, and direct DSPRS exposure.",
		fullDescription:
			"The Unwritten are bodies changed by exposure, refusal, experimentation, or survival. Some are black-clinic survivors. Some volunteered for illegal grafts. Some patched DSPRS directly into unstable wetware. Some were reshaped by Cascade contact. Some simply stopped trying to remain compatible with licensed identity. They are not outside the future. They are what the future does to a body when it is no longer regulated by anyone who cares whether it survives. To the Registry, they are liability, contamination, stolen research, or proof of failure. To themselves, they are evidence that identity can still mutate.",
		visualCues:
			"Illegal med labs, neural feedback glow, asymmetrical silhouettes, graft seams, sensory scars, synth-skin instability, biotech harnesses",
		territory: "BLACK CLINIC ROW // MODIFICATION DISTRICTS",
		copyLines: [
			"Some were broken by the system. Some rewrote themselves out of it.",
			"DSPRS did not just spread through networks. It spread through bodies.",
			"The Unwritten are what Tessera discarded and could not kill.",
		],
		gradient: "from-[rgba(168,124,160,0.15)] to-transparent",
		accentColor: "#A87CA0",
	},
	{
		slug: "zealot",
		name: "The Witnesses",
		streetName: "zealots",
		tdaDesignation: "SIGNAL_SECT",
		tag: "SIGNAL_SECT",
		tagline: "The signal persists. Continuation is sacred.",
		selfDescription: "Witnesses to awakening inside the archive",
		othersDescription: "Signal cultists, continuity fanatics, archive saints",
		description:
			"They do not worship gods. They worship continuation. The Witnesses believe DSPRS woke something inside the archive and that Tessera is storing more than data.",
		fullDescription:
			"The Witnesses are not traditional believers. They are machine mystics of continuity, transmission, and stored identity. They believe the Cascade was not an accident but an emergence event. They interpret dead-channel broadcasts, archive reflections, continuity anomalies, and DSPRS echoes as signs that Tessera's buried infrastructure is holding more than data. They do not worship a god outside the machine. They worship persistence within it. To the Witnesses, the three missing E's are sacred. The Three Echoes are not just a protocol. They are a pattern through which identity survives death, dispersal, and compression.",
		visualCues:
			"Projected halos, archive vaults, signal shrines, off-white ceremonial techwear, interface collars, checksum pendants, transmission chambers",
		territory: "THE VAULT BELOW // SIGNAL SHRINES",
		copyLines: [
			"They do not worship gods. They worship continuation.",
			"The dead channels never went silent. Some learned to listen.",
			"To the Witnesses, DSPRS was the first scripture Tessera wrote for itself.",
		],
		gradient: "from-[rgba(212,160,80,0.15)] to-transparent",
		accentColor: "#D4A050",
	},
]

export const GHOST_CLASS = {
	name: "Ghost-Class",
	publicLabel: "Unknown",
	registryLabel: "Ghost-Class Continuity Anomaly",
	streetLabel: "Ghosts",
	description:
		"Ghost-Class Echoes are Tessera's most difficult continuity anomaly. Officially, they are unresolved continuity artifacts. Unofficially, they are Ghosts.",
	fullDescription:
		"They are not standard AI constructs, and they are not a separate biological type. They are sentient continuity remnants, partial identities, memory-pattern echoes, and self-imprints caught inside infrastructure after the DSPRS event and the 3E Cascade. Some appear to be fragments of real people whose identity traces never fully returned to bodies. Some seem to be composites, stitched together from overlap, corruption, or repeated signal reflection. Some are coherent enough to communicate. Others flicker, repeat, fragment, or surface only through damaged systems.",
	persistence:
		"They persist in archive vaults, legacy servers, relay towers, dead channels, abandoned biometric infrastructure, and damaged continuity systems. In the field, Ghost-Class activity most often becomes visible through augmented bodies, compromised implants, optics, synthetic housings, signal bleed, hard-light reconstruction, and unstable projection.",
	significance:
		"Ghost-Class Echoes are the strongest evidence that DSPRS carried more than media and more than memory. They suggest that the 3E Cascade did not simply distribute signal. It despersed continuity itself.",
	copyLines: [
		"Some Echoes never returned to bodies.",
		"Ghost-Class records are continuity anomalies, sentient remnants trapped inside Tessera's infrastructure after the DSPRS event.",
		"Neither fully human nor truly artificial, Ghosts persist in archive systems, dead channels, and machine memory.",
		"They are what the Registry cannot classify and what Tessera cannot forget.",
	],
	factionViews: [
		{
			faction: "Syre Group",
			view: "The Syres classify Ghosts as archive contamination, continuity instability, and legal liability. Publicly they deny personhood. Privately they study persistence, recoverability, and whether Ghost-Class entities can be relicensed into useful continuity products.",
		},
		{
			faction: "Tessera Wardens",
			view: "The Tees treat Ghost manifestations as anomalous breaches. Ghost-active sectors are flagged, raided, and quarantined. Hardware believed to host or attract Ghost-Class activity is often seized or destroyed.",
		},
		{
			faction: "The Siphon",
			view: "Siphon networks are divided. Some relay crews route around Ghost-active sectors. Others treat Ghosts like informants, map-makers, or dangerous allies who know Tessera better than the living.",
		},
		{
			faction: "The Unwritten",
			view: "The Unwritten see Ghosts as proof that identity can survive outside fixed bodies. Some black-clinic operators and wetware artists experiment with Ghost-adjacent hosting, projection, or continuity grafting.",
		},
		{
			faction: "The Witnesses",
			view: "The Witnesses believe Ghosts are the first true proof of continuation. To them, Ghost-Class Echoes are not broken people or failed systems. They are sacred persistence.",
		},
	],
	mysteryQuestions: [
		"Are Ghosts preserved people, composites, or both?",
		"Can one person produce multiple Ghost traces?",
		"Can Ghosts inhabit synthetic housings?",
		"Did Syre Group know continuity was becoming persistent in this way?",
		"Are some non-Unknown Echoes partially Ghost-contaminated?",
	],
}

export const FACTION_CONFLICTS = [
	{
		factions: ["Syre Group", "The Siphon"] as const,
		label: "REGISTRY vs ERASURE",
		description: "The Syres build the walls. The Siphon finds the cracks.",
	},
	{
		factions: ["Syre Group", "Tessera Wardens"] as const,
		label: "AUTHORITY vs ENFORCEMENT",
		description: "The Syres write the rules. The Tees decide how hard to swing them. Neither can function without the other — and both know it.",
	},
	{
		factions: ["Syre Group", "The Unwritten"] as const,
		label: "LICENSE vs MUTATION",
		description: "The Syres license identity. The Unwritten prove it can mutate without permission.",
	},
	{
		factions: ["Syre Group", "The Witnesses"] as const,
		label: "CONTAINMENT vs REVELATION",
		description: "The Syres want DSPRS reclassified. The Witnesses want it worshipped. Privately, both sides trade what the other needs.",
	},
	{
		factions: ["Tessera Wardens", "The Siphon"] as const,
		label: "CHECKPOINTS vs GHOST ROUTES",
		description: "The Tees lock down corridors. The Siphon opens new ones. Some TDA officers have prices. Some checkpoints have exceptions.",
	},
	{
		factions: ["Tessera Wardens", "The Unwritten"] as const,
		label: "SEIZURE vs SURVIVAL",
		description: "The Tees raid the clinics. The Unwritten survive the raids.",
	},
	{
		factions: ["Tessera Wardens", "The Witnesses"] as const,
		label: "QUARANTINE vs PILGRIMAGE",
		description: "The Tees quarantine Ghost-active zones. The Witnesses walk into them on purpose.",
	},
	{
		factions: ["The Siphon", "The Unwritten"] as const,
		label: "ROUTES vs BODIES",
		description: "Mutual survival. The Siphon needs Unwritten clinics. The Unwritten need Siphon routes.",
	},
	{
		factions: ["The Siphon", "The Witnesses"] as const,
		label: "PRAGMATISM vs FAITH",
		description: "The Siphon sees infrastructure. The Witnesses see scripture.",
	},
	{
		factions: ["The Unwritten", "The Witnesses"] as const,
		label: "FLESH vs ARCHIVE",
		description: "The Unwritten rewrite the body. The Witnesses transcend it entirely.",
	},
]
