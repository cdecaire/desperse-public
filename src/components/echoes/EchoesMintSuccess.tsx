/**
 * Mint confirm + reveal modal.
 *
 * Phases:
 *   confirming  — scanner bar, lore text (waiting for on-chain confirmation)
 *   power-on    — monitor boot: center dot → corner markers → subtle flash
 *   glitching   — archive-style glitched image fades in, stabilizes
 *   revealed    — image slides left, modal expands, detail panel appears
 *
 * Press Space to skip the animation at any point after confirmation.
 */

import { useEffect, useRef, useState, useCallback } from "react"
import { FACTION_COLORS, RANK_COLORS } from "@/data/echoes-metadata"
import { Icon } from "@/components/ui/icon"
import type { EchoesMintStep } from "./hooks/useEchoesMint"

interface MintedMetadata {
	name: string
	description: string
	image: string
	attributes: Array<{ trait_type: string; value: string | number; display_type?: string }>
}

const HIDDEN_TRAITS = new Set(["Rarity Rank", "Rarity Score", "Faction", "Rank"])

function getTrait(attrs: MintedMetadata["attributes"], type: string): string {
	const val = attrs.find((a) => a.trait_type === type)?.value
	return val != null ? String(val) : "None"
}

function getRarityRank(attrs: MintedMetadata["attributes"]): number {
	const val = attrs.find((a) => a.trait_type === "Rarity Rank")?.value
	return typeof val === "number" ? val : 0
}

function getRevealConfig(rank: string) {
	switch (rank.toLowerCase()) {
		case "legendary": return { glitchDuration: 3000, glitchIntensity: 5, flashColor: "#D4A050", particleCount: 24 }
		case "elite": return { glitchDuration: 2200, glitchIntensity: 4, flashColor: "#A87CA0", particleCount: 16 }
		case "rare": return { glitchDuration: 1800, glitchIntensity: 3, flashColor: "#00BFA6", particleCount: 10 }
		case "uncommon": return { glitchDuration: 1400, glitchIntensity: 2, flashColor: "#4A90C2", particleCount: 6 }
		default: return { glitchDuration: 1000, glitchIntensity: 1, flashColor: "#888", particleCount: 0 }
	}
}

// Lore-flavored confirming messages that cycle
const CONFIRMING_MESSAGES = [
	"LOCATING SIGNAL IN THE TESSERA",
	"CROSS-REFERENCING ARCHIVE FRAGMENTS",
	"DECRYPTING IDENTITY SIGNATURE",
	"RESOLVING ECHO FROM THE CASCADE",
	"VERIFYING BREACH COORDINATES",
]

type RevealPhase = "confirming" | "power-on" | "glitching" | "revealed"

