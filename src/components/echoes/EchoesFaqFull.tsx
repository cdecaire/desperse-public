import { useState } from "react"
import { FAQ_ITEMS, FAQ_CATEGORIES, type FaqCategory } from "@/data/echoes-faq"
import { useScrollReveal } from "./hooks/useScrollReveal"

function RevealCategory({ children, className }: { children: React.ReactNode; className?: string }) {
	const ref = useScrollReveal<HTMLDivElement>()
	return <div ref={ref} className={className}>{children}</div>
}

function CorruptedText({ text, reveal }: { text: string; reveal: string }) {
	const [isHovered, setIsHovered] = useState(false)
	const chars = "▓░▒█▄▀■□◊◘◙"

	const corrupted = text
		.split("")
		.map(() => chars[Math.floor(Math.random() * chars.length)])
		.join("")

	return (
		<span
			className="cursor-help border-b border-dashed border-[var(--nx-secondary-container)]"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			title="Hover to decode"
		>
			{isHovered ? (
				<span className="nx-text-secondary">{reveal}</span>
			) : (
				<span className="nx-text-outline font-label text-xs">{corrupted}</span>
			)}
		</span>
	)
}

export function EchoesFaqFull() {
	const categories = Object.keys(FAQ_CATEGORIES) as FaqCategory[]

	return (
		<section className="py-12 md:py-20 px-4 md:px-20 nx-bg-surface" aria-label="FAQ">
			<div className="max-w-4xl mx-auto space-y-12 md:space-y-16">
				{categories.map((cat) => {
					const items = FAQ_ITEMS.filter((item) => item.category === cat)
					if (items.length === 0) return null

					return (
						<RevealCategory key={cat}>
							<h2 className="font-label text-xs tracking-[0.2em] uppercase nx-text-primary-container mb-6 pb-2 border-b nx-border-subtle" data-reveal>
								{FAQ_CATEGORIES[cat]}
							</h2>

							<div className="space-y-2">
								{items.map((item, i) => (
									<details key={item.question} className="group nx-bg-surface-low" data-reveal-stagger style={{ "--stagger-index": i } as React.CSSProperties}>
										<summary className="flex items-center justify-between cursor-pointer px-5 py-4 font-headline text-sm md:text-base uppercase select-none list-none [&::-webkit-details-marker]:hidden">
											<span>{item.question}</span>
											<svg
												className="w-4 h-4 shrink-0 ml-4 nx-text-outline transition-transform group-open:rotate-45"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
											>
												<path d="M12 5v14M5 12h14" />
											</svg>
										</summary>
										<div className="px-5 pb-5 pt-1">
											<p className="font-body text-sm nx-text-on-surface-variant leading-relaxed">
												{item.answer}
											</p>
											{item.corrupted && item.corruptedReveal && (
												<div className="mt-3 p-3 nx-bg-surface border-l-2 border-[var(--nx-secondary-container)]">
													<CorruptedText
														text="ENCRYPTED SIGNAL FRAGMENT"
														reveal={item.corruptedReveal}
													/>
												</div>
											)}
										</div>
									</details>
								))}
							</div>
						</RevealCategory>
					)
				})}
			</div>
		</section>
	)
}
