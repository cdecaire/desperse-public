import { useMemo } from "react"
import { FACTIONS } from "@/data/echoes-factions"
import { getRevealedImagesByFaction } from "@/data/echoes-images"
import { useScrollReveal } from "./hooks/useScrollReveal"
import { useEchoesMintedItems } from "./hooks/useEchoesMintedItems"

function RevealArticle({ children, direction, className, id }: { children: React.ReactNode; direction: "left" | "right"; className: string; id: string }) {
	const ref = useScrollReveal<HTMLElement>()
	return (
		<article ref={ref} id={id} className={className} data-reveal={direction}>
			{children}
		</article>
	)
}

export function EchoesFactionGrid() {
	const { data: mintedData } = useEchoesMintedItems()
	const mintedIndices = useMemo(() => mintedData ? new Set(mintedData.mintedIndices) : null, [mintedData])

	return (
		<section id="factions" className="py-16 md:py-24 px-4 md:px-20 nx-bg-surface nx-section-divider" aria-label="Faction details">
			<div className="max-w-7xl mx-auto">
				{/* Section header */}
				<div className="mb-10 md:mb-14">
					<span className="font-label text-[10px] tracking-[0.2em] uppercase nx-text-outline block mb-3">
						FACTION_DOSSIERS // {FACTIONS.length} ACTIVE CLASSIFICATIONS
					</span>
					<h2 className="font-headline text-3xl md:text-5xl uppercase tracking-tight mb-4">
						Factions of Tessera
					</h2>
					<p className="font-body text-sm nx-text-on-surface-variant max-w-2xl">
						Every Echo comes from the same Tessera, but not the same answer to it.
						These factions emerged from one broken system and now define how identity,
						power, and survival move through the aftermath of DSPRS.
					</p>
				</div>
			</div>
			<div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
				{FACTIONS.map((faction, i) => {
					const images = getRevealedImagesByFaction(faction.name, 3, mintedIndices).map((r) => r.src)
					const isEven = i % 2 === 0

					return (
						<RevealArticle
							key={faction.slug}
							id={`faction-${faction.slug}`}
							className="relative overflow-hidden nx-bg-surface-low"
							direction={isEven ? "left" : "right"}
						>
							<div className={`absolute inset-0 bg-gradient-to-br ${faction.gradient} pointer-events-none`} />
							<div
								className="absolute top-0 left-0 w-1 h-full"
								style={{ backgroundColor: faction.accentColor }}
							/>

							<div className={`relative z-[1] flex flex-col ${isEven ? "md:flex-row" : "md:flex-row-reverse"} gap-6 md:gap-10 p-6 md:p-10`}>
								{/* Images */}
								<div className="relative w-full md:w-2/5 flex gap-3 max-h-[400px] md:max-h-[480px]">
									{images.slice(0, 3).map((img, j) => (
										<img
											key={img}
											src={img}
											alt={`${faction.name} faction representative`}
											className={`flex-1 min-w-0 object-cover ${j > 0 ? "hidden sm:block" : ""} ${j === 0 ? "nx-glitch" : ""}`}
											loading="lazy"
										/>
									))}
									{images.length === 0 && (
										<div className="flex-1 min-w-0 aspect-[3/4] nx-bg-surface-high nx-glitch flex items-center justify-center">
											<span className="font-label text-[9px] uppercase nx-text-outline">
												[ IDENTITY SEALED ]
											</span>
										</div>
									)}
									{/* Fade edges into background */}
									<div className={`absolute inset-0 pointer-events-none ${isEven ? "bg-gradient-to-l" : "bg-gradient-to-r"} from-transparent via-transparent to-[var(--nx-surface-container-low)] hidden md:block`} />
									<div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none bg-gradient-to-t from-[var(--nx-surface-container-low)] to-transparent md:hidden" />
								</div>

								{/* Content */}
								<div className="flex-1 flex flex-col justify-center">
									<span
										className="font-label text-[10px] tracking-[0.2em] uppercase mb-2 inline-block"
										style={{ color: faction.accentColor }}
									>
										{faction.tag}
									</span>
									<h2 className="font-headline text-3xl md:text-5xl uppercase mb-4">
										{faction.name}
									</h2>

									<p className="font-body text-sm md:text-base mb-6 nx-text-on-surface-variant leading-relaxed">
										{faction.fullDescription}
									</p>

									<div className="space-y-3 mb-6">
										<div className="flex items-center gap-2 font-label text-xs uppercase tracking-widest">
											<span className="nx-text-outline">Self:</span>
											<span className="nx-text-on-surface-variant">"{faction.selfDescription}"</span>
										</div>
										<div className="flex items-center gap-2 font-label text-xs uppercase tracking-widest">
											<span className="nx-text-outline">Others:</span>
											<span className="nx-text-on-surface-variant">"{faction.othersDescription}"</span>
										</div>
									</div>

									<div className="font-label text-xs uppercase tracking-widest py-3 border-y nx-border-subtle-10">
										Territory:{" "}
										<span style={{ color: faction.accentColor }}>{faction.territory}</span>
									</div>

									<div className="mt-4 font-label text-[10px] uppercase tracking-widest nx-text-outline">
										Visual: {faction.visualCues}
									</div>
								</div>
							</div>
						</RevealArticle>
					)
				})}
			</div>
		</section>
	)
}
