const FAQ_ITEMS = [
	{
		question: "What is this collection?",
		answer: "Echoes is a generative cyberpunk PFP collection from Desperse, featuring 4,444 recovered identities shaped by faction, signal exposure, and the fallout of the DSPRS event.",
		highlighted: true,
	},
	{
		question: "What is DSPRS?",
		answer: "DSPRS is the machine-coded name for Desperse after it was flagged as a protocol inside official city systems. It refers to the signal event that blurred the line between media, memory, and identity.",
		highlighted: false,
	},
	{
		question: "When does mint open?",
		answer: "The mint date is shown in the countdown above. Allowlist holders get early archive access, followed by a public breach window. Follow our socials for the exact schedule.",
		highlighted: false,
	},
	{
		question: "How many can I mint?",
		answer: "Wallet limits will be announced before mint. All transactions are on Solana — you'll need SOL in your wallet to cover the access cost and a small network fee.",
		highlighted: false,
	},
	{
		question: "When is reveal?",
		answer: "Reveal is framed as archive reconstruction. Each recovered identity remains sealed until the system completes resolution of faction alignment, signal exposure, and continuity state.",
		highlighted: false,
	},
	{
		question: "What do factions mean?",
		answer: "Five factions define Tessera: Syre Group controls the Registry, the Tessera Wardens enforce district power, The Siphon moves through blind spots, The Unwritten carry the fallout of mutation, and The Witnesses worship continuation inside the archive.",
		highlighted: false,
	},
]

import { useScrollReveal } from "./hooks/useScrollReveal"

export function EchoesFaq() {
	const sectionRef = useScrollReveal<HTMLElement>()

	return (
		<section ref={sectionRef} id="faq" className="py-20 md:py-24 px-4 md:px-20 nx-bg-surface" aria-label="FAQ">
			<div className="max-w-4xl mx-auto">
				<h2 className="font-headline text-3xl md:text-4xl uppercase mb-12 md:mb-16 text-center tracking-tight" data-reveal>
					FREQUENTLY ASKED
				</h2>

				<dl className="space-y-4">
					{FAQ_ITEMS.map((item, i) => (
						<div
							key={item.question}
							data-reveal-stagger
							style={{ "--stagger-index": i } as React.CSSProperties}
							className={`p-4 md:p-6 nx-bg-surface-low border-l-2 ${item.highlighted ? 'border-[rgba(var(--nx-primary-container-rgb),0.3)]' : 'nx-border-subtle-30'}`}
						>
							<dt className="font-headline text-base md:text-lg mb-2 uppercase">
								{item.question}
							</dt>
							<dd className="font-body text-sm nx-text-on-surface-variant">
								{item.answer}
							</dd>
						</div>
					))}
				</dl>
			</div>
		</section>
	)
}