export function EchoesMintSuccess({
	nftMintAddress,
	mintStep,
	onClose,
	onMintAnother,
	skipAnimation,
	viewMode,
	onPrev,
	onNext,
}: {
	nftMintAddress: string | null
	mintStep: EchoesMintStep
	onClose: () => void
	onMintAnother: () => void
	skipAnimation?: boolean
	viewMode?: boolean
	onPrev?: () => void
	onNext?: () => void
}) {
	const [metadata, setMetadata] = useState<MintedMetadata | null>(null)
	const [phase, setPhase] = useState<RevealPhase>(skipAnimation ? "revealed" : "confirming")
	const [isVisible, setIsVisible] = useState(false)
	const [glitchFrame, setGlitchFrame] = useState(0)
	const [imageLoaded, setImageLoaded] = useState(skipAnimation ?? false)
	const [confirmMsg, setConfirmMsg] = useState(0)
	const [powerOnStep, setPowerOnStep] = useState(skipAnimation ? 3 : 0)
	const [skipped, setSkipped] = useState(skipAnimation ?? false)
	const imgRef = useRef<HTMLImageElement>(null)
	const phaseRef = useRef(phase)
	phaseRef.current = phase

	const faction = metadata ? getTrait(metadata.attributes, "Faction") : null
	const rank = metadata ? getTrait(metadata.attributes, "Rank") : "Common"
	const rarityRank = metadata ? getRarityRank(metadata.attributes) : 0
	const revealConfig = getRevealConfig(rank)

	// ── Skip handler ──
	const skipToReveal = useCallback(() => {
		if (phaseRef.current === "confirming") return // can't skip blockchain confirmation
		setSkipped(true)
		setPowerOnStep(3)
		setPhase("revealed")
	}, [])

	// ── Fetch metadata once we have a mint address ──
	useEffect(() => {
		if (!nftMintAddress) return
		async function fetchMetadata() {
			try {
				const res = await fetch(`/api/v1/pfp/metadata?mint=${nftMintAddress}`)
				const json = await res.json() as {
					success: boolean
					data?: { name: string; uri: string; metadata: MintedMetadata }
				}
				if (json.success && json.data?.metadata) {
					setMetadata(json.data.metadata)
				}
			} catch (err) {
				console.warn("[MintSuccess] Failed to fetch metadata:", err)
			}
		}
		fetchMetadata()
	}, [nftMintAddress])

	// ── Enter animation ──
	useEffect(() => {
		requestAnimationFrame(() => setIsVisible(true))
	}, [])

	// ── Cycle confirming messages ──
	useEffect(() => {
		if (phase !== "confirming") return
		const interval = setInterval(() => {
			setConfirmMsg((i) => (i + 1) % CONFIRMING_MESSAGES.length)
		}, 3000)
		return () => clearInterval(interval)
	}, [phase])

	// ── Transition from confirming → power-on when mintStep becomes "success" ──
	useEffect(() => {
		if (mintStep === "success" && phase === "confirming") {
			// Small beat before starting the boot sequence
			setTimeout(() => setPhase("power-on"), 300)
		}
	}, [mintStep, phase])

	// ── Power-on sequence: dot → markers → flash → done ──
	useEffect(() => {
		if (phase !== "power-on" || skipped) return

		// Step 0: center dot already showing
		const t1 = setTimeout(() => setPowerOnStep(1), 500)   // markers appear
		const t2 = setTimeout(() => setPowerOnStep(2), 1200)  // subtle flash
		const t3 = setTimeout(() => setPowerOnStep(3), 1600)  // ready for image
		return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
	}, [phase, skipped])

	// ── Start glitch sequence once power-on is done + image loaded ──
	useEffect(() => {
		if (phase !== "power-on" || powerOnStep < 3) return
		if (!imageLoaded || !metadata) return

		const delay = setTimeout(() => {
			if (skipped) { setPhase("revealed"); return }
			setPhase("glitching")

			let frame = 0
			const interval = setInterval(() => {
				frame++
				setGlitchFrame(frame)
			}, 60)

			setTimeout(() => {
				clearInterval(interval)
				setPhase("revealed")
			}, revealConfig.glitchDuration)
		}, 200)

		return () => clearTimeout(delay)
	}, [phase, powerOnStep, imageLoaded, metadata, revealConfig.glitchDuration, skipped])

	// ── Lock scroll + keyboard ──
	useEffect(() => {
		const scrollY = window.scrollY
		document.body.style.position = "fixed"
		document.body.style.top = `-${scrollY}px`
		document.body.style.left = "0"
		document.body.style.right = "0"

		const onKey = (e: KeyboardEvent) => {
			if (e.key === " " || e.key === "Spacebar") {
				e.preventDefault()
				skipToReveal()
			}
			if (e.key === "Escape" && phaseRef.current === "revealed") onClose()
			if (e.key === "ArrowLeft" && phaseRef.current === "revealed" && onPrev) onPrev()
			if (e.key === "ArrowRight" && phaseRef.current === "revealed" && onNext) onNext()
		}
		document.addEventListener("keydown", onKey)

		return () => {
			document.body.style.position = ""
			document.body.style.top = ""
			document.body.style.left = ""
			document.body.style.right = ""
			window.scrollTo(0, scrollY)
			document.removeEventListener("keydown", onKey)
		}
	}, [onClose, skipToReveal, onPrev, onNext])

	// ── Glitch CSS transforms ──
	const glitchStyle = phase === "glitching" ? {
		filter: `
			saturate(${1 + Math.random() * revealConfig.glitchIntensity})
			hue-rotate(${Math.random() * 60 - 30}deg)
			contrast(${1 + Math.random() * 0.5})
		`,
		transform: `
			translate(${(Math.random() - 0.5) * revealConfig.glitchIntensity * 4}px, ${(Math.random() - 0.5) * revealConfig.glitchIntensity * 3}px)
			scale(${1 + (Math.random() - 0.5) * 0.04})
		`,
		clipPath: glitchFrame % 3 === 0
			? `inset(${Math.random() * 30}% 0 ${Math.random() * 30}% 0)`
			: "none",
	} : {}

	const isRevealed = phase === "revealed"

	return (
		<div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 md:p-6 overflow-hidden">
			{/* Backdrop */}
			<div
				className={`absolute inset-0 transition-all duration-500 bg-[rgba(var(--nx-surface-rgb),0.92)] backdrop-blur-md ${isVisible ? "opacity-100" : "opacity-0"}`}
				onClick={isRevealed ? onClose : undefined}
				aria-hidden="true"
			/>

			{/* Flash overlay during power-on step 2 */}
			{phase === "power-on" && powerOnStep === 2 && (
				<div className="absolute inset-0 z-10 animate-[mint-boot-flash_400ms_ease-out_forwards] bg-white/5" />
			)}

			{/* Modal — square during confirm/power-on, expands on reveal */}
			<div
				className={`relative z-20 nx-bg-surface-container border nx-border-subtle-30 overflow-hidden transition-all ${
					skipped ? "duration-0" : "duration-700"
				} [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
					isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
				} ${
					isRevealed
						? "w-full max-w-5xl max-h-[90vh]"
						: "w-[min(420px,90vw)] aspect-square max-h-[90vh]"
				}`}
				role="dialog"
				aria-label="Echo Recovery"
			>
				{/* ═══ CONFIRMING PHASE ═══ */}
				{phase === "confirming" && (
					<div className="absolute inset-0 flex flex-col items-center justify-center p-8">
						{/* Scanline overlay */}
						<div className="absolute inset-0 nx-scanline opacity-20 pointer-events-none" />

						{/* Scanner bar — same design as wallet menu */}
						<div className="w-full max-w-[200px] mb-8">
							<div className="relative h-[3px] w-full overflow-hidden rounded-full nx-bg-surface-variant">
								<div className="absolute inset-y-0 w-10 rounded-full nx-bg-primary-container animate-[echoes-scan_1.5s_ease-in-out_infinite]" />
							</div>
						</div>

						{/* Lore text */}
						<span className="font-label text-[10px] tracking-[0.2em] uppercase nx-text-primary-container text-center transition-opacity duration-500 min-h-[2em]">
							{CONFIRMING_MESSAGES[confirmMsg]}
						</span>
						<span className="font-label text-[10px] tracking-[0.15em] uppercase nx-text-outline mt-3">
							AWAITING ON-CHAIN CONFIRMATION
						</span>

						{/* Corner brackets — decorative */}
						<div className="absolute top-4 left-4 w-4 h-4 border-t border-l nx-border-subtle-30" />
						<div className="absolute top-4 right-4 w-4 h-4 border-t border-r nx-border-subtle-30" />
						<div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l nx-border-subtle-30" />
						<div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r nx-border-subtle-30" />
					</div>
				)}

				{/* ═══ POWER-ON PHASE ═══ */}
				{phase === "power-on" && (
					<div className="absolute inset-0 flex items-center justify-center">
						{/* Scanline overlay */}
						<div className="absolute inset-0 nx-scanline opacity-30 pointer-events-none" />

						{/* Center dot */}
						<div className={`absolute w-1.5 h-1.5 rounded-full bg-white transition-all duration-300 ${
							powerOnStep >= 1 ? "opacity-0 scale-0" : "opacity-100 scale-100"
						}`} />

						{/* Corner markers that expand outward */}
						<div className={`absolute inset-0 transition-all ${skipped ? "duration-0" : "duration-700"} [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]`}>
							{/* Top-left */}
							<div className={`absolute border-t-2 border-l-2 nx-border-primary-container transition-all ${skipped ? "duration-0" : "duration-700"} [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
								powerOnStep >= 1
									? "top-3 left-3 w-6 h-6 opacity-100"
									: "top-1/2 left-1/2 w-0 h-0 opacity-0 -translate-x-1/2 -translate-y-1/2"
							}`} />
							{/* Top-right */}
							<div className={`absolute border-t-2 border-r-2 nx-border-primary-container transition-all ${skipped ? "duration-0" : "duration-700"} [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
								powerOnStep >= 1
									? "top-3 right-3 w-6 h-6 opacity-100"
									: "top-1/2 right-1/2 w-0 h-0 opacity-0 translate-x-1/2 -translate-y-1/2"
							}`} />
							{/* Bottom-left */}
							<div className={`absolute border-b-2 border-l-2 nx-border-primary-container transition-all ${skipped ? "duration-0" : "duration-700"} [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
								powerOnStep >= 1
									? "bottom-3 left-3 w-6 h-6 opacity-100"
									: "bottom-1/2 left-1/2 w-0 h-0 opacity-0 -translate-x-1/2 translate-y-1/2"
							}`} />
							{/* Bottom-right */}
							<div className={`absolute border-b-2 border-r-2 nx-border-primary-container transition-all ${skipped ? "duration-0" : "duration-700"} [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
								powerOnStep >= 1
									? "bottom-3 right-3 w-6 h-6 opacity-100"
									: "bottom-1/2 right-1/2 w-0 h-0 opacity-0 translate-x-1/2 translate-y-1/2"
							}`} />
						</div>

						{/* Flash on step 2 — subtle brightness pulse */}
						{powerOnStep === 2 && (
							<div className="absolute inset-0 bg-white/[0.04] animate-[mint-boot-flash_400ms_ease-out_forwards]" />
						)}

						{/* Label */}
						<span className={`absolute bottom-8 font-label text-[10px] tracking-[0.2em] uppercase nx-text-primary-container transition-opacity duration-300 ${
							powerOnStep >= 1 ? "opacity-100" : "opacity-0"
						}`}>
							SIGNAL ACQUIRED
						</span>

						{/* Hidden image preload */}
						{metadata && (
							<img
								ref={imgRef}
								src={metadata.image}
								alt=""
								className="absolute w-0 h-0 opacity-0 pointer-events-none"
								onLoad={() => setImageLoaded(true)}
							/>
						)}
					</div>
				)}

				{/* ═══ GLITCHING + REVEALED PHASES ═══ */}
				{(phase === "glitching" || isRevealed) && metadata && (
					<div className="flex flex-col md:flex-row h-full overflow-hidden">
						{/* Left — Image (always square) */}
						<div className={`relative shrink-0 nx-bg-surface-highest overflow-hidden aspect-square transition-all ${
							skipped ? "duration-0" : "duration-700"
						} [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
							isRevealed ? "md:w-[55%]" : "w-full"
						}`}>
							{/* Scanline overlay during glitch */}
							{phase === "glitching" && (
								<div className="absolute inset-0 z-10 pointer-events-none nx-scanline opacity-60" />
							)}

							{/* Corner markers — persist from power-on */}
							<div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 nx-border-primary-container z-20 pointer-events-none transition-opacity duration-1000" style={{ opacity: isRevealed ? 0 : 0.8 }} />
							<div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 nx-border-primary-container z-20 pointer-events-none transition-opacity duration-1000" style={{ opacity: isRevealed ? 0 : 0.8 }} />
							<div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 nx-border-primary-container z-20 pointer-events-none transition-opacity duration-1000" style={{ opacity: isRevealed ? 0 : 0.8 }} />
							<div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 nx-border-primary-container z-20 pointer-events-none transition-opacity duration-1000" style={{ opacity: isRevealed ? 0 : 0.8 }} />

							{/* The image */}
							<img
								src={metadata.image}
								alt={metadata.name}
								className={`w-full h-full object-cover ${
									phase === "glitching"
										? "animate-[mint-image-in_0.8s_ease-out_both]"
										: "opacity-100 scale-100"
								}`}
								style={phase === "glitching" ? {
									...glitchStyle,
									transition: "none",
								} : {
									transition: skipped ? "none" : "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
								}}
								draggable={false}
							/>

							{/* Faction accent bar */}
							<div
								className={`absolute bottom-0 left-0 right-0 h-[3px] transition-opacity duration-500 ${isRevealed ? "opacity-100" : "opacity-0"}`}
								style={{ backgroundColor: FACTION_COLORS[faction ?? ""] ?? "transparent" }}
							/>

							{/* Rarity particles for legendary/elite */}
							{isRevealed && revealConfig.particleCount > 0 && (
								<div className="absolute inset-0 pointer-events-none overflow-hidden">
									{Array.from({ length: revealConfig.particleCount }, (_, i) => (
										<div
											key={i}
											className="absolute w-1 h-1 rounded-full animate-[mint-particle_2s_ease-out_forwards]"
											style={{
												backgroundColor: revealConfig.flashColor,
												left: `${Math.random() * 100}%`,
												top: `${Math.random() * 100}%`,
												animationDelay: `${Math.random() * 0.5}s`,
												opacity: 0.8,
											}}
										/>
									))}
								</div>
							)}
						</div>

						{/* Right — Details (only visible in revealed phase) */}
						<div className={`md:w-[45%] px-6 py-6 md:py-8 flex flex-col overflow-hidden transition-all ${
							skipped ? "duration-0" : "duration-700 delay-200"
						} ${
							isRevealed ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none absolute md:relative"
						}`}>
							{/* Header */}
							<div className="mb-6">
								<span className="font-label text-[10px] tracking-[0.2em] uppercase nx-text-primary-container block mb-2">
									IDENTITY RECOVERED
								</span>
								<h2 className="font-headline text-2xl md:text-3xl uppercase tracking-tight mb-4">
									{metadata.name}
								</h2>

								{/* Faction + Rank badges */}
								<div className="flex items-center gap-2 flex-wrap">
									{faction && (
										<span
											className="font-label text-[10px] px-3 py-1.5 uppercase tracking-wider"
											style={{
												backgroundColor: `color-mix(in srgb, ${FACTION_COLORS[faction] ?? "var(--nx-on-surface-variant)"} 15%, transparent)`,
												color: FACTION_COLORS[faction] ?? "var(--nx-on-surface-variant)",
											}}
										>
											{faction}
										</span>
									)}
									<span
										className="font-label text-[10px] px-3 py-1.5 uppercase tracking-wider flex items-center gap-1.5"
										style={{
											backgroundColor: `color-mix(in srgb, ${RANK_COLORS[rank] ?? "#888"} 15%, transparent)`,
											color: RANK_COLORS[rank] ?? "#888",
										}}
									>
										<span className="w-2 h-2 rounded-sm" style={{ backgroundColor: RANK_COLORS[rank] ?? "#888" }} />
										{rank} #{rarityRank}
									</span>
								</div>
							</div>

							{/* Trait list */}
							<div className="flex-1 space-y-0 overflow-y-auto overflow-x-hidden">
								{metadata.attributes
									.filter((a) => !HIDDEN_TRAITS.has(a.trait_type))
									.map((attr, i) => (
										<div
											key={attr.trait_type}
											className={`flex items-baseline justify-between py-2.5 border-b nx-border-subtle-10 ${
												skipped ? "" : "animate-[mint-trait-in_0.3s_ease-out_both]"
											}`}
											style={skipped ? {} : { animationDelay: `${0.4 + i * 0.05}s` }}
										>
											<span className="font-label text-[10px] nx-text-on-surface-variant uppercase tracking-wider">
												{attr.trait_type}
											</span>
											<span className="font-body text-sm nx-text-on-surface text-right">
												{attr.value}
											</span>
										</div>
									))}
								{/* Mint address */}
								<div
									className={`flex items-baseline justify-between py-2.5 ${
										skipped ? "" : "animate-[mint-trait-in_0.3s_ease-out_both]"
									}`}
									style={skipped ? {} : { animationDelay: `${0.4 + metadata.attributes.filter(a => !HIDDEN_TRAITS.has(a.trait_type)).length * 0.05}s` }}
								>
									<span className="font-label text-[10px] nx-text-on-surface-variant uppercase tracking-wider">
										Mint ID
									</span>
									<a
										href={`https://explorer.solana.com/address/${nftMintAddress}?cluster=devnet`}
										target="_blank"
										rel="noopener noreferrer"
										className="font-mono text-sm nx-text-primary-container hover:underline"
									>
										{nftMintAddress?.slice(0, 4)}...{nftMintAddress?.slice(-4)} ↗
									</a>
								</div>
							</div>

							{/* Actions */}
							<div className="mt-6 flex gap-3">
								{!viewMode && (
									<button
										type="button"
										onClick={onMintAnother}
										className="flex-1 font-headline text-sm py-3 uppercase skew-hover nx-bg-primary-container nx-text-on-primary-fixed"
									>
										MINT ANOTHER
									</button>
								)}
								<button
									type="button"
									onClick={onClose}
									className={`${viewMode ? "w-full" : "flex-1"} font-headline text-sm py-3 uppercase border nx-border-subtle nx-text-on-surface-variant hover:nx-text-on-surface transition-colors`}
								>
									CLOSE
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Skip hint — shown during animation phases */}
				{(phase === "power-on" || phase === "glitching") && (
					<div className="absolute bottom-3 right-3 z-30">
						<button
							type="button"
							onClick={skipToReveal}
							className="font-label text-[9px] tracking-widest uppercase nx-text-outline hover:nx-text-on-surface-variant transition-colors px-2 py-1"
						>
							SPACE TO SKIP
						</button>
					</div>
				)}
			</div>

			{/* Controls bar — below modal (viewMode with navigation) */}
			{viewMode && isRevealed && (
				<div
					className={`relative z-10 flex items-center justify-center gap-4 mt-4 transition-all duration-300 ${
						isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
					}`}
				>
					{onPrev ? (
						<button type="button" onClick={onPrev} className="flex items-center justify-center w-11 h-11 nx-bg-surface-high border nx-border-subtle-30 nx-text-on-surface-variant hover:nx-text-on-surface transition-colors" aria-label="Previous echo (← arrow key)">
							<Icon name="chevron-left" className="text-sm" />
						</button>
					) : (onPrev !== undefined || onNext !== undefined) ? (
						<div className="w-11 h-11" aria-hidden="true" />
					) : null}

					<button
						type="button"
						onClick={onClose}
						className="flex items-center gap-2 px-5 h-10 nx-bg-surface-high border nx-border-subtle-30 nx-text-on-surface-variant hover:nx-text-on-surface transition-colors font-label text-[10px] uppercase tracking-wider"
						aria-label="Close (Esc)"
					>
						<Icon name="xmark" className="text-xs" />
						<span>Close</span>
						<span className="nx-text-outline ml-1">Esc</span>
					</button>

					{onNext ? (
						<button type="button" onClick={onNext} className="flex items-center justify-center w-11 h-11 nx-bg-surface-high border nx-border-subtle-30 nx-text-on-surface-variant hover:nx-text-on-surface transition-colors" aria-label="Next echo (→ arrow key)">
							<Icon name="chevron-right" className="text-sm" />
						</button>
					) : (onPrev !== undefined || onNext !== undefined) ? (
						<div className="w-11 h-11" aria-hidden="true" />
					) : null}
				</div>
			)}

			{/* Keyframe animations */}
			<style>{`
				@keyframes echoes-scan {
					0% { left: -2.5rem; }
					50% { left: calc(100% + 0.5rem); }
					100% { left: -2.5rem; }
				}
				@keyframes mint-boot-flash {
					0% { opacity: 1; }
					100% { opacity: 0; }
				}
				@keyframes mint-image-in {
					0% { opacity: 0; filter: blur(12px) saturate(0.3); transform: scale(1.06); }
					40% { opacity: 0.7; filter: blur(4px) saturate(0.6); }
					100% { opacity: 1; filter: blur(0) saturate(1); transform: scale(1); }
				}
				@keyframes mint-particle {
					0% { transform: scale(1) translate(0, 0); opacity: 0.8; }
					100% { transform: scale(0) translate(${Math.random() > 0.5 ? '' : '-'}${20 + Math.random() * 40}px, -${30 + Math.random() * 60}px); opacity: 0; }
				}
				@keyframes mint-trait-in {
					0% { opacity: 0; transform: translateX(8px); }
					100% { opacity: 1; transform: translateX(0); }
				}
			`}</style>
		</div>
	)
}
