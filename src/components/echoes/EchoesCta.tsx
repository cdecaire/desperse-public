import { Link } from "@tanstack/react-router"
import { useMintPhase } from "./hooks/useMintPhase"
import { getRevealedImagesSeeded } from "@/data/echoes-images"
import { useScrollReveal } from "./hooks/useScrollReveal"
import { useMemo } from "react"
import { useEchoesMintedItems } from "./hooks/useEchoesMintedItems"

export function EchoesCta() {
	const phase = useMintPhase()
	const sectionRef = useScrollReveal<HTMLElement>()
	const { data: mintedData } = useEchoesMintedItems()
	const mintedIndices = useMemo(() => mintedData ? new Set(mintedData.mintedIndices) : null, [mintedData])
	const ctaImages = useMemo(() => getRevealedImagesSeeded(3, 30, mintedIndices).map((r) => r.src), [mintedIndices])

	return (
		<section ref={sectionRef} className="relative py-20 md:py-28 px-4 md:px-20 overflow-hidden nx-bg-primary-container" aria-label="Call to action" data-reveal="scale">
			{/* Atmospheric layers */}
			<div className="absolute inset-0 bg-black/10 mix-blend-overlay" aria-hidden="true" />
			<div className="absolute inset-0 scanline-overlay opacity-[0.04]" aria-hidden="true" />

			{/* PFP images as background texture */}
			<div className="absolute right-0 top-0 bottom-0 w-1/2 hidden md:flex items-stretch opacity-[0.12] pointer-events-none" aria-hidden="true">
				{ctaImages.map((img) => (
					<div key={img} className="flex-1 relative overflow-hidden">
						<img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
					</div>
				))}
				<div className="absolute inset-0 bg-gradient-to-r from-[var(--nx-primary-container)] via-transparent to-transparent" />
			</div>

			{/* Faction accent bars at top */}
			<div className="absolute top-0 left-0 right-0 flex h-[3px]" aria-hidden="true">
				<div className="flex-1" style={{ backgroundColor: "var(--nx-faction-corporate)" }} />
				<div className="flex-1" style={{ backgroundColor: "var(--nx-faction-militia)" }} />
				<div className="flex-1" style={{ backgroundColor: "var(--nx-faction-underground)" }} />
				<div className="flex-1" style={{ backgroundColor: "var(--nx-faction-fringe)" }} />
				<div className="flex-1" style={{ backgroundColor: "var(--nx-faction-zealot)" }} />
			</div>

			<div className="relative z-10 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 md:gap-12">
				<div className="max-w-2xl nx-text-on-primary-fixed">
					<span className="font-label text-[10px] tracking-[0.2em] uppercase opacity-70 block mb-3">
						{phase === "postmint" ? "ARCHIVE_RESOLVED" : "RECOVERY_PROTOCOL"}
					</span>
					<h2 className="font-headline text-3xl md:text-5xl uppercase tracking-tighter mb-4 italic">
						{phase === "postmint" ? "EXPLORE YOUR ECHO" : "RECOVER AN ECHO"}
					</h2>
					<p className="font-body text-base md:text-lg opacity-90">
						{phase === "postmint"
							? "Your identity has been reconstructed. View your Echo, explore the factions, and discover the world."
							: "Every Echo was already in the archive — scattered by the Cascade, waiting to resolve. You are the reason they come back."}
					</p>
				</div>
				<div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
					<Link
						to="/echoes/mint"
						className="font-headline px-8 md:px-12 py-4 md:py-6 min-h-[48px] uppercase skew-hover transition-colors nx-bg-on-primary-fixed nx-text-primary-container text-center"
					>
						{phase === "minting" ? "MINT NOW" : phase === "postmint" ? "VIEW GALLERY" : "VIEW MINT"}
					</Link>
					<Link
						to="/echoes/collection"
						className="font-headline px-8 md:px-12 py-4 md:py-6 min-h-[48px] uppercase skew-hover transition-colors nx-text-on-primary-fixed border-2 border-[var(--nx-on-primary-fixed)] bg-transparent hover:bg-[rgba(0,31,36,0.1)] text-center"
					>
						VIEW COLLECTION
					</Link>
				</div>
			</div>
		</section>
	)
}
