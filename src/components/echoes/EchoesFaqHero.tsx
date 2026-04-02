import { useScrollReveal } from "./hooks/useScrollReveal"

export function EchoesFaqHero() {
	const heroRef = useScrollReveal<HTMLElement>({ threshold: 0.1 })

	return (
		<header ref={heroRef} className="relative pt-24 md:pt-32 pb-12 md:pb-16 px-4 md:px-20 nx-bg-surface-lowest" aria-label="FAQ hero">
			<div className="max-w-7xl mx-auto">
				<span className="font-label text-[10px] tracking-[0.2em] uppercase nx-text-outline block mb-4" data-reveal-stagger style={{ "--stagger-index": 0 } as React.CSSProperties}>
					INQUIRY_PROTOCOL // FREQUENTLY REQUESTED DATA
				</span>

				<h1 className="font-headline text-4xl sm:text-6xl md:text-7xl tracking-[-0.05em] leading-[1.1] mb-6 uppercase" data-reveal-stagger style={{ "--stagger-index": 1 } as React.CSSProperties}>
					<span className="nx-text-primary-container">FAQ</span>
				</h1>

				<p className="font-body text-base md:text-lg max-w-2xl nx-text-on-surface-variant" data-reveal-stagger style={{ "--stagger-index": 2 } as React.CSSProperties}>
					Answers to common questions about the Echoes collection, the DSPRS event,
					minting, and the world behind the archive.
				</p>
			</div>
		</header>
	)
}
