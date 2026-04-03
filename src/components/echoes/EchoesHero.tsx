import { Link } from "@tanstack/react-router"
import { useCountdown, pad } from "./hooks/useCountdown"
import { useMintPhase } from "./hooks/useMintPhase"
import { useEchoesMintInfo } from "./hooks/useEchoesMintInfo"
import { getRevealedImagesSeeded } from "@/data/echoes-images"
import { useScrollReveal } from "./hooks/useScrollReveal"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useEchoesMintedItems } from "./hooks/useEchoesMintedItems"

function useMouseParallax(strength = 0.02) {
	const [offset, setOffset] = useState({ x: 0, y: 0 })
	useEffect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
		function onMove(e: MouseEvent) {
			setOffset({
				x: (e.clientX - window.innerWidth / 2) * strength,
				y: (e.clientY - window.innerHeight / 2) * strength,
			})
		}
		window.addEventListener("mousemove", onMove, { passive: true })
		return () => window.removeEventListener("mousemove", onMove)
	}, [strength])
	return offset
}

/**
 * Image cluster — absolutely positioned relative to the header.
 * Rendered as a sibling to the text, not inside any layout container.
 */
function HeroImages({ p1, p2, heroImages }: { p1: { x: number; y: number }; p2: { x: number; y: number }; heroImages: string[] }) {
	return (
		<div className="absolute right-0 top-1/2 -translate-y-1/2 hidden lg:block pointer-events-none" aria-hidden="true">
			{/* Slow parallax layer */}
			<div
				className="relative w-[340px] xl:w-[400px] h-[420px] xl:h-[480px]"
				style={{ transform: `translate(${p1.x}px, ${p1.y}px)`, transition: "transform 0.7s ease-out" }}
			>
				<div className="echoes-hero-img absolute left-0 top-0 w-36 xl:w-44 aspect-[3/4] overflow-hidden opacity-60" style={{ clipPath: "polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)" }}>
					<img src={heroImages[0]} alt="" className="w-full h-full object-cover" loading="eager" />
				</div>
				<div className="echoes-hero-img absolute right-0 top-[4%] w-40 xl:w-48 aspect-[3/4] overflow-hidden opacity-55" style={{ clipPath: "polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)" }}>
					<img src={heroImages[1]} alt="" className="w-full h-full object-cover" loading="eager" />
				</div>
			</div>

			{/* Fast parallax layer — overlaps slow layer */}
			<div
				className="absolute inset-0 w-[340px] xl:w-[400px] h-[420px] xl:h-[480px]"
				style={{ transform: `translate(${p2.x}px, ${p2.y}px)`, transition: "transform 0.5s ease-out" }}
			>
				<div className="echoes-hero-img absolute left-[10%] top-[10%] w-44 xl:w-56 aspect-[3/4] overflow-hidden shadow-2xl z-10" style={{ clipPath: "polygon(3% 0%, 100% 0%, 97% 100%, 0% 100%)" }}>
					<img src={heroImages[2]} alt="" className="w-full h-full object-cover" loading="eager" />
					<div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(var(--nx-primary-container-rgb),0.12)]" />
				</div>
				<div className="echoes-hero-img absolute left-0 bottom-0 w-32 xl:w-40 aspect-[3/4] overflow-hidden z-20" style={{ clipPath: "polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)" }}>
					<img src={heroImages[3]} alt="" className="w-full h-full object-cover" loading="eager" />
				</div>
				<div className="echoes-hero-img absolute right-0 bottom-[6%] w-32 xl:w-40 aspect-[3/4] overflow-hidden z-0" style={{ clipPath: "polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)" }}>
					<img src={heroImages[4]} alt="" className="w-full h-full object-cover" loading="eager" />
				</div>
			</div>
		</div>
	)
}

