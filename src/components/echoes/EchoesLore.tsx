import { Link } from "@tanstack/react-router"
import { getRevealedImagesSeeded } from "@/data/echoes-images"
import { useScrollReveal, useScrollProgress } from "./hooks/useScrollReveal"
import { useMemo } from "react"
import { useEchoesMintedItems } from "./hooks/useEchoesMintedItems"

export function EchoesLore() {
	const imageStripRef = useScrollProgress<HTMLDivElement>()
	const textRef = useScrollReveal<HTMLDivElement>()
	const transmissionRef = useScrollReveal<HTMLDivElement>()
	const { data: mintedData } = useEchoesMintedItems()
	const mintedIndices = useMemo(() => mintedData ? new Set(mintedData.mintedIndices) : null, [mintedData])
	const loreImages = useMemo(() => getRevealedImagesSeeded(4, 15, mintedIndices).map((r) => r.src), [mintedIndices])

	return (
		<section className="relative py-20 md:py-32 px-4 md:px-20 nx-bg-surface overflow-hidden" aria-label="Lore">
			{/* Section accent */}
			<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--nx-primary-container)] to-transparent opacity-30" aria-hidden="true" />

			{/* Full-width cinematic image strip */}
			<div ref={imageStripRef} className="relative mb-14 md:mb-20 -mx-4 md:-mx-20 overflow-hidden" aria-hidden="true" data-reveal-grow>
				<div className="flex h-48 md:h-72">
					{loreImages.map((img, i) => (
						<div key={img} className="flex-1 relative overflow-hidden">
							<img
								src={img}
								alt=""
								className={`absolute inset-0 w-full h-full object-cover ${i % 2 === 0 ? "opacity-30" : "opacity-20"}`}
								loading="lazy"
							/>
							<div className="absolute inset-0 bg-gradient-to-b from-[var(--nx-surface)] via-transparent to-[var(--nx-surface)]" />
						</div>
					))}
					{/* Overlay: system text */}
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="text-center">
							<div className="font-label text-[9px] tracking-[0.3em] uppercase nx-text-primary-container mb-2 animate-nx-pulse">
								SIGNAL_INTERCEPTED
							</div>
							<div className="font-headline text-2xl md:text-4xl uppercase tracking-tight">
								THE 3E CASCADE
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-start">
				{/* Text */}
				<div ref={textRef} data-reveal>
					<div className="flex items-center gap-4 mb-8">
						<div className="h-[1px] w-12 nx-bg-primary-container" />
						<span className="font-label text-xs tracking-[0.2em] uppercase nx-text-primary-container">
							ARCHIVE_PREVIEW
						</span>
					</div>

					<h2 className="font-headline text-3xl md:text-5xl mb-8 md:mb-10 leading-tight uppercase">
						THE SIGNAL <br /> THAT ESCAPED CONTROL
					</h2>

					<div className="space-y-6 font-body leading-relaxed nx-text-on-surface-variant">
						<p>
							Desperse began as an open transmission layer for culture and
							unlicensed expression. In Syre Group systems, it was compressed
							into DSPRS and classified under the 3E Protocol. Then it spread
							too far. After the Cascade, media became imprint, signal became
							contagion, and Tessera fractured. The Cascade ended. The fallout did not.
						</p>
						<p>
							Every Echo was already in the archive. When you mint, you are not
							generating a character — you are pulling a person out of the debris
							of the 3E Cascade. They were already in there. You are the reason
							they resolve.
						</p>
					</div>

					<div className="mt-10 md:mt-12">
						<Link
							to="/echoes/lore"
							className="inline-flex items-center gap-4 font-label uppercase tracking-widest hover:translate-x-2 transition-transform nx-text-primary-container min-h-[44px]"
						>
							<span>&gt; EXPLORE THE ARCHIVE</span>
							<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M5 12h14M12 5l7 7-7 7" />
							</svg>
						</Link>
					</div>
				</div>

				{/* Intercepted transmission block */}
				<div ref={transmissionRef} className="nx-bg-surface-lowest p-6 md:p-8 border nx-border-subtle-30 relative" data-reveal="right">
					<div className="absolute top-0 left-0 w-10 h-[1px] nx-bg-primary-container" />
					<div className="absolute top-0 left-0 w-[1px] h-10 nx-bg-primary-container" />

					<span className="font-label text-[9px] tracking-[0.2em] uppercase nx-text-outline block mb-4">
						[ INTERCEPTED_TRANSMISSION // CLEARANCE: NONE ]
					</span>

					<div className="space-y-4 font-body text-sm nx-text-on-surface-variant italic leading-relaxed">
						<p className="border-l-2 border-[var(--nx-primary-container)] pl-4">
							"At first, DSPRS looked like a tool. Then it became a protocol.
							Then it became an event."
						</p>
						<p className="border-l-2 border-[var(--nx-secondary-container)] pl-4">
							"What started as distribution became propagation. What started as
							collectible media became identity imprint."
						</p>
						<p className="border-l-2 border-[var(--nx-secondary)] pl-4">
							"Memory despersed. Signal despersed. Identity despersed."
						</p>
					</div>

					<div className="mt-6 pt-4 border-t nx-border-subtle-30">
						<div className="flex items-center gap-3 font-label text-[10px] tracking-widest uppercase nx-text-primary-container">
							<div className="w-2 h-2 rounded-full nx-bg-primary-container animate-nx-pulse" />
							THE REGISTRY OWNS IDENTITY. DESPERSE LETS IT ESCAPE.
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
