import { useEffect, useMemo, useState } from "react"
import { getRevealedImagesSeeded } from "@/data/echoes-images"
import { useScrollReveal } from "./hooks/useScrollReveal"
import { useEchoesMintedItems } from "./hooks/useEchoesMintedItems"

const RECORDS = [
	{ id: "0016", label: "DSPRS TRACE DETECTED // ECHO_0016", borderColor: "var(--nx-secondary-container)", labelColor: "nx-text-secondary", heavy: true },
	{ id: "002M", label: "ARCHIVE SEALED", borderColor: "transparent", labelColor: "nx-text-on-surface", heavy: false },
	{ id: "003U", label: "FACTION UNVERIFIED", borderColor: "transparent", labelColor: "nx-text-on-surface", heavy: false },
	{ id: "004C", label: "CONTINUITY FLAGGED", borderColor: "transparent", labelColor: "nx-text-on-surface", heavy: false },
	{ id: "005X", label: "IDENTITY UNRESOLVED", borderColor: "transparent", labelColor: "nx-text-on-surface", heavy: false },
	{ id: "006R", label: "SIGNAL UNSTABLE", borderColor: "transparent", labelColor: "nx-text-on-surface", heavy: false },
]

function SealedCard({ record, image, ghostFlash }: { record: (typeof RECORDS)[number]; image: string; ghostFlash?: boolean }) {
	return (
		<div
			className="w-52 sm:w-64 max-w-80 aspect-[3/4] flex-shrink-0 relative nx-bg-surface-highest overflow-hidden nx-hover-corrupt"
			style={{ borderTop: `4px solid ${record.borderColor}` }}
		>
			{/* Actual PFP image — corrupted/distorted */}
			<img
				src={image}
				alt=""
				className="absolute inset-0 w-full h-full object-cover nx-corrupted-base scale-105"
				loading="lazy"
			/>
			{/* RGB channel shift ghosts */}
			<img
				src={image}
				alt=""
				className="absolute inset-0 w-full h-full object-cover nx-corrupted-shift scale-105"
				loading="lazy"
				aria-hidden="true"
			/>
			<img
				src={image}
				alt=""
				className="absolute inset-0 w-full h-full object-cover nx-corrupted-shift-b scale-105"
				loading="lazy"
				aria-hidden="true"
			/>

			{/* Corruption overlays */}
			<div className="nx-corrupt-scanlines" />
			<div className="nx-corrupt-bars" />

			{/* Ghost flash overlay */}
			{ghostFlash && (
				<div className="absolute inset-0 flex items-center justify-center bg-[rgba(212,160,80,0.08)] pointer-events-none" aria-hidden="true">
					<span className="font-label text-[8px] tracking-[0.3em] uppercase nx-text-secondary opacity-60 rotate-[-8deg]">
						GHOST-CLASS
					</span>
				</div>
			)}

			{/* Record ID */}
			<div className="absolute top-2 right-2 font-label text-[10px] uppercase nx-text-secondary-container">
				ECHO #{record.id}
			</div>

			{/* Status label */}
			<div className={`absolute bottom-4 left-4 font-label text-[10px] tracking-widest uppercase ${record.labelColor}`}>
				{record.label}
			</div>
		</div>
	)
}

export function EchoesGallery() {
	const sectionRef = useScrollReveal<HTMLElement>()
	const [ghostIndex, setGhostIndex] = useState<number | null>(null)
	const { data: mintedData } = useEchoesMintedItems()
	const mintedIndices = useMemo(() => mintedData ? new Set(mintedData.mintedIndices) : null, [mintedData])
	const sealedImages = useMemo(() => getRevealedImagesSeeded(6, 5, mintedIndices).map((r) => r.src), [mintedIndices])

	useEffect(() => {
		// Check prefers-reduced-motion
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
		if (mq.matches) return

		const interval = setInterval(() => {
			// Random card index, show ghost flash for 200ms
			const idx = Math.floor(Math.random() * RECORDS.length)
			setGhostIndex(idx)
			setTimeout(() => setGhostIndex(null), 200)
		}, 25000 + Math.random() * 10000) // Every 25-35 seconds

		return () => clearInterval(interval)
	}, [])

	return (
		<section ref={sectionRef} className="py-12 md:py-16 overflow-hidden nx-bg-surface border-y nx-border-subtle-10" data-reveal>
			<div className="flex animate-nx-marquee whitespace-nowrap px-4">
				<div className="flex gap-4 sm:gap-8">
					{RECORDS.map((record, i) => (
						<SealedCard key={record.id} record={record} image={sealedImages[i]} ghostFlash={ghostIndex === i} />
					))}
				</div>
				{/* Duplicate for seamless loop */}
				<div className="flex gap-4 sm:gap-8 ml-4 sm:ml-8">
					{RECORDS.map((record, i) => (
						<SealedCard key={`dup-${record.id}`} record={record} image={sealedImages[i]} />
					))}
				</div>
			</div>
		</section>
	)
}
