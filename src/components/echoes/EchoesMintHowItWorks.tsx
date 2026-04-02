import { getRevealedImagesSeeded } from "@/data/echoes-images"
import { useScrollReveal } from "./hooks/useScrollReveal"
import { useMemo } from "react"
import { useEchoesMintedItems } from "./hooks/useEchoesMintedItems"

export function EchoesMintHowItWorks() {
	const sectionRef = useScrollReveal<HTMLElement>()
	const { data: mintedData } = useEchoesMintedItems()
	const mintedIndices = useMemo(() => mintedData ? new Set(mintedData.mintedIndices) : null, [mintedData])
	const stepImage = useMemo(() => getRevealedImagesSeeded(1, 44, mintedIndices)[0].src, [mintedIndices])

	return (
		<section ref={sectionRef} className="relative py-20 md:py-32 px-4 md:px-20 nx-bg-surface-lowest overflow-hidden" aria-label="How it works">
			{/* Section accent */}
			<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--nx-primary-container)] to-transparent opacity-30" aria-hidden="true" />

			<div className="max-w-7xl mx-auto">
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-16 items-center">
					{/* Left: large image with overlay */}
					<div className="lg:col-span-5 relative" aria-hidden="true" data-reveal="wipe">
						<div className="relative aspect-[3/4] overflow-hidden">
							<img
								src={stepImage}
								alt=""
								className="absolute inset-0 w-full h-full object-cover opacity-50"
								loading="lazy"
							/>
							<div className="absolute inset-0 bg-gradient-to-t from-[var(--nx-surface-container-lowest)] via-transparent to-[rgba(8,9,12,0.6)]" />
							{/* Status overlays */}
							<div className="absolute top-4 left-4 font-label text-[9px] tracking-[0.2em] uppercase nx-text-primary-container">
								ACCESS_PROTOCOL
							</div>
							<div className="absolute bottom-0 left-0 right-0 p-5">
								<div className="flex items-center gap-2">
									<div className="w-2 h-2 rounded-full nx-bg-primary-container animate-nx-pulse" />
									<span className="font-label text-[9px] tracking-widest uppercase nx-text-primary-container">
										NETWORK: SOLANA DEVNET
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* Right: numbered steps — vertical flow, not cards */}
					<div className="lg:col-span-7">
						<span className="font-label text-[10px] tracking-[0.2em] uppercase nx-text-outline block mb-3" data-reveal-stagger style={{ "--stagger-index": 0 } as React.CSSProperties}>
							RECOVERY_SEQUENCE
						</span>
						<h2 className="font-headline text-2xl md:text-4xl uppercase tracking-tight mb-10" data-reveal-stagger style={{ "--stagger-index": 1 } as React.CSSProperties}>
							HOW IT WORKS
						</h2>

						{/* Steps with vertical connector line */}
						<div className="relative">
							{/* Vertical line */}
							<div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-[var(--nx-primary-container)] via-[var(--nx-secondary-container)] to-[var(--nx-outline-variant)]" aria-hidden="true" data-reveal="line-draw" />

							<div className="space-y-8">
								{/* Step 1 */}
								<div className="flex items-start gap-6 relative" data-reveal-stagger style={{ "--stagger-index": 2 } as React.CSSProperties}>
									<div className="w-8 h-8 shrink-0 flex items-center justify-center nx-bg-primary-container z-[1]">
										<span className="font-headline text-sm nx-text-on-primary-fixed">01</span>
									</div>
									<div className="pt-1">
										<h3 className="font-headline text-lg uppercase mb-2">CONNECT WALLET</h3>
										<p className="font-body text-sm nx-text-on-surface-variant leading-relaxed">
											Link your Solana wallet. You'll need SOL to cover the access cost and a small network fee.
											Phantom, Solflare, and all major wallets supported.
										</p>
									</div>
								</div>

								{/* Step 2 */}
								<div className="flex items-start gap-6 relative" data-reveal-stagger style={{ "--stagger-index": 3 } as React.CSSProperties}>
									<div className="w-8 h-8 shrink-0 flex items-center justify-center nx-bg-secondary-container z-[1]">
										<span className="font-headline text-sm nx-text-on-secondary">02</span>
									</div>
									<div className="pt-1">
										<h3 className="font-headline text-lg uppercase mb-2">MINT</h3>
										<p className="font-body text-sm nx-text-on-surface-variant leading-relaxed">
											Select your quantity and recover despersed identities from the DSPRS archive.
											Each Echo resolves instantly — identity, faction, and traits revealed the moment you mint.
										</p>
									</div>
								</div>

								{/* Step 3 */}
								<div className="flex items-start gap-6 relative" data-reveal-stagger style={{ "--stagger-index": 4 } as React.CSSProperties}>
									<div className="w-8 h-8 shrink-0 flex items-center justify-center border nx-border-outline-variant z-[1] nx-bg-surface-lowest">
										<span className="font-headline text-sm nx-text-on-surface-variant">03</span>
									</div>
									<div className="pt-1">
										<h3 className="font-headline text-lg uppercase mb-2">DISCOVER</h3>
										<p className="font-body text-sm nx-text-on-surface-variant leading-relaxed">
											Your identity is already resolved. Explore your Echo's faction alignment, traits,
											continuity status, and place in Tessera. The archive is yours.
										</p>
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
