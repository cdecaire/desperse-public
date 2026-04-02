import { getRevealedImagesSeeded } from "@/data/echoes-images"
import { useScrollReveal } from "./hooks/useScrollReveal"
import { useMemo } from "react"
import { useEchoesMintedItems } from "./hooks/useEchoesMintedItems"

export function EchoesMintSamples() {
	const sectionRef = useScrollReveal<HTMLElement>()
	const { data: mintedData } = useEchoesMintedItems()
	const mintedIndices = useMemo(() => mintedData ? new Set(mintedData.mintedIndices) : null, [mintedData])
	const sampleImages = useMemo(() => getRevealedImagesSeeded(8, 3, mintedIndices), [mintedIndices])

	return (
		<section ref={sectionRef} className="py-16 md:py-24 px-4 md:px-20 nx-bg-surface nx-section-divider" aria-label="Sample echoes">
			<div className="max-w-7xl mx-auto">
			<div className="text-center mb-10 md:mb-14" data-reveal>
				<span className="font-label text-[10px] tracking-[0.2em] uppercase nx-text-outline block mb-3">
					ARCHIVE_PREVIEW
				</span>
				<h2 className="font-headline text-2xl md:text-4xl uppercase tracking-tight mb-3">
					SAMPLE RECOVERED IDENTITIES
				</h2>
				<p className="font-body text-sm nx-text-on-surface-variant max-w-lg mx-auto">
					These are sample identities from the archive. Each mint produces a unique Echo —
					no two resolve the same way.
				</p>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
				{sampleImages.map((item, i) => (
					<div key={`${item.index}-${i}`} className="relative group" data-reveal-stagger style={{ "--stagger-index": i } as React.CSSProperties}>
						<img
							src={item.src}
							alt={item.revealed ? `Sample Echo ${item.index}` : "Unresolved Echo"}
							className={`w-full aspect-[3/4] object-cover group-hover:opacity-80 transition-opacity ${!item.revealed ? "grayscale-[0.3] opacity-80" : ""}`}
							loading="lazy"
						/>
						<div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-[rgba(8,9,12,0.9)] to-transparent">
							<span className="font-label text-[9px] tracking-widest uppercase nx-text-outline">
								{item.revealed ? `ECHO_${String(item.index).padStart(4, "0")}` : "UNRESOLVED"}
							</span>
						</div>
					</div>
				))}
			</div>
			</div>
		</section>
	)
}
