const FACTIONS = [
	{
		name: "Syre Group",
		tag: "REGISTRY_CUSTODIANS",
		tagColor: "nx-text-primary-container",
		description: "They rebuilt Tessera, then patented access to it. The Syres run the Registry and believe identity should only persist inside licensed systems.",
		gradient: "from-[rgba(var(--nx-primary-container-rgb),0.15)] to-transparent",
	},
	{
		name: "Tessera Wardens",
		tag: "DISTRICT_ENFORCEMENT",
		tagColor: "nx-text-secondary-container",
		description: "They were hired to secure Tessera. Now they collect from it. Every checkpoint is a border. Every raid is an inventory pass.",
		gradient: "from-[rgba(var(--nx-secondary-container-rgb),0.15)] to-transparent",
	},
	{
		name: "The Siphon",
		tag: "GHOST_OPERATORS",
		tagColor: "nx-text-primary",
		description: "What can still travel cannot be owned. They move people and signal through Tessera's blind zones.",
		gradient: "from-[rgba(var(--nx-on-tertiary-container-rgb),0.15)] to-transparent",
	},
	{
		name: "The Unwritten",
		tag: "CLASS-V_BIOLOGICALS",
		tagColor: "nx-text-on-surface-variant",
		description: "Some were broken by the system. Some rewrote themselves out of it. DSPRS did not just spread through networks. It spread through bodies.",
		gradient: "from-[rgba(var(--nx-outline-rgb),0.15)] to-transparent",
	},
	{
		name: "The Witnesses",
		tag: "SIGNAL_SECT",
		tagColor: "nx-text-secondary",
		description: "They do not worship gods. They worship continuation. DSPRS was the first scripture Tessera wrote for itself.",
		gradient: "from-[rgba(var(--nx-secondary-rgb),0.15)] to-transparent",
	},
]

export function EchoesLoreFactions() {
	return (
		<section className="py-20 md:py-32 px-4 md:px-20 overflow-hidden" aria-label="Factions">
			<div className="max-w-7xl mx-auto">
				<div className="text-center mb-16 md:mb-20">
					<h2 className="font-headline text-3xl sm:text-4xl md:text-5xl lg:text-7xl uppercase tracking-tighter leading-[0.95] mb-4">FACTIONS OF TESSERA</h2>
					<div className="h-1 w-24 nx-bg-primary-container mx-auto" aria-hidden="true" />
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
					{FACTIONS.map((faction) => (
						<div
							key={faction.name}
							className="relative aspect-[16/9] sm:aspect-[3/4] nx-bg-surface-high group overflow-hidden border nx-border-subtle-30"
						>
							{/* Placeholder image area */}
							<div className={`absolute inset-0 bg-gradient-to-b ${faction.gradient} opacity-30 group-hover:opacity-50 transition-opacity duration-700`} aria-hidden="true" />
							<div className="absolute inset-0" aria-hidden="true">
								<div className="w-full h-full bg-gradient-to-b from-transparent via-transparent to-[var(--nx-surface-container-lowest)]" />
							</div>

							<div className="absolute bottom-6 left-6 right-6 z-10">
								<p className={`font-label text-xs ${faction.tagColor} uppercase tracking-[0.2em] mb-2`}>
									{faction.tag}
								</p>
								<h3 className="font-headline text-xl sm:text-2xl uppercase leading-tight mb-2">
									{faction.name}
								</h3>
								<p className="font-body text-xs nx-text-on-surface-variant opacity-70 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300">
									{faction.description}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
