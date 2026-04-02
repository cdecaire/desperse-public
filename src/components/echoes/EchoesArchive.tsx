/**
 * Stacked card components for the mint hero "Your Archive" display.
 * Shows the user's minted Echoes as a stacked card layout.
 * Empty state displays an unresolved placeholder.
 */

import { useState } from "react"
import { useEchoesNftMetadata } from "./hooks/useEchoesNftMetadata"
import { FACTION_COLORS } from "@/data/echoes-metadata"
import { ECHO_PLACEHOLDER_MASC } from "@/data/echoes-images"
import { Icon } from "@/components/ui/icon"

const heroPlaceholder = ECHO_PLACEHOLDER_MASC

// ---------------------------------------------------------------------------
// Archive Card — lazily loads metadata for a single mint
// ---------------------------------------------------------------------------

function ArchiveCard({
	mintAddress,
	style,
	className = "",
	onClick,
}: {
	mintAddress: string
	style?: React.CSSProperties
	className?: string
	onClick: () => void
}) {
	const { data: metadata, isLoading } = useEchoesNftMetadata(mintAddress)
	const faction = metadata?.attributes.find((a) => a.trait_type === "Faction")?.value as string | undefined
	const factionColor = faction ? FACTION_COLORS[faction] : undefined

	return (
		<button
			type="button"
			onClick={onClick}
			className={`group relative aspect-[3/4] overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nx-primary-container)] ${className}`}
			style={{
				clipPath: "polygon(3% 0%, 100% 0%, 97% 100%, 0% 100%)",
				...style,
			}}
			aria-label={metadata?.name ?? "View Echo"}
		>
			{/* Image */}
			{isLoading || !metadata ? (
				<div className="w-full h-full nx-bg-surface-highest animate-pulse" />
			) : (
				<img
					src={metadata.image}
					alt={metadata.name}
					className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
					draggable={false}
				/>
			)}

			{/* Faction accent bar */}
			{factionColor && (
				<div
					className="absolute bottom-0 left-0 right-0 h-[3px]"
					style={{ backgroundColor: factionColor }}
				/>
			)}

			{/* Inner shadow */}
			<div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(var(--nx-primary-container-rgb),0.12)] pointer-events-none" />

			{/* Hover overlay */}
			<div className="absolute inset-0 nx-bg-surface opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none" />
		</button>
	)
}

// ---------------------------------------------------------------------------
// MintHeroCards — stacked cards for the mint hero right column
// ---------------------------------------------------------------------------

export function MintHeroCards({
	mintAddresses,
	onCardClick,
}: {
	mintAddresses: string[]
	onCardClick: (mintAddress: string) => void
}) {
	const [activeIndex, setActiveIndex] = useState(0)
	const hasMints = mintAddresses.length > 0

	if (!hasMints) {
		// Empty state — matches archive hero card style
		return (
			<div className="aspect-[4/5] nx-bg-surface-lowest border nx-border-subtle-30 p-4 relative">
				<div className="absolute top-2 right-2 z-40 bg-[rgba(var(--nx-secondary-container-rgb),0.2)] nx-text-secondary-container px-2 py-1 text-[10px] font-label tracking-widest">
					IDENTITY UNRESOLVED
				</div>
				<div className="w-full h-full nx-bg-surface-dim overflow-hidden relative nx-glitch nx-glitch-heavy">
					<img src={heroPlaceholder} alt="" className="absolute inset-0 w-full h-full object-cover nx-corrupted-base" />
					<img src={heroPlaceholder} alt="" className="absolute inset-0 w-full h-full object-cover nx-corrupted-shift" aria-hidden="true" />
					<img src={heroPlaceholder} alt="" className="absolute inset-0 w-full h-full object-cover nx-corrupted-shift-b" aria-hidden="true" />
					<div className="nx-corrupt-scanlines" />
					<div className="nx-corrupt-bars" />
					<div className="absolute -inset-px bottom-0 top-[40%] bg-gradient-to-b from-transparent to-[rgba(var(--nx-surface-rgb),0.9)] pointer-events-none" />
					<div className="absolute bottom-4 left-4 right-4 font-label text-[10px] nx-text-primary-container space-y-1 opacity-60">
						<div className="flex justify-between"><span>SIGNAL_EXPOSURE</span><span>[|||||-----] HIGH</span></div>
						<div className="flex justify-between"><span>CONTINUITY_STATUS</span><span>UNSTABLE</span></div>
						<div className="flex justify-between"><span>FACTION_ALIGNMENT</span><span>UNRESOLVED</span></div>
					</div>
				</div>
			</div>
		)
	}

	const canPrev = activeIndex > 0
	const canNext = activeIndex < mintAddresses.length - 1

	return (
		<div className="relative w-full">
			{/* Card viewport */}
			<div className="relative aspect-square overflow-hidden">
				<div
					className="flex h-full transition-transform duration-300 ease-out"
					style={{ transform: `translateX(-${activeIndex * 100}%)` }}
				>
					{mintAddresses.map((addr) => (
						<div key={addr} className="w-full h-full shrink-0">
							<ArchiveCard
								mintAddress={addr}
								onClick={() => onCardClick(addr)}
								className="w-full h-full"
							/>
						</div>
					))}
				</div>
			</div>

			{/* Carousel controls */}
			{mintAddresses.length > 1 && (
				<div className="flex items-center justify-between mt-3">
					<button
						type="button"
						onClick={() => setActiveIndex((i) => i - 1)}
						disabled={!canPrev}
						className="w-8 h-8 flex items-center justify-center nx-text-on-surface-variant hover:nx-text-on-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
						aria-label="Previous echo"
					>
						<Icon name="chevron-left" className="text-xs" />
					</button>
					<span className="font-label text-[10px] tracking-widest uppercase nx-text-outline">
						{activeIndex + 1} / {mintAddresses.length}
					</span>
					<button
						type="button"
						onClick={() => setActiveIndex((i) => i + 1)}
						disabled={!canNext}
						className="w-8 h-8 flex items-center justify-center nx-text-on-surface-variant hover:nx-text-on-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
						aria-label="Next echo"
					>
						<Icon name="chevron-right" className="text-xs" />
					</button>
				</div>
			)}
		</div>
	)
}
