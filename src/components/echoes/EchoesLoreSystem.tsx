import { getRevealedImagesSeeded } from "@/data/echoes-images"
import { useScrollReveal } from "./hooks/useScrollReveal"
import { useMemo } from "react"
import { useEchoesMintedItems } from "./hooks/useEchoesMintedItems"

export function EchoesLoreSystem() {
	const sectionRef = useScrollReveal<HTMLElement>()
	const { data: mintedData } = useEchoesMintedItems()
	const mintedIndices = useMemo(() => mintedData ? new Set(mintedData.mintedIndices) : null, [mintedData])
	const storyImages = useMemo(() => getRevealedImagesSeeded(2, 37, mintedIndices).map((r) => r.src), [mintedIndices])

	return (
		<section
			ref={sectionRef}
			id="system"
			className="py-20 md:py-32 px-4 md:px-20 nx-bg-surface-lowest nx-section-divider relative"
			aria-label="Tessera and the System"
		>
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="mb-12 md:mb-16" data-reveal>
					<p className="font-label text-xs nx-text-on-surface-variant mb-4 uppercase tracking-[0.2em]">
						[ FILE: DSPRS_SIGNAL_HISTORY ]
					</p>
					<h2 className="font-headline text-3xl md:text-5xl uppercase leading-tight">
						The Registry & The Signal
					</h2>
				</div>

				{/* Two-column content */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-start">
					{/* Text column */}
					<div className="space-y-6 font-body nx-text-on-surface-variant text-sm leading-relaxed" data-reveal="left">
						<p>
							Tessera no longer runs on public systems. It runs on licensed access.
							Identity, movement, housing, work, medicine, and continuity are controlled
							by a privatized infrastructure layer known as The Registry. If the Registry
							can verify you, you can move through Tessera. If it cannot, doors close,
							transit halts, and your existence begins to fall out of the official record.
						</p>

						{/* Pull quote */}
						<blockquote className="relative p-5 nx-bg-surface border-l-2 border-[var(--nx-primary-container)] my-8 not-italic">
							<span className="font-label text-[8px] tracking-[0.2em] uppercase nx-text-outline block mb-2">
								INTERCEPTED // SIGNAL_FRAGMENT_0042
							</span>
							<p className="font-body text-base nx-text-primary italic leading-relaxed">
								"At first, people opted in. Then landlords required it. Then employers
								required it. Then Tessera itself disappeared behind it."
							</p>
						</blockquote>

						<p>
							Desperse emerged in reaction. An open transmission layer for culture,
							collectible identity, and unlicensed expression. In Syre Group files,
							the name was compressed into DSPRS. Then an experimental neural
							transmission layer was built on top of it. The 3E Protocol could do
							more than move files. It could carry affective residue, sensory traces,
							memory fragments, and encoded identity signatures.
						</p>

						<p>
							Then came the Cascade. The protocol propagated through archive nodes,
							relay towers, civic overflow servers, implant firmware, clinic wetware,
							and illicit storage caches. Some people were changed by it. Some
							disappeared into it. Some became convinced that something inside the
							system had started listening back.
						</p>

						{/* Pull quote 2 */}
						<blockquote className="relative p-5 nx-bg-surface border-l-2 border-[var(--nx-secondary-container)] my-8 not-italic">
							<span className="font-label text-[8px] tracking-[0.2em] uppercase nx-text-outline block mb-2">
								INTERCEPTED // DEAD_CHANNEL_BROADCAST
							</span>
							<p className="font-body text-base nx-text-secondary italic leading-relaxed">
								"What started as distribution became propagation. What started as
								collectible media became identity imprint. What started as signal
								became contagion."
							</p>
						</blockquote>
					</div>

					{/* Right column: image + 3E Protocol */}
					<div className="space-y-8" data-reveal="right">
						{/* Stacked images */}
						<div className="grid grid-cols-2 gap-3" aria-hidden="true">
							{storyImages.map((img, i) => (
								<div key={img} className="relative overflow-hidden">
									<img
										src={img}
										alt=""
										className={`w-full aspect-[3/4] object-cover nx-corrupted-base ${i > 0 ? "nx-glitch" : ""}`}
										loading="lazy"
									/>
									<div className="absolute inset-0 bg-gradient-to-t from-[var(--nx-surface-container-lowest)] to-transparent" />
									<span className="absolute bottom-2 left-2 font-label text-[8px] tracking-widest uppercase nx-text-outline">
										[ {i === 0 ? "Signal wave spreading through Tessera infrastructure" : "Syre Group firewall breach visualization"} ]
									</span>
								</div>
							))}
						</div>

						{/* 3E Protocol — Triple Meaning */}
						<div className="p-6 md:p-8 border nx-border-subtle-30 nx-bg-surface relative">
							<div className="absolute top-0 left-0 w-10 h-[1px] nx-bg-primary-container" />
							<div className="absolute top-0 left-0 w-[1px] h-10 nx-bg-primary-container" />

							<h3 className="font-headline text-lg uppercase mb-6 nx-text-primary-container">
								THE 3E PROTOCOL
							</h3>
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
								<div className="p-3 nx-bg-surface-lowest border-l-2 border-[var(--nx-primary-container)]">
									<span className="font-label text-[9px] tracking-widest uppercase nx-text-outline block mb-2">
										SYRE GROUP
									</span>
									<div className="font-headline text-sm uppercase space-y-0.5">
										<div>Encode</div>
										<div>Emit</div>
										<div>Echo</div>
									</div>
								</div>
								<div className="p-3 nx-bg-surface-lowest border-l-2 border-[var(--nx-secondary-container)]">
									<span className="font-label text-[9px] tracking-widest uppercase nx-text-outline block mb-2">
										STREET
									</span>
									<div className="font-headline text-sm uppercase space-y-0.5">
										<div>Expression</div>
										<div>Exchange</div>
										<div>Escape</div>
									</div>
								</div>
								<div className="p-3 nx-bg-surface-lowest border-l-2 border-[var(--nx-secondary)]">
									<span className="font-label text-[9px] tracking-widest uppercase nx-text-outline block mb-2">
										WITNESSES
									</span>
									<div className="font-headline text-sm uppercase space-y-0.5 nx-text-secondary">
										<div>The Three</div>
										<div>Echoes</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
