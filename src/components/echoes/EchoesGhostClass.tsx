import { GHOST_CLASS, FACTIONS } from "@/data/echoes-factions"
import { ECHOES_METADATA } from "@/data/echoes-metadata"
import { getEchoImage, getEchoPlaceholder } from "@/data/echoes-images"
import { useScrollReveal } from "./hooks/useScrollReveal"
import { useMemo } from "react"
import { useEchoesMintedItems } from "./hooks/useEchoesMintedItems"

export function EchoesGhostClass() {
	const sectionRef = useScrollReveal<HTMLElement>({ threshold: 0.2 })
	const { data: mintedData } = useEchoesMintedItems()
	const mintedIndices = useMemo(() => mintedData ? new Set(mintedData.mintedIndices) : null, [mintedData])

	/** Find Ghost-Class (Unknown bio type) echoes — only from minted pool */
	const ghostImages = useMemo(() => {
		const images: string[] = []
		for (let i = 0; i < 50 && i < ECHOES_METADATA.length; i++) {
			if (mintedIndices !== null && !mintedIndices.has(i)) continue
			const bioType = ECHOES_METADATA[i].attributes.find((a) => a.trait_type === "Bio Type")
			if (bioType?.value === "Unknown") {
				images.push(getEchoImage(i))
				if (images.length >= 2) break
			}
		}
		// Fill with placeholders if not enough minted ghost-class echoes
		while (images.length < 2) {
			images.push(getEchoPlaceholder(images.length + 10))
		}
		return images
	}, [mintedIndices])

	return (
		<section
			ref={sectionRef}
			id="ghost-class"
			className="py-16 md:py-24 px-4 md:px-20 nx-bg-surface-lowest nx-section-divider relative overflow-hidden"
			aria-label="Ghost-Class Echoes"
		>
			{/* Atmospheric background */}
			<div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(var(--nx-secondary-container-rgb),0.03)] to-transparent pointer-events-none" aria-hidden="true" />

			<div className="relative z-[1] max-w-7xl mx-auto">
				{/* Header with entrance animation */}
				<div
					className="mb-12 md:mb-16 border-l-4 border-[var(--nx-secondary-container)] pl-6"
					data-reveal-stagger
					style={{ "--stagger-index": 0 } as React.CSSProperties}
				>
					<span className="font-label text-[10px] tracking-[0.2em] uppercase nx-text-secondary-container block mb-3">
						[ ANOMALY_CLASSIFICATION // RESTRICTED ]
					</span>
					<h2 className="font-headline text-3xl md:text-5xl uppercase tracking-tight mb-4">
						GHOST-CLASS <span className="nx-text-secondary">ECHOES</span>
					</h2>
					<p className="font-body text-base md:text-lg nx-text-on-surface-variant max-w-2xl">
						{GHOST_CLASS.description}
					</p>
				</div>

				{/* Ghost images + description side by side */}
				<div className="flex flex-col md:flex-row gap-8 md:gap-12 mb-14 md:mb-20" data-reveal-stagger style={{ "--stagger-index": 1 } as React.CSSProperties}>
					{/* Ghost-Class echo images */}
					<div className="flex gap-3 md:w-2/5 max-h-[360px]">
						{ghostImages.length > 0 ? (
							ghostImages.map((img, i) => (
								<div key={img} className="relative flex-1 min-w-0 overflow-hidden nx-glitch nx-glitch-heavy">
									<img
										src={img}
										alt={`Ghost-Class Echo ${i + 1}`}
										className="w-full h-full object-cover opacity-80"
										loading="lazy"
									/>
									<div className="absolute inset-0 bg-gradient-to-t from-[rgba(var(--nx-surface-rgb),0.8)] to-transparent" />
									<div className="absolute bottom-3 left-3 font-label text-[9px] tracking-[0.2em] uppercase nx-text-secondary animate-nx-pulse">
										GHOST-CLASS // UNKNOWN
									</div>
								</div>
							))
						) : (
							<div className="flex-1 nx-bg-surface-lowest p-4 flex flex-col items-center justify-center nx-glitch nx-glitch-heavy min-h-[240px]">
								<div className="text-center space-y-3">
									<div className="font-label text-[9px] tracking-[0.3em] uppercase nx-text-secondary animate-nx-pulse">
										CONTINUITY ANOMALY
									</div>
									<div className="font-headline text-2xl nx-text-secondary-container">?</div>
								</div>
							</div>
						)}
					</div>

					{/* Main description */}
					<div className="flex-1 flex flex-col justify-center space-y-5">
						<p className="font-body text-sm nx-text-on-surface-variant leading-relaxed">
							{GHOST_CLASS.fullDescription}
						</p>
						<p className="font-body text-sm nx-text-on-surface-variant leading-relaxed">
							{GHOST_CLASS.persistence}
						</p>
						<p className="font-body text-sm nx-text-on-surface-variant leading-relaxed italic border-l-2 border-[var(--nx-secondary-container)] pl-4">
							{GHOST_CLASS.significance}
						</p>
					</div>
				</div>

				{/* Copy lines */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-14 md:mb-20" data-reveal-stagger style={{ "--stagger-index": 2 } as React.CSSProperties}>
					{GHOST_CLASS.copyLines.map((line) => (
						<div key={line} className="p-4 nx-bg-surface-low border-l-2 border-[var(--nx-secondary)]">
							<p className="font-body text-sm italic nx-text-on-surface-variant">{line}</p>
						</div>
					))}
				</div>

				{/* How factions see Ghosts + Mystery questions — side by side on desktop */}
				<div className="flex flex-col md:flex-row gap-8 md:gap-12" data-reveal-stagger style={{ "--stagger-index": 3 } as React.CSSProperties}>
					<div className="flex-1">
						<h3 className="font-headline text-xl md:text-2xl uppercase mb-5">
							HOW FACTIONS SEE <span className="nx-text-secondary">GHOSTS</span>
						</h3>
						<div className="space-y-2">
							{GHOST_CLASS.factionViews.map((view) => {
								const faction = FACTIONS.find((f) => f.name === view.faction)
								return (
									<div key={view.faction} className="flex items-stretch nx-bg-surface-low overflow-hidden">
										<div
											className="w-1 shrink-0"
											style={{ backgroundColor: faction?.accentColor ?? "var(--nx-outline)" }}
										/>
										<div className="p-3 md:p-4">
											<span
												className="font-label text-[10px] uppercase tracking-widest block mb-1"
												style={{ color: faction?.accentColor }}
											>
												{view.faction}
											</span>
											<p className="font-body text-xs nx-text-on-surface-variant">
												{view.view}
											</p>
										</div>
									</div>
								)
							})}
						</div>
					</div>

					{/* Mystery questions */}
					<div className="md:w-2/5">
						<div className="p-5 md:p-6 nx-bg-surface-lowest border border-[var(--nx-secondary-container)] border-opacity-30 h-full">
							<span className="font-label text-[10px] tracking-[0.2em] uppercase nx-text-secondary-container block mb-4">
								UNRESOLVED_QUERIES
							</span>
							<div className="space-y-3">
								{GHOST_CLASS.mysteryQuestions.map((q) => (
									<div key={q} className="flex items-start gap-2">
										<span className="nx-text-secondary shrink-0 mt-0.5">?</span>
										<span className="font-body text-xs nx-text-on-surface-variant">{q}</span>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