export function EchoesHero() {
	const phase = useMintPhase()
	const queryClient = useQueryClient()
	const { data: mintInfo } = useEchoesMintInfo()
	const countdownTarget = mintInfo?.windows?.publicStart
		? new Date(mintInfo.windows.publicStart)
		: new Date(0)
	const onCountdownComplete = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ["pfp-mint-status"] })
	}, [queryClient])
	const { days, hours, minutes, seconds } = useCountdown(countdownTarget, onCountdownComplete)
	const { data: mintedData } = useEchoesMintedItems()
	const mintedIndices = useMemo(() => mintedData ? new Set(mintedData.mintedIndices) : null, [mintedData])
	const heroImages = useMemo(() => getRevealedImagesSeeded(5, 0, mintedIndices).map((r) => r.src), [mintedIndices])
	// Show countdown only in premint; once CM is live or closed, show status
	const isLive = phase === "minting" || phase === "postmint"
	const heroRef = useScrollReveal<HTMLElement>({ threshold: 0.1 })
	const p1 = useMouseParallax(0.012)
	const p2 = useMouseParallax(0.025)

	return (
		<header
			ref={heroRef}
			id="hero"
			className="relative min-h-screen px-4 md:px-20 overflow-hidden nx-bg-surface-lowest"
			aria-label="Hero"
		>
			{/* Scanline texture */}
			<div className="absolute right-0 top-0 w-2/3 h-full opacity-20 nx-glitch pointer-events-none" aria-hidden="true" />

			{/* Content — vertically centered, same max-w as all other sections */}
			<div className="relative max-w-7xl mx-auto min-h-screen flex flex-col justify-center pt-24 md:pt-32 pb-16 md:pb-20">

				{/* PFP images — absolute within the max-w-7xl container */}
				<HeroImages p1={p1} p2={p2} heroImages={heroImages} />

				<div className="relative z-10 max-w-4xl">
					<div className="mb-4 inline-block px-3 py-1 font-label text-[10px] tracking-[0.2em] uppercase nx-bg-secondary-container nx-text-on-secondary" data-reveal-stagger style={{ "--stagger-index": 0 } as React.CSSProperties}>
						ECHOES // 8,888 DESPERSED IDENTITIES // SOLANA
					</div>

					<h1 className="font-headline text-4xl sm:text-6xl md:text-8xl tracking-[-0.05em] leading-[1.1] mb-6 uppercase" data-reveal-stagger style={{ "--stagger-index": 1 } as React.CSSProperties}>
						{phase === "minting" ? (
							<>BREACH WINDOW <br /><span className="nx-text-primary-container">ACTIVE</span></>
						) : phase === "postmint" ? (
							<>IDENTITIES <br /><span className="nx-text-primary-container">RESOLVED</span></>
						) : (
							<>DSPRS TRACE <br /><span className="nx-text-primary-container">DETECTED</span></>
						)}
					</h1>

					<p className="font-body text-base md:text-xl max-w-2xl mb-8 md:mb-12 pl-4 md:pl-6 nx-text-on-surface-variant border-l-2 border-[var(--nx-primary-container)]" data-reveal-stagger style={{ "--stagger-index": 2 } as React.CSSProperties}>
						8,888 identities dispersed by the 3E Cascade. Recovered from the archive.
						Shaped by faction, signal exposure, and survival. Yours to claim.
					</p>

					<div className="flex flex-col sm:flex-row gap-4 sm:gap-6 sm:items-end" data-reveal-stagger style={{ "--stagger-index": 3 } as React.CSSProperties}>
						<div className="p-4 md:p-6 min-w-0 sm:min-w-[240px] nx-bg-surface-high border-l-4 border-[var(--nx-primary-container)]">
							<span className="block font-label text-[10px] tracking-widest mb-2 uppercase nx-text-primary-fixed">
								{phase === "postmint" ? "ARCHIVE STATUS" : phase === "minting" ? "BREACH WINDOW" : "BREACH WINDOW OPENS IN"}
							</span>
							<div
								className="font-headline text-3xl md:text-4xl tracking-tighter"
								suppressHydrationWarning
								aria-label={isLive
									? phase === "minting" ? "Minting live" : "Archive resolved"
									: `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds remaining`
								}
							>
								{phase === "postmint" ? (
									<span className="nx-text-primary-container">RESOLVED</span>
								) : phase === "minting" ? (
									<span className="nx-text-primary-container">
										{mintInfo?.supply ? `${mintInfo.supply.minted} / ${mintInfo.supply.total}` : "ACTIVE"}
									</span>
								) : (
									<>{pad(days)}:{pad(hours)}:{pad(minutes)}:{pad(seconds)}</>
								)}
							</div>
						</div>

						<Link
							to="/echoes/mint"
							className="font-headline text-base md:text-lg px-8 md:px-10 py-4 md:py-5 min-h-[48px] uppercase skew-hover nx-bg-primary-container nx-text-on-primary-fixed text-center"
						>
							{phase === "minting" ? "MINT NOW" : "VIEW MINT"}
						</Link>
					</div>
				</div>
			</div>

			{/* Signal HUD */}
			<div className="absolute bottom-10 right-10 hidden lg:block backdrop-blur p-4 border nx-border-subtle-30 bg-[rgba(var(--nx-surface-rgb),0.8)]" aria-hidden="true">
				<div className="flex items-center gap-3">
					<div className="w-2 h-2 rounded-full animate-nx-pulse nx-bg-primary-container" />
					<div className="font-label text-[10px] tracking-[0.2em] uppercase">
						NETWORK: <span className="nx-text-primary-container">SOLANA DEVNET</span>
					</div>
				</div>
				<div className="mt-2 text-[10px] font-label uppercase tracking-widest nx-text-outline">
					SUPPLY: 8,888 // PRICE: TBA
				</div>
			</div>
		</header>
	)
}
