const FEATURES = [
	{
		icon: (
			<svg className="w-10 h-10 nx-text-primary-container" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
				<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
			</svg>
		),
		title: "Faction Alignment",
		description: "Every Echo emerges from the same system, but survives it differently. Five factions define your relationship to power, control, and the signal.",
	},
	{
		icon: (
			<svg className="w-10 h-10 nx-text-primary-container" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
				<path d="M12 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
				<path d="M2.5 22a9.5 9.5 0 0 1 19 0" />
				<circle cx="12" cy="12" r="10" />
			</svg>
		),
		title: "Despersed Identity",
		description: "No two recovered identities resolve the same way. Each character is shaped by signal exposure, modification depth, and continuity stability.",
	},
	{
		icon: (
			<svg className="w-10 h-10 nx-text-primary-container" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
				<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
				<circle cx="12" cy="12" r="3" />
			</svg>
		),
		title: "Archive Resolution",
		description: "Reveal is framed as reconstruction. Watch as sealed records are resolved — faction, condition, and continuity emerge from the despersed remnants of the Cascade.",
	},
]

import { useScrollReveal } from "./hooks/useScrollReveal"

export function EchoesLoreFeatures() {
	const sectionRef = useScrollReveal<HTMLElement>()

	return (
		<section ref={sectionRef} className="nx-bg-surface-high py-20 md:py-32 px-4 md:px-20 nx-section-divider" aria-label="Features">
			<div className="max-w-7xl mx-auto">
				<div className="flex flex-col md:flex-row justify-between items-end mb-16 md:mb-24 gap-8" data-reveal>
					<div className="max-w-2xl">
						<p className="font-label nx-text-primary-container text-xs tracking-[0.2em] uppercase mb-4">SIGNAL_ARCHITECTURE</p>
						<h2 className="font-headline text-3xl sm:text-4xl lg:text-6xl uppercase tracking-tight leading-[1.1]">The 3E Cascade</h2>
					</div>
					<p className="font-body nx-text-on-surface-variant max-w-sm text-sm border-l border-[rgba(var(--nx-primary-container-rgb),0.3)] pl-6">
						Encode. Emit. Echo. The protocol built to carry secure signal ended up carrying identity, memory, and contagion. Every Echo is a recovered node from the aftermath.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-0 border nx-border-subtle-30">
					{FEATURES.map((feature, i) => (
						<div
							key={feature.title}
							data-reveal-stagger
							style={{ "--stagger-index": i } as React.CSSProperties}
							className={`p-6 md:p-10 hover:nx-bg-surface-container transition-colors group ${i < FEATURES.length - 1 ? "border-b md:border-b-0 md:border-r nx-border-subtle-30" : ""}`}
						>
							<div className="mb-8">{feature.icon}</div>
							<h3 className="font-headline text-xl uppercase mb-4 group-hover:nx-text-primary-container transition-colors">
								{feature.title}
							</h3>
							<p className="font-body nx-text-on-surface-variant text-sm leading-relaxed">
								{feature.description}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
