import { Link } from "@tanstack/react-router"
import { useScrollReveal } from "./hooks/useScrollReveal"

const FAQ_ITEMS = [
	{
		question: "What are despersed identities?",
		answer: "Echoes are recovered signal traces, continuity fragments, and identity remnants shaped by the fallout of the DSPRS event. Each one carries faction alignment, modification grade, and continuity status from the Cascade.",
	},
	{
		question: "What is DSPRS?",
		answer: "DSPRS is the machine-coded name for Desperse after it was flagged as a protocol inside Tessera's systems. In-world, it refers to the signal event that blurred the line between media, memory, and identity. The 3E Protocol — Encode, Emit, Echo — was Syre Group's classification.",
	},
	{
		question: "What are the Three Echoes?",
		answer: "The 3E Protocol — Encode, Emit, Echo — was Syre Group's classification. On the street it meant Expression, Exchange, Escape. To the Witnesses, it is simply the Three Echoes: a pattern through which identity survives death, dispersal, and compression.",
	},
]

export function EchoesLoreFaq() {
	const sectionRef = useScrollReveal<HTMLElement>()

	return (
		<section ref={sectionRef} className="py-20 md:py-32 px-4 md:px-20" aria-label="FAQ">
			<div className="max-w-3xl mx-auto">
				<h2 className="font-headline text-3xl uppercase mb-12 text-center tracking-tight" data-reveal>
					INQUIRY_PROTOCOL
				</h2>

				<div className="space-y-4">
					{FAQ_ITEMS.map((item, i) => (
						<details
							key={item.question}
							data-reveal-stagger
							style={{ "--stagger-index": i } as React.CSSProperties}
							className="group nx-bg-surface-low p-4 md:p-6 border nx-border-subtle-30 cursor-pointer"
						>
							<summary className="flex justify-between items-center min-h-[44px] py-3 font-headline uppercase text-sm list-none [&::-webkit-details-marker]:hidden cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--nx-primary-container)] focus-visible:outline-offset-2">
								<span>{item.question}</span>
								<svg
									className="w-5 h-5 nx-text-on-surface-variant transition-transform group-open:rotate-180 flex-shrink-0 ml-4"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									aria-hidden="true"
								>
									<path d="M6 9l6 6 6-6" />
								</svg>
							</summary>
							<p className="mt-4 font-body text-sm nx-text-on-surface-variant leading-relaxed">
								{item.answer}
							</p>
						</details>
					))}
				</div>

				<div className="mt-8 text-center">
					<Link
						to="/echoes/faq"
						className="inline-flex items-center gap-2 font-label text-xs uppercase tracking-widest nx-text-primary-container nx-hover-text transition-colors focus-visible:outline-2 focus-visible:outline-[var(--nx-primary-container)] focus-visible:outline-offset-2"
					>
						VIEW ALL FAQ
						<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M5 12h14M12 5l7 7-7 7" />
						</svg>
					</Link>
				</div>
			</div>
		</section>
	)
}
