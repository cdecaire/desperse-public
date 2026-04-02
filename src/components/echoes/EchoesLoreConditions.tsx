import { useScrollReveal } from "./hooks/useScrollReveal"

const CONDITIONS = [
	{
		name: "Faction Alignment",
		explanation:
			"The primary ideological or social identity axis. Who shaped this Echo's worldview and survival model.",
		pct: 100,
		accent: "nx-text-primary-container",
		border: "border-[var(--nx-primary-container)]",
		bar: "nx-bg-primary-container",
	},
	{
		name: "Signal Exposure",
		explanation:
			"How deeply the Echo was altered by DSPRS, the Cascade, and surrounding signal environments.",
		pct: 78,
		accent: "nx-text-on-surface-variant",
		border: "nx-border-subtle-30",
		bar: "nx-bg-secondary-container",
	},
	{
		name: "Modification Grade",
		explanation:
			"How much physical or synthetic alteration is present in the form.",
		pct: 65,
		accent: "nx-text-on-surface-variant",
		border: "nx-border-subtle-30",
		bar: "nx-bg-secondary-container",
	},
	{
		name: "Continuity Status",
		explanation:
			"How stable the Echo remains after the Cascade. Stable, corrupted, despersed, or unresolved.",
		pct: 52,
		accent: "nx-text-secondary-container",
		border: "border-[var(--nx-secondary-container)]",
		bar: "nx-bg-secondary-container",
	},
	{
		name: "District Affinity",
		explanation:
			"Which part of Tessera most strongly shaped the Echo's environment and identity.",
		pct: 40,
		accent: "nx-text-on-surface-variant",
		border: "nx-border-subtle-30",
		bar: "nx-bg-primary-container",
	},
	{
		name: "Echo Classification",
		explanation:
			"The bio or continuity type of the Echo. Human, Augmented, Cyborg, Synth, or Ghost-Class.",
		pct: 8,
		accent: "nx-text-secondary",
		border: "border-[var(--nx-secondary)]",
		bar: "bg-[var(--nx-secondary)]",
		anomaly: true,
	},
]

export function EchoesLoreConditions() {
	const sectionRef = useScrollReveal<HTMLElement>()

	return (
		<section
			ref={sectionRef}
			id="conditions"
			className="py-20 md:py-32 px-4 md:px-20 nx-section-divider"
			aria-label="Archive Conditions"
		>
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="mb-12 md:mb-16" data-reveal>
					<span className="font-label text-[10px] tracking-[0.2em] uppercase nx-text-outline block mb-3">
						RESOLUTION_STATES // IDENTITY FRAMEWORK
					</span>
					<h2 className="font-headline text-3xl md:text-5xl uppercase tracking-tight mb-4">
						Archive Conditions
					</h2>
					<p className="font-body text-sm nx-text-on-surface-variant max-w-2xl">
						Each recovered Echo carries metadata shaped by faction, district,
						exposure to DSPRS, modification depth, and how much of them
						remained stable after the Cascade.
					</p>
				</div>

				{/* Condition cards — explanation-first, bar secondary */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{CONDITIONS.map((c, i) => (
						<div
							key={c.name}
							data-reveal-stagger
							style={{ "--stagger-index": i } as React.CSSProperties}
							className={`p-5 md:p-6 nx-bg-surface-low border-l-4 ${c.border}`}
						>
							<div className="flex items-baseline justify-between mb-2">
								<h3 className={`font-headline text-sm uppercase ${c.anomaly ? "nx-text-secondary" : ""}`}>
									{c.name}
								</h3>
								<span className={`font-label text-xs ${c.accent}`}>
									{c.pct}%
								</span>
							</div>
							<p className="font-body text-xs nx-text-on-surface-variant leading-relaxed mb-3">
								{c.explanation}
							</p>
							<div
								className="h-1 nx-bg-surface-high overflow-hidden"
								role="progressbar"
								aria-valuenow={c.pct}
								aria-valuemin={0}
								aria-valuemax={100}
								aria-label={`${c.name}: ${c.pct}%`}
							>
								<div className={`h-full ${c.bar}`} style={{ width: `${c.pct}%` }} />
							</div>
							{c.anomaly && (
								<div className="text-[9px] font-label nx-text-secondary tracking-[0.2em] uppercase mt-2 opacity-80">
									[ ANOMALY LAYER ]
								</div>
							)}
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
