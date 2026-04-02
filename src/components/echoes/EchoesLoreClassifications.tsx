import { useScrollReveal } from "./hooks/useScrollReveal"

const CLASSIFICATIONS = [
	{
		name: "Human",
		label: "ORGANIC_BASELINE",
		description:
			"The most stable organic baseline. Human Echoes show minimal system-level reconstruction and retain coherent biological identity. They survived the Cascade without major form alteration.",
		visual: "Stable organic faces and bodies, no major system-level reconstruction artifacts",
		rarity: "Common",
	},
	{
		name: "Augmented",
		label: "ENHANCED_BIOLOGICAL",
		description:
			"Primarily biological, but visibly layered with controlled enhancement: ports, grafts, optics, neural hardware, or utilitarian body modification. Some carry Ghost-Class contamination or signal persistence.",
		visual: "Visible implants, grafts, ports, and hardware additions over a stable biological form",
		rarity: "Common",
	},
	{
		name: "Cyborg",
		label: "ORGANISM_MACHINE_MERGE",
		description:
			"A deeper merger of organism and machinery. Cyborg Echoes show more structural integration, heavier graft logic, and more visible hardware dependency than Augmented types.",
		visual: "Extensive mechanical replacement, integrated hardware, structural body modifications",
		rarity: "Uncommon",
	},
	{
		name: "Synth",
		label: "ENGINEERED_HOUSING",
		description:
			"Engineered or synthetic housings. Clean artificial construction, fabricated facial architecture, or clearly non-organic surface logic. Synths are stable, built forms — not continuity failures.",
		visual: "Stylized artificial construction, fabricated facial architecture, non-organic surfaces",
		rarity: "Uncommon",
	},
]

export function EchoesLoreClassifications() {
	const sectionRef = useScrollReveal<HTMLElement>()

	return (
		<section
			ref={sectionRef}
			id="classifications"
			className="py-20 md:py-32 px-4 md:px-20 nx-bg-surface nx-section-divider"
			aria-label="Echo Classifications"
		>
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="mb-12 md:mb-16" data-reveal>
					<span className="font-label text-[10px] tracking-[0.2em] uppercase nx-text-outline block mb-3">
						BIO_CONTINUITY_TYPES // POPULATION CLASSES
					</span>
					<h2 className="font-headline text-3xl md:text-5xl uppercase tracking-tight mb-4">
						Echo Classifications
					</h2>
					<p className="font-body text-sm nx-text-on-surface-variant max-w-2xl">
						Bio type is not the same as faction. Faction describes ideology and social position.
						Classification describes form and continuity state. Any faction may include
						more than one bio type.
					</p>
				</div>

				{/* Classification cards */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-6">
					{CLASSIFICATIONS.map((cls, i) => (
						<div
							key={cls.name}
							data-reveal-stagger
							style={{ "--stagger-index": i } as React.CSSProperties}
							className="nx-bg-surface-low p-6 md:p-8 border-l-4 nx-border-subtle-30 hover:border-[var(--nx-primary-container)] transition-colors group"
						>
							<div className="flex items-baseline justify-between mb-3">
								<h3 className="font-headline text-xl uppercase group-hover:nx-text-primary-container transition-colors">
									{cls.name}
								</h3>
								<span className="font-label text-[9px] tracking-widest uppercase nx-text-outline">
									{cls.rarity}
								</span>
							</div>
							<span className="font-label text-[9px] tracking-[0.15em] uppercase nx-text-primary-container block mb-4">
								{cls.label}
							</span>
							<p className="font-body text-sm nx-text-on-surface-variant leading-relaxed mb-4">
								{cls.description}
							</p>
							<div className="pt-3 border-t nx-border-subtle-10">
								<span className="font-label text-[9px] tracking-widest uppercase nx-text-outline">VISUAL:</span>
								<span className="font-body text-xs nx-text-on-surface-variant ml-2">{cls.visual}</span>
							</div>
						</div>
					))}
				</div>

				{/* Ghost-Class teaser */}
				<div
					data-reveal-stagger
					style={{ "--stagger-index": 4 } as React.CSSProperties}
					className="nx-bg-surface-lowest p-6 md:p-8 border border-[var(--nx-secondary-container)] border-opacity-30 relative overflow-hidden"
				>
					<div className="absolute inset-0 bg-gradient-to-r from-[rgba(var(--nx-secondary-rgb),0.04)] to-transparent pointer-events-none" aria-hidden="true" />
					<div className="relative flex items-center justify-between">
						<div>
							<span className="font-label text-[10px] nx-text-secondary tracking-[0.2em] uppercase block mb-2">
								GHOST-CLASS // CONTINUITY ANOMALY
							</span>
							<h3 className="font-headline text-xl uppercase mb-2">
								<span className="nx-text-secondary">Unknown</span>
							</h3>
							<p className="font-body text-sm nx-text-on-surface-variant max-w-xl">
								Sentient continuity remnants trapped in infrastructure after the DSPRS event.
								Not fully human, not truly artificial. Not a base body type, but a continuity
								condition — identity that persists but never fully resolves.
							</p>
						</div>
						<a
							href="#ghost-class"
							className="nx-text-secondary shrink-0 ml-6 hover:translate-y-1 transition-transform"
							aria-label="Jump to Ghost-Class section"
						>
							<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M12 5v14M5 12l7 7 7-7" />
							</svg>
						</a>
					</div>
				</div>
			</div>
		</section>
	)
}
