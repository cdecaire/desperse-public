import { useState } from "react"
import { TIMELINE, TIMELINE_ERAS } from "@/data/echoes-timeline"
import { useScrollReveal } from "./hooks/useScrollReveal"

function RevealEra({ children, className }: { children: React.ReactNode; className: string }) {
	const ref = useScrollReveal<HTMLDivElement>()
	return <div ref={ref} className={className}>{children}</div>
}

export function EchoesLoreTimeline() {
	const [revealedId, setRevealedId] = useState<number | null>(null)
	const headerRef = useScrollReveal<HTMLDivElement>()

	const eras = Object.keys(TIMELINE_ERAS) as Array<keyof typeof TIMELINE_ERAS>

	return (
		<section id="timeline" className="py-20 md:py-32 px-4 md:px-20 nx-bg-surface-high nx-section-divider" aria-label="Timeline">
			<div className="max-w-5xl mx-auto">
				<div ref={headerRef} className="text-center mb-12 md:mb-16" data-reveal>
					<span className="font-label text-[10px] tracking-[0.2em] uppercase nx-text-outline block mb-3">
						CONTINUITY_LOG // 12 RECORDED EVENTS
					</span>
					<h2 className="font-headline text-3xl md:text-4xl uppercase leading-tight">
						Signal History
					</h2>
				</div>

				{eras.map((eraKey) => {
					const era = TIMELINE_ERAS[eraKey]
					const events = TIMELINE.filter((e) => e.era === eraKey)

					return (
						<RevealEra key={eraKey} className="mb-12 md:mb-16">
							{/* Era header */}
							<div className="flex items-center gap-4 mb-8 pb-3 border-b nx-border-subtle-30" data-reveal>
								<span className={`font-label text-xs tracking-widest uppercase ${eraKey === "ERA_03.FACTION" ? "nx-text-secondary-container" : "nx-text-primary-container"}`}>
									{eraKey}
								</span>
								<span className="h-px flex-1 nx-bg-outline opacity-20" />
								<span className="font-headline text-sm uppercase">{era.label}</span>
								<span className={`font-label text-[9px] tracking-widest uppercase px-2 py-0.5 ${
									era.status === "ACTIVE"
										? "nx-bg-secondary-container nx-text-on-secondary"
										: era.status === "CLASSIFIED"
											? "nx-bg-surface-high nx-text-primary-container border nx-border-subtle-30"
											: "nx-bg-surface-high nx-text-outline"
								}`}>
									{era.status}
								</span>
							</div>

							{/* Events with vertical connector */}
							<div className="relative ml-3 md:ml-6">
								{/* Vertical connector line */}
								<div
									className={`absolute left-0 top-0 bottom-0 w-px ${
										eraKey === "ERA_01.REGISTRY"
											? "bg-gradient-to-b from-[var(--nx-primary-container)] to-[var(--nx-outline-variant)]"
											: eraKey === "ERA_02.DSPRS"
												? "bg-gradient-to-b from-[var(--nx-secondary-container)] to-[var(--nx-outline-variant)]"
												: "bg-gradient-to-b from-[var(--nx-secondary)] to-[var(--nx-outline-variant)]"
									}`}
									aria-hidden="true"
									data-reveal="line-draw"
								/>

								<div className="space-y-0">
									{events.map((event, eventIdx) => {
										const isRedacted = event.redacted
										const isRevealed = revealedId === event.id

										return (
											<div
												key={event.id}
												data-reveal-stagger
												style={{ "--stagger-index": eventIdx + 1 } as React.CSSProperties}
												className={`relative pl-8 md:pl-10 py-5 md:py-6 group transition-colors ${
													isRedacted ? "cursor-pointer hover:bg-[rgba(var(--nx-secondary-rgb),0.03)] focus-visible:outline-2 focus-visible:outline-[var(--nx-primary-container)] focus-visible:outline-offset-2" : "hover:bg-[rgba(var(--nx-on-surface-rgb),0.02)]"
												}`}
												onClick={isRedacted ? () => setRevealedId(isRevealed ? null : event.id) : undefined}
												role={isRedacted ? "button" : undefined}
												tabIndex={isRedacted ? 0 : undefined}
												onKeyDown={isRedacted ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setRevealedId(isRevealed ? null : event.id) } } : undefined}
												aria-expanded={isRedacted ? isRevealed : undefined}
											>
												{/* Dot on the line */}
												<div
													className={`absolute left-[-3px] top-7 w-[7px] h-[7px] rounded-full ${
														isRedacted
															? "nx-bg-secondary animate-nx-pulse"
															: event.id === 12
																? "nx-bg-secondary-container"
																: "nx-bg-outline"
													}`}
													aria-hidden="true"
												/>

												{/* Event number */}
												<span className="absolute left-8 md:left-10 top-5 md:top-6 font-label text-[9px] nx-text-outline tracking-widest opacity-50">
													{String(event.id).padStart(2, "0")}
												</span>

												<div className="pt-5">
													<h3 className={`font-headline text-sm md:text-base uppercase mb-2 ${
														isRedacted && !isRevealed ? "nx-text-secondary nx-glitch-active" : ""
													}`}>
														{isRedacted && !isRevealed ? event.title : isRedacted && isRevealed ? "The Archive Leak" : event.title}
													</h3>
													{isRedacted && !isRevealed ? (
														<p className="font-label text-xs nx-text-secondary tracking-widest">
															{event.description}
															<span className="ml-2 nx-text-outline text-[9px]">[ CLICK TO DECODE ]</span>
														</p>
													) : isRedacted && isRevealed ? (
														<p className="font-body text-sm nx-text-secondary leading-relaxed">
															{event.redactedReveal}
														</p>
													) : (
														<p className="font-body text-sm nx-text-on-surface-variant leading-relaxed">
															{event.description}
														</p>
													)}
												</div>
											</div>
										)
									})}
								</div>
							</div>
						</RevealEra>
					)
				})}
			</div>
		</section>
	)
}
