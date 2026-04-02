export type FaqCategory = "general" | "mint" | "lore" | "technical" | "desperse"

export type FaqItem = {
	question: string
	answer: string
	category: FaqCategory
	corrupted?: boolean
	corruptedReveal?: string
}

export const FAQ_CATEGORIES: Record<FaqCategory, string> = {
	general: "GENERAL",
	mint: "MINT_PROTOCOL",
	lore: "ARCHIVE_RECORDS",
	technical: "SYSTEM_SPECS",
	desperse: "DESPERSE_NETWORK",
}

export const FAQ_ITEMS: FaqItem[] = [
	// General
	{
		question: "What is this collection?",
		answer: "Echoes is a generative cyberpunk PFP collection from Desperse, featuring 8,888 recovered identities shaped by faction, signal exposure, and the fallout of the DSPRS event. Each Echo carries faction alignment, modification grade, and continuity status from the Cascade.",
		category: "general",
	},
	{
		question: "What is DSPRS?",
		answer: "DSPRS is the machine-coded name for Desperse after it was flagged as a protocol inside Tessera's systems. It refers to the signal event that blurred the line between media, memory, and identity. The 3E Protocol — Encode, Emit, Echo — was Syre Group's classification. On the street it meant Expression, Exchange, Escape.",
		category: "general",
	},
	{
		question: "What makes this different from other PFP collections?",
		answer: "Echoes are not cosmetic avatars. They are characters embedded in a world with faction conflict, lore, district control, and narrative depth. Every trait has in-world meaning. Every faction represents a different response to power, mutation, and survival.",
		category: "general",
	},

	// Mint
	{
		question: "When does mint open?",
		answer: "The mint date is shown in the countdown on the mint page. Allowlist holders get early archive access, followed by a public breach window. Follow our socials for the exact schedule.",
		category: "mint",
	},
	{
		question: "How many can I mint?",
		answer: "Wallet limits will be announced before mint. All transactions are on Solana — you'll need SOL in your wallet to cover the access cost and a small network fee.",
		category: "mint",
	},
	{
		question: "What is the mint price?",
		answer: "The access cost will be announced before the breach window opens. Check the mint page for the latest details.",
		category: "mint",
	},
	{
		question: "What happens after I mint?",
		answer: "Your Echo resolves immediately. The moment you mint, your identity is fully reconstructed — faction alignment, continuity status, signal exposure, and all traits emerge from the Cascade remnants. No waiting, no sealed records.",
		category: "mint",
	},

	// Lore
	{
		question: "What are despersed identities?",
		answer: "Echoes are recovered signal traces, continuity fragments, and identity remnants shaped by the fallout of the DSPRS event. Each one carries faction alignment, modification grade, and continuity status from the Cascade.",
		category: "lore",
	},
	{
		question: "What is the Registry?",
		answer: "The Registry is the privatized infrastructure layer that controls identity, access, and survival in Tessera. It replaced public systems after infrastructure decline, turning identity verification into a mandatory service tier that determines who can move, work, and exist.",
		category: "lore",
	},
	{
		question: "What are the Three Echoes?",
		answer: "The 3E Protocol — Encode, Emit, Echo — was Syre Group's classification. On the street it meant Expression, Exchange, Escape. To the Witnesses, it is simply the Three Echoes: a pattern through which identity survives death, dispersal, and compression.",
		category: "lore",
	},
	{
		question: "What do factions mean?",
		answer: "Five factions define Tessera: Syre Group controls the Registry, the Tessera Wardens enforce district power, The Siphon moves through blind spots, The Unwritten carry the fallout of mutation, and The Witnesses worship continuation inside the archive. A sixth classification — Ghost-Class — defies all five.",
		category: "lore",
		corrupted: true,
		corruptedReveal: "GHOST-CLASS CONTINUITY ANOMALY: Some echoes never returned to bodies. They persist in dead channels.",
	},
	{
		question: "How does continuity status work?",
		answer: "Continuity status reflects how stable an Echo remains after the Cascade. Stable Echoes retained coherent identity. Corrupted Echoes carry signal damage. Despersed Echoes are partially scattered across systems. Ghost-Class anomalies represent the most extreme continuity failure — identity that persists but never fully resolves.",
		category: "lore",
	},
	{
		question: "Why does my identity resolve instantly?",
		answer: "Each Echo reconstructs the moment it's recovered from the archive. The system completes resolution on contact — faction alignment, signal exposure, modification grade, and continuity state emerge from the despersed remnants of the Cascade in real time.",
		category: "lore",
	},

	// Technical
	{
		question: "What blockchain is this on?",
		answer: "Echoes is built on Solana. Minting, ownership, and metadata are all on-chain. The collection uses Metaplex standards for full marketplace compatibility.",
		category: "technical",
	},
	{
		question: "When is reveal?",
		answer: "Reveal is instant. Each Echo resolves the moment you mint — faction alignment, signal exposure, and continuity state are reconstructed immediately. There is no separate reveal phase.",
		category: "technical",
	},

	// Desperse
	{
		question: "How is this tied to the Desperse app?",
		answer: "Echoes is built by Desperse and lives inside the same world as the platform. The collection begins at mint, but it continues inside Desperse — where open transmission, cultural spread, and identity outside gatekeeping are already the foundation.",
		category: "desperse",
	},
	{
		question: "Will the collection live inside Desperse after mint?",
		answer: "Yes. Recovered identities persist on Desperse. Posts, transmissions, and cultural signal move through the same open network that made DSPRS impossible to fully contain. The archive does not end at mint.",
		category: "desperse",
	},
	{
		question: "What does Desperse mean in the world?",
		answer: "Desperse is the human name for the open transmission layer — cultural, creator-led, shared. In Syre Group systems, it was compressed into DSPRS: machine-coded, clinical, flagged. The platform and the in-world signal share the same origin.",
		category: "desperse",
	},
]
