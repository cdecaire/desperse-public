const TRAIT_PILLARS = [
	{ name: "Faction Alignment", pct: 100, highlight: true, anomaly: false },
	{ name: "Signal Exposure", pct: 78, highlight: false, anomaly: false },
	{ name: "Modification Grade", pct: 65, highlight: false, anomaly: false },
	{ name: "Continuity Status", pct: 52, highlight: false, anomaly: false },
	{ name: "District Affinity", pct: 40, highlight: true, anomaly: false },
	{ name: "Echo Classification", pct: 8, highlight: false, anomaly: true },
]

const RANKS = [
	{ name: "Low Rank", pct: 52 },
	{ name: "Mid Rank", pct: 34 },
	{ name: "High Rank", pct: 14 },
]

const CONDITIONS = [
	{ name: "Stable", pct: 60, color: "nx-bg-primary-container", label: "nx-text-primary-container" },
	{ name: "Corrupted", pct: 28, color: "nx-bg-secondary-container", label: "nx-text-secondary-container" },
	{ name: "Despersed", pct: 22, color: "bg-[var(--nx-on-surface-variant)]", label: "nx-text-on-surface-variant" },
]

function ProgressBar({ pct, name, color = "nx-bg-primary-container" }: { pct: number; name: string; color?: string }) {
	return (
		<div
			className="h-1.5 nx-bg-surface-high overflow-hidden"
			role="progressbar"
			aria-valuenow={pct}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-label={`${name}: ${pct}%`}
		>
			<div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
		</div>
	)
}

import { useScrollReveal } from "./hooks/useScrollReveal"

export function EchoesLoreTraits() {
	const sectionRef = useScrollReveal<HTMLElement>()

	return (
		<section ref={sectionRef} className="py-20 md:py-32 px-4 md:px-20 nx-section-divider" aria-label="Traits">
			<div className="max-w-7xl mx-auto">
				<div className="flex flex-col lg:flex-row gap-12 md:gap-20">
					{/* Left: Trait pillars */}
					<div className="lg:w-1/3" data-reveal="left">
						<h2 className="font-headline text-3xl sm:text-4xl lg:text-5xl uppercase tracking-tight leading-[1.1] mb-2">
							Archive Conditions
						</h2>
						<span className="block text-xs nx-text-primary-container mt-2 tracking-[0.2em] font-label mb-8">
							IDENTITY FRAMEWORK: ACTIVE
						</span>
						<p className="font-body nx-text-on-surface-variant mb-12 text-sm">
							Each recovered Echo carries metadata shaped by faction, district,
							exposure to DSPRS, modification depth, and how much of them
							remained stable after the Cascade.
						</p>

						<div className="space-y-2">
							{TRAIT_PILLARS.map((s, i) => (
								<div
									key={s.name}
									className={`p-4 nx-bg-surface-low ${s.anomaly ? "border-l-4 border-[var(--nx-secondary)] mt-4" : i === 0 ? "border-l-4 border-[var(--nx-primary-container)]" : s.highlight ? "border-l-4 border-[var(--nx-secondary-container)]" : "border-l-4 nx-border-subtle-30"}`}
								>
									<div className="flex justify-between items-center">
										<span className={`font-headline uppercase text-sm ${s.anomaly ? "nx-text-secondary" : ""}`}>{s.name}</span>
										<span className={`font-label text-xs ${s.anomaly ? "nx-text-secondary" : i === 0 ? "nx-text-primary-container" : s.highlight ? "nx-text-secondary-container" : "nx-text-on-surface-variant"}`}>
											{s.pct}%
										</span>
									</div>
									{i === 0 && (
										<div className="text-xs font-label nx-text-primary-container tracking-[0.2em] uppercase mt-1 opacity-80">
											[ PRIMARY IDENTITY AXIS ]
										</div>
									)}
									{s.anomaly && (
										<div className="text-xs font-label nx-text-secondary tracking-[0.2em] uppercase mt-1 opacity-80">
											[ ANOMALY LAYER ]
										</div>
									)}
								</div>
							))}
						</div>
					</div>

					{/* Right: Rank + Condition */}
					<div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-8" data-reveal="right">
						{/* Rank distribution */}
						<div className="space-y-6">
							<h3 className="font-label text-xs nx-text-primary-container tracking-[0.2em] uppercase">
								Rank Distribution
							</h3>
							<div className="space-y-4">
								{RANKS.map((r) => (
									<div
										key={r.name}
										className="relative h-12 nx-bg-surface-high border nx-border-subtle-30 flex items-center px-4 overflow-hidden"
										role="progressbar"
										aria-valuenow={r.pct}
										aria-valuemin={0}
										aria-valuemax={100}
										aria-label={`${r.name}: ${r.pct}%`}
									>
										<div
											className="absolute inset-y-0 left-0 bg-[rgba(var(--nx-primary-container-rgb),0.1)]"
											style={{ width: `${r.pct}%` }}
										/>
										<span className="relative font-headline text-xs uppercase">{r.name}</span>
										<span className="relative ml-auto font-label text-xs">{r.pct}%</span>
									</div>
								))}
							</div>
						</div>

						{/* Continuity conditions */}
						<div className="space-y-6">
							<h3 className="font-label text-xs nx-text-secondary-container tracking-[0.2em] uppercase">
								Continuity Status
							</h3>
							<div className="grid grid-cols-1 gap-4">
								{CONDITIONS.map((c) => (
									<div key={c.name} className="p-4 md:p-6 border nx-border-subtle-30 nx-bg-surface-low">
										<div className="flex justify-between items-baseline mb-2">
											<span className="font-headline uppercase text-xl">{c.pct}%</span>
											<span className={`font-label text-xs ${c.label} uppercase`}>{c.name}</span>
										</div>
										<ProgressBar pct={c.pct} name={c.name} color={c.color} />
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
