import { FACTION_CONFLICTS, FACTIONS } from "@/data/echoes-factions"
import { useScrollReveal } from "./hooks/useScrollReveal"

function getFactionColor(name: string): string {
	return FACTIONS.find((f) => f.name === name)?.accentColor ?? "var(--nx-outline)"
}

export function EchoesFactionConflicts() {
	const sectionRef = useScrollReveal<HTMLElement>()

	return (
		<section ref={sectionRef} id="conflicts" className="py-16 md:py-24 px-4 md:px-20 nx-bg-surface-high nx-section-divider" aria-label="Faction conflicts">
			<div className="max-w-7xl mx-auto">
			<div className="mb-10 md:mb-14" data-reveal>
				<span className="font-label text-[10px] tracking-[0.2em] uppercase nx-text-outline block mb-3">
					CONFLICT_MAP // 10 ACTIVE TENSIONS
				</span>
				<h2 className="font-headline text-3xl md:text-4xl uppercase tracking-tight mb-3">
					FACTION TENSIONS
				</h2>
				<p className="font-body text-sm nx-text-on-surface-variant max-w-2xl">
					No faction operates in isolation. Every alliance is temporary. Every border is contested.
					These are the fault lines that define Tessera.
				</p>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 max-w-5xl">
				{FACTION_CONFLICTS.map((conflict, idx) => (
					<article
						key={conflict.label}
						data-reveal-stagger
						style={{ "--stagger-index": idx } as React.CSSProperties}
						className="flex items-stretch nx-bg-surface-low overflow-hidden group hover:nx-bg-surface-high transition-colors"
						aria-label={`${conflict.factions[0]} versus ${conflict.factions[1]}: ${conflict.label}`}
					>
						{/* Color bar */}
						<div className="w-1 shrink-0 flex flex-col">
							<div className="flex-1" style={{ backgroundColor: getFactionColor(conflict.factions[0]) }} />
							<div className="flex-1" style={{ backgroundColor: getFactionColor(conflict.factions[1]) }} />
						</div>

						<div className="p-4 md:p-5 flex-1">
							<div className="flex items-center gap-2 mb-2">
								<span
									className="font-label text-[10px] uppercase tracking-widest"
									style={{ color: getFactionColor(conflict.factions[0]) }}
								>
									{conflict.factions[0]}
								</span>
								<span className="font-headline text-xs nx-text-outline">vs</span>
								<span
									className="font-label text-[10px] uppercase tracking-widest"
									style={{ color: getFactionColor(conflict.factions[1]) }}
								>
									{conflict.factions[1]}
								</span>
							</div>
							<div className="font-headline text-sm uppercase mb-1 nx-text-secondary">
								{conflict.label}
							</div>
							<p className="font-body text-xs nx-text-on-surface-variant">
								{conflict.description}
							</p>
						</div>
					</article>
				))}
			</div>
			</div>
		</section>
	)
}
