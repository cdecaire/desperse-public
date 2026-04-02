import { FACTIONS } from "@/data/echoes-factions"
import { useScrollReveal } from "./hooks/useScrollReveal"

export function EchoesFactionHero() {
	const heroRef = useScrollReveal<HTMLElement>({ threshold: 0.1 })

	return (
		<header ref={heroRef} className="relative pt-24 md:pt-32 pb-16 md:pb-20 px-4 md:px-20 nx-bg-surface-lowest overflow-hidden" aria-label="Factions hero">
			{/* Animated faction color bars */}
			<div className="absolute bottom-0 left-0 right-0 flex h-1" aria-hidden="true">
				{FACTIONS.map((f) => (
					<div
						key={f.slug}
						className="flex-1 animate-nx-pulse"
						style={{ backgroundColor: f.accentColor, animationDelay: `${FACTIONS.indexOf(f) * 0.4}s` }}
					/>
				))}
			</div>

			<div className="relative z-10 max-w-7xl mx-auto">
				<div className="max-w-4xl">
				<span className="font-label text-[10px] tracking-[0.2em] uppercase nx-text-outline block mb-4" data-reveal-stagger style={{ "--stagger-index": 0 } as React.CSSProperties}>
					FACTION_REGISTRY // {FACTIONS.length} ACTIVE CLASSIFICATIONS
				</span>

				<h1 className="font-headline text-4xl sm:text-6xl md:text-8xl tracking-[-0.05em] leading-[1.1] mb-6 uppercase" data-reveal-stagger style={{ "--stagger-index": 1 } as React.CSSProperties}>
					FACTIONS OF <br />
					<span className="nx-text-primary-container">TESSERA</span>
				</h1>

				<p className="font-body text-base md:text-xl max-w-2xl pl-4 md:pl-6 nx-text-on-surface-variant border-l-2 border-[var(--nx-primary-container)]" data-reveal-stagger style={{ "--stagger-index": 2 } as React.CSSProperties}>
					Every Echo comes from the same Tessera, but not the same answer to it.
					These factions emerged from one broken system and now define how identity,
					power, and survival move through the aftermath of DSPRS.
				</p>
				</div>
			</div>

			{/* Decorative signal grid */}
			<div className="absolute right-0 top-0 w-1/2 h-full opacity-10 pointer-events-none" aria-hidden="true">
				<div className="w-full h-full bg-gradient-to-bl from-[rgba(0,191,166,0.1)] via-transparent to-transparent" />
			</div>
		</header>
	)
}
