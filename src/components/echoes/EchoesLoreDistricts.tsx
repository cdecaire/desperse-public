import { DISTRICTS } from "@/data/echoes-districts"
import { FACTIONS } from "@/data/echoes-factions"
import { getRevealedImagesSeeded } from "@/data/echoes-images"
import { useScrollReveal } from "./hooks/useScrollReveal"
import { useMemo } from "react"
import { useEchoesMintedItems } from "./hooks/useEchoesMintedItems"

function getFactionColor(name: string): string {
	if (name === "Contested") return "var(--nx-outline)"
	return FACTIONS.find((f) => f.name === name)?.accentColor ?? "var(--nx-outline)"
}

function RevealRow({ children, className, reveal }: { children: React.ReactNode; className: string; reveal?: string }) {
	const ref = useScrollReveal<HTMLDivElement>()
	return <div ref={ref} className={className} {...(reveal ? { "data-reveal": reveal } : {})}>{children}</div>
}

export function EchoesLoreDistricts() {
	const headerRef = useScrollReveal<HTMLDivElement>()
	const { data: mintedData } = useEchoesMintedItems()
	const mintedIndices = useMemo(() => mintedData ? new Set(mintedData.mintedIndices) : null, [mintedData])
	const contestedImages = useMemo(() => getRevealedImagesSeeded(3, 42, mintedIndices).map((r) => r.src), [mintedIndices])

	return (
		<section id="districts" className="py-16 md:py-24 px-4 md:px-20 nx-bg-surface-lowest nx-section-divider" aria-label="Districts">
			<div className="max-w-7xl mx-auto">
			<div ref={headerRef} className="mb-10 md:mb-14" data-reveal>
				<span className="font-label text-[10px] tracking-[0.2em] uppercase nx-text-outline block mb-3">
					DISTRICT_MAP // {DISTRICTS.length} SECTORS
				</span>
				<h2 className="font-headline text-3xl md:text-4xl uppercase tracking-tight mb-3">
					DISTRICTS OF TESSERA
				</h2>
				<p className="font-body text-sm nx-text-on-surface-variant max-w-2xl">
					Tessera is partitioned into districts, each controlled — or contested — by a different faction.
					Movement between them requires authorization, bribery, or invisibility.
				</p>
			</div>

			{/* Alternating large/small layout */}
			<div className="space-y-4 md:space-y-6">
				{/* Row 1: 2 large districts */}
				<RevealRow className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
					{DISTRICTS.slice(0, 2).map((district, idx) => {
						const color = getFactionColor(district.controllingFaction)

						return (
							<article key={district.slug} className="nx-bg-surface-low overflow-hidden group" data-reveal-stagger style={{ "--stagger-index": idx } as React.CSSProperties} aria-label={district.name}>
								<div className="relative h-48 md:h-64 overflow-hidden">
									{district.image && (
										<img
											src={district.image}
											alt=""
											className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity scale-110"
											loading="lazy"
										/>
									)}
									<div className="absolute inset-0 nx-glitch opacity-20 pointer-events-none" />
									<div className="absolute inset-0 bg-gradient-to-t from-[rgba(var(--nx-surface-rgb),0.95)] via-[rgba(var(--nx-surface-rgb),0.4)] to-transparent" />

									<div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
										<div className="flex items-center justify-between mb-2">
											<h3 className="font-headline text-xl md:text-2xl uppercase">{district.name}</h3>
											<span className="font-label text-[9px] tracking-widest uppercase" style={{ color }}>
												{district.controllingFaction}
											</span>
										</div>
										<p className="font-body text-xs nx-text-on-surface-variant line-clamp-2">
											{district.description}
										</p>
									</div>

									<div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: color }} />
								</div>
							</article>
						)
					})}
				</RevealRow>

				{/* Row 2: 3 smaller districts */}
				<RevealRow className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
					{DISTRICTS.slice(2, 5).map((district, idx) => {
						const color = getFactionColor(district.controllingFaction)

						return (
							<article key={district.slug} className="nx-bg-surface-low overflow-hidden group" data-reveal-stagger style={{ "--stagger-index": idx } as React.CSSProperties} aria-label={district.name}>
								<div className="relative h-36 md:h-44 overflow-hidden">
									{district.image && (
										<img
											src={district.image}
											alt=""
											className="absolute inset-0 w-full h-full object-cover opacity-25 group-hover:opacity-35 transition-opacity scale-110"
											loading="lazy"
										/>
									)}
									<div className="absolute inset-0 bg-gradient-to-t from-[rgba(var(--nx-surface-rgb),0.95)] to-transparent" />

									<div className="absolute bottom-0 left-0 right-0 p-4">
										<span className="font-label text-[9px] tracking-widest uppercase block mb-1" style={{ color }}>
											{district.controllingFaction}
										</span>
										<h3 className="font-headline text-base uppercase">{district.name}</h3>
									</div>

									<div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: color }} />
								</div>

								<div className="p-4">
									<p className="font-body text-xs nx-text-on-surface-variant line-clamp-3">
										{district.description}
									</p>
								</div>
							</article>
						)
					})}
				</RevealRow>

				{/* Row 3: Dead Grid — full width, special treatment */}
				{DISTRICTS.slice(5).map((district) => {
					const color = getFactionColor(district.controllingFaction)
					const images = contestedImages

					return (
						<RevealRow key={district.slug} className="nx-bg-surface-low overflow-hidden group" reveal="wipe-up">
							<div className="relative h-40 md:h-52 overflow-hidden">
								{/* Multiple overlapping PFPs for "contested" feel */}
								<div className="absolute inset-0 flex" aria-hidden="true">
									{images.map((img) => (
										<div key={img} className="flex-1 relative overflow-hidden">
											<img src={img} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15 nx-glitch nx-glitch-heavy" loading="lazy" />
										</div>
									))}
								</div>
								<div className="absolute inset-0 bg-gradient-to-t from-[rgba(var(--nx-surface-rgb),0.95)] via-[rgba(var(--nx-surface-rgb),0.5)] to-[rgba(var(--nx-surface-rgb),0.3)]" />

								<div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
									<div className="flex items-center gap-3 mb-2">
										<span className="font-label text-[9px] tracking-widest uppercase" style={{ color }}>
											{district.controllingFaction}
										</span>
										<span className="font-label text-[8px] tracking-widest uppercase nx-text-secondary animate-nx-pulse">
											// GHOST-CLASS ACTIVITY: HIGH
										</span>
									</div>
									<h3 className="font-headline text-xl md:text-2xl uppercase mb-2">{district.name}</h3>
									<p className="font-body text-sm nx-text-on-surface-variant max-w-2xl">
										{district.description}
									</p>
								</div>

								<div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: color }} />
							</div>
						</RevealRow>
					)
				})}
			</div>
			</div>
		</section>
	)
}
