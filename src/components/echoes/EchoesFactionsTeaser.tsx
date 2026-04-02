import { useMemo, useState } from "react"
import { Link } from "@tanstack/react-router"
import { FACTIONS } from "@/data/echoes-factions"
import { getRevealedImagesByFaction } from "@/data/echoes-images"
import { useScrollReveal } from "./hooks/useScrollReveal"
import { useEchoesMintedItems } from "./hooks/useEchoesMintedItems"

export function EchoesFactionsTeaser() {
	const sectionRef = useScrollReveal<HTMLElement>()
	const [ghostDetected, setGhostDetected] = useState<string | null>(null)
	const { data: mintedData } = useEchoesMintedItems()
	const mintedIndices = useMemo(() => mintedData ? new Set(mintedData.mintedIndices) : null, [mintedData])

	return (
		<section ref={sectionRef} className="py-16 md:py-24 px-4 md:px-20 nx-bg-surface-high nx-section-divider" aria-label="Factions preview">
			<div className="max-w-7xl mx-auto">
			<div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10 md:mb-14 gap-4" data-reveal>
				<div>
					<span className="font-label text-[10px] tracking-[0.2em] uppercase nx-text-outline block mb-3">
						FACTION_INDEX
					</span>
					<h2 className="font-headline text-3xl md:text-5xl uppercase tracking-tight">
						FACTIONS OF TESSERA
					</h2>
				</div>
				<Link
					to="/echoes/lore"
					hash="factions"
					className="font-label text-xs uppercase tracking-widest nx-text-primary-container nx-hover-text transition-colors inline-flex items-center gap-2"
				>
					EXPLORE THE FACTIONS
					<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path d="M5 12h14M12 5l7 7-7 7" />
					</svg>
				</Link>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
				{FACTIONS.map((faction) => {
					const factionImages = getRevealedImagesByFaction(faction.name, 1, mintedIndices)
					const img = factionImages[0].src

					return (
						<Link
							key={faction.slug}
							to="/echoes/lore"
							hash="factions"
							data-reveal-stagger
							style={{ "--stagger-index": FACTIONS.indexOf(faction) } as React.CSSProperties}
							aria-label={`Explore ${faction.name} faction`}
							className="group relative p-5 nx-bg-surface-low overflow-hidden transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
							onMouseEnter={() => {
								if (Math.random() < 0.1) setGhostDetected(faction.slug)
							}}
							onMouseLeave={() => setGhostDetected(null)}
						>
							<div className={`absolute inset-0 bg-gradient-to-b ${faction.gradient} pointer-events-none`} />

							{/* Ghost-Class watermark */}
							{ghostDetected === faction.slug && (
								<div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10" aria-hidden="true">
									<span className="font-label text-[9px] tracking-[0.3em] uppercase opacity-30 nx-text-secondary rotate-[-12deg]">
										GHOST-CLASS DETECTED
									</span>
								</div>
							)}

							<div className="relative z-[1]">
								{img && (
									<img
										src={img}
										alt={`${faction.name} faction representative`}
										className="w-full aspect-square object-cover mb-4 opacity-70 group-hover:opacity-90 transition-opacity"
										loading="lazy"
									/>
								)}
								{!img && (
									<div className="w-full aspect-square mb-4 nx-bg-surface-high nx-glitch" />
								)}

								<span
									className="block font-label text-[9px] tracking-[0.2em] uppercase mb-1"
									style={{ color: faction.accentColor }}
								>
									{faction.tag}
								</span>
								<h3 className="font-headline text-xl uppercase mb-2">{faction.name}</h3>
								<p className="font-body text-xs nx-text-on-surface-variant line-clamp-2">
									{faction.tagline}
								</p>
							</div>
						</Link>
					)
				})}
			</div>
			</div>
		</section>
	)
}
