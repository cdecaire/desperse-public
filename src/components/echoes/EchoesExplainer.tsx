import { getRevealedImagesSeeded } from "@/data/echoes-images"
import { useScrollReveal } from "./hooks/useScrollReveal"
import { useMemo } from "react"
import { useEchoesMintedItems } from "./hooks/useEchoesMintedItems"

export function EchoesExplainer() {
	const sectionRef = useScrollReveal<HTMLElement>()
	const { data: mintedData } = useEchoesMintedItems()
	const mintedIndices = useMemo(() => mintedData ? new Set(mintedData.mintedIndices) : null, [mintedData])
	const images = useMemo(() => getRevealedImagesSeeded(5, 8, mintedIndices).map((r) => r.src), [mintedIndices])

	return (
		<section ref={sectionRef} className="relative py-20 md:py-32 px-4 md:px-20 nx-bg-surface-lowest overflow-hidden" aria-label="What is this">
			{/* Section accent bar */}
			<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--nx-primary-container)] to-transparent opacity-40" aria-hidden="true" />

			<div className="max-w-7xl mx-auto">
				{/* Asymmetric 2-column hero layout */}
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-16 items-center">
					{/* Left: stacked PFP composition */}
					<div className="lg:col-span-5 relative" aria-hidden="true" data-reveal="wipe">
						<div className="grid grid-cols-3 gap-2">
							<div className="col-span-2 row-span-2">
								<img
									src={images[0]}
									alt="Example Echo character"
									className="w-full aspect-[3/4] object-cover"
									loading="lazy"
								/>
							</div>
							<div className="flex flex-col gap-2">
								<img
									src={images[1]}
									alt="Example Echo character"
									className="w-full aspect-square object-cover nx-glitch"
									loading="lazy"
								/>
								<img
									src={images[2]}
									alt="Example Echo character"
									className="w-full aspect-square object-cover"
									loading="lazy"
								/>
							</div>
						</div>
						{/* Overlay label */}
						<div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[rgba(8,9,12,0.95)] to-transparent">
							<span className="font-label text-[9px] tracking-[0.2em] uppercase nx-text-primary-container">
								4,444 RECOVERED IDENTITIES // SOLANA
							</span>
						</div>
					</div>

					{/* Right: text + feature blocks */}
					<div className="lg:col-span-7">
						<span className="font-label text-[10px] tracking-[0.2em] uppercase nx-text-outline block mb-3" data-reveal-stagger style={{ "--stagger-index": 0 } as React.CSSProperties}>
							SIGNAL_BRIEFING
						</span>
						<h2 className="font-headline text-3xl md:text-5xl uppercase tracking-tight mb-6" data-reveal-stagger style={{ "--stagger-index": 1 } as React.CSSProperties}>
							A CITY WRITTEN IN SIGNAL,<br />
							<span className="nx-text-primary-container">DEBT, AND MUTATION</span>
						</h2>

						<p className="font-body text-sm md:text-base nx-text-on-surface-variant leading-relaxed mb-10 max-w-xl" data-reveal-stagger style={{ "--stagger-index": 2 } as React.CSSProperties}>
							Echoes is a generative cyberpunk PFP collection shaped by faction conflict,
							private governance, and post-human identity. Every Echo was already in the archive —
							scattered by the Cascade across Tessera's fractured infrastructure. You recover them.
						</p>

						{/* Feature blocks — stacked, not grid */}
						<div className="space-y-4">
							<div className="flex items-start gap-5 p-5 nx-bg-surface border-l-2 border-[var(--nx-primary-container)]" data-reveal-stagger style={{ "--stagger-index": 3 } as React.CSSProperties}>
								<span className="font-headline text-2xl nx-text-primary-container shrink-0 w-8">01</span>
								<div>
									<h3 className="font-headline text-sm uppercase mb-1">FACTION-DRIVEN WORLDBUILDING</h3>
									<p className="font-body text-xs nx-text-on-surface-variant">
										Five factions — Syre Group, Tessera Wardens, The Siphon, The Unwritten, The Witnesses —
										each representing a different response to power in a fractured megacity.
									</p>
								</div>
							</div>

							<div className="flex items-start gap-5 p-5 nx-bg-surface border-l-2 border-[var(--nx-secondary-container)]" data-reveal-stagger style={{ "--stagger-index": 4 } as React.CSSProperties}>
								<span className="font-headline text-2xl nx-text-secondary-container shrink-0 w-8">02</span>
								<div>
									<h3 className="font-headline text-sm uppercase mb-1">HIGH-VARIATION GENERATIVE DESIGN</h3>
									<p className="font-body text-xs nx-text-on-surface-variant">
										No two identities resolve the same way. Each character is shaped by
										signal exposure, modification depth, and continuity stability.
									</p>
								</div>
							</div>

							<div className="flex items-start gap-5 p-5 nx-bg-surface border-l-2 border-[var(--nx-secondary)]" data-reveal-stagger style={{ "--stagger-index": 5 } as React.CSSProperties}>
								<span className="font-headline text-2xl nx-text-secondary shrink-0 w-8">03</span>
								<div>
									<h3 className="font-headline text-sm uppercase mb-1">IMMERSIVE ARCHIVE REVEAL</h3>
									<p className="font-body text-xs nx-text-on-surface-variant">
										Reveal is framed as reconstruction. Sealed records unseal into full
										identities — faction, condition, and continuity emerge from the Cascade.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
