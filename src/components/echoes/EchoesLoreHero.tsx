import { getRevealedImagesSeeded } from "@/data/echoes-images"
import { useScrollReveal } from "./hooks/useScrollReveal"
import { useMemo } from "react"
import { useEchoesMintedItems } from "./hooks/useEchoesMintedItems"

export function EchoesLoreHero() {
	const heroRef = useScrollReveal<HTMLElement>({ threshold: 0.1 })
	const { data: mintedData } = useEchoesMintedItems()
	const mintedIndices = useMemo(() => mintedData ? new Set(mintedData.mintedIndices) : null, [mintedData])
	const heroImage = useMemo(() => getRevealedImagesSeeded(1, 22, mintedIndices)[0].src, [mintedIndices])

	return (
		<section ref={heroRef} className="relative min-h-[60vh] flex items-center justify-center overflow-hidden px-4 md:px-20 py-24" aria-label="Hero">
			{/* Background */}
			<div className="absolute inset-0 z-0">
				<div className="absolute inset-0 bg-gradient-to-t from-[var(--nx-surface)] via-transparent to-transparent z-10" />
				<div className="w-full h-full nx-bg-surface-lowest opacity-40 nx-glitch">
					<div className="w-full h-full bg-gradient-to-br from-[rgba(var(--nx-primary-container-rgb),0.08)] via-transparent to-[rgba(var(--nx-on-tertiary-container-rgb),0.05)]" />
				</div>
			</div>

			<div className="relative z-20 max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
				<div className="lg:col-span-7">
					<div className="inline-block border border-[rgba(var(--nx-primary-container-rgb),0.3)] px-3 py-1 mb-6" data-reveal-stagger style={{ "--stagger-index": 0 } as React.CSSProperties}>
						<span className="nx-text-primary-container font-label text-xs tracking-[0.2em] uppercase">
							[ REGISTRY_BREACH_DETECTED ]
						</span>
					</div>

					<h1 className="font-headline text-4xl sm:text-5xl md:text-7xl lg:text-8xl tracking-[-0.04em] mb-6 leading-[0.95] uppercase" data-reveal-stagger style={{ "--stagger-index": 1 } as React.CSSProperties}>
						THE <span className="nx-text-primary-container">ARCHIVE</span>
					</h1>

					<p className="font-body text-base sm:text-xl nx-text-on-surface-variant max-w-xl mb-8 md:mb-10 leading-relaxed" data-reveal-stagger style={{ "--stagger-index": 2 } as React.CSSProperties}>
						This archive documents the world behind Echoes: the Registry that controls Tessera,
						the DSPRS event that destabilized identity, the factions that emerged in response,
						and the Echo classifications that still resist clean explanation.
					</p>

					<div className="flex flex-col sm:flex-row gap-4 mb-8 md:mb-16" data-reveal-stagger style={{ "--stagger-index": 3 } as React.CSSProperties}>
						<a
							href="#factions"
							className="nx-bg-primary-container nx-text-on-primary-fixed px-8 sm:px-10 py-4 font-headline uppercase tracking-widest skew-hover text-center focus-visible:outline-2 focus-visible:outline-[var(--nx-primary-container)] focus-visible:outline-offset-2"
						>
							VIEW FACTIONS
						</a>
						<a
							href="#timeline"
							className="border nx-border-outline-variant nx-text-on-surface px-8 sm:px-10 py-4 font-headline uppercase tracking-widest skew-hover hover:bg-[rgba(var(--nx-on-surface-rgb),0.05)] transition-colors text-center focus-visible:outline-2 focus-visible:outline-[var(--nx-primary-container)] focus-visible:outline-offset-2"
						>
							ENTER THE ARCHIVE
						</a>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 border-t nx-border-subtle pt-8" data-reveal-stagger style={{ "--stagger-index": 4 } as React.CSSProperties}>
						<div>
							<p className="font-label text-xs nx-text-on-surface-variant uppercase tracking-widest mb-1">ARCHIVE_SLOTS</p>
							<p className="font-headline text-2xl">8,888</p>
						</div>
						<div>
							<p className="font-label text-xs nx-text-on-surface-variant uppercase tracking-widest mb-1">FACTIONS</p>
							<p className="font-headline text-2xl">5</p>
						</div>
						<div>
							<p className="font-label text-xs nx-text-on-surface-variant uppercase tracking-widest mb-1">DISTRICTS</p>
							<p className="font-headline text-2xl">6 SECTORS</p>
						</div>
					</div>
				</div>

				<div className="hidden lg:block lg:col-span-5 relative overflow-hidden" aria-hidden="true" data-reveal="wipe-right">
					<div className="aspect-[4/5] nx-bg-surface-lowest border nx-border-subtle-30 p-4 relative group">
						<div className="absolute top-2 right-2 z-40 bg-[rgba(var(--nx-secondary-container-rgb),0.2)] nx-text-secondary-container px-2 py-1 text-[10px] font-label tracking-widest">
							IDENTITY UNRESOLVED
						</div>
						<div className="w-full h-full nx-bg-surface-dim overflow-hidden relative nx-glitch nx-glitch-heavy">
							<img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover nx-corrupted-base" />
							<img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover nx-corrupted-shift" aria-hidden="true" />
							<img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover nx-corrupted-shift-b" aria-hidden="true" />
							<div className="nx-corrupt-scanlines" />
							<div className="nx-corrupt-bars" />
							{/* Bottom gradient for text readability */}
							<div className="absolute -inset-px bottom-0 top-[40%] bg-gradient-to-b from-transparent to-[rgba(var(--nx-surface-rgb),0.9)] pointer-events-none" />
							{/* Metadata overlays */}
							<div className="absolute bottom-4 left-4 right-4 font-label text-[10px] nx-text-primary-container space-y-1 opacity-60">
								<div className="flex justify-between"><span>SIGNAL_EXPOSURE</span><span>[|||||-----] HIGH</span></div>
								<div className="flex justify-between"><span>CONTINUITY_STATUS</span><span>UNSTABLE</span></div>
								<div className="flex justify-between"><span>FACTION_ALIGNMENT</span><span>UNRESOLVED</span></div>
							</div>
						</div>
						<div className="absolute -bottom-6 -right-6 w-32 h-32 border-b-2 border-r-2 border-[rgba(var(--nx-primary-container-rgb),0.2)]" />
					</div>
				</div>
			</div>
		</section>
	)
}
