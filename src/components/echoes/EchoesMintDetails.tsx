import { useScrollReveal } from "./hooks/useScrollReveal"
import { useEchoesMintInfo } from "./hooks/useEchoesMintInfo"

export function EchoesMintDetails() {
	const sectionRef = useScrollReveal<HTMLElement>()
	const { data: mintInfo } = useEchoesMintInfo()

	const details = [
		{ label: "TOTAL SUPPLY", value: mintInfo?.supply ? mintInfo.supply.total.toLocaleString() : "8,888" },
		{ label: "MINT PRICE", value: mintInfo?.price ? mintInfo.price.display : "TBA" },
		{ label: "NETWORK", value: "SOLANA" },
		{ label: "MINTED", value: mintInfo?.supply ? `${mintInfo.supply.minted.toLocaleString()} / ${mintInfo.supply.total.toLocaleString()}` : "—" },
		{ label: "STANDARD", value: "METAPLEX CORE" },
		{ label: "REVEAL", value: "ON MINT" },
	]

	const currentPhase = mintInfo?.phase ?? "closed"
	const phases = [
		{
			phase: "01",
			title: "ALLOWLIST MINT",
			status: currentPhase === "whitelist" ? "ACTIVE" : currentPhase === "public" || currentPhase === "closed" ? "COMPLETE" : "PENDING",
			description: "Priority archive access for verified addresses. Early breach window before public opening.",
		},
		{
			phase: "02",
			title: "PUBLIC MINT",
			status: currentPhase === "public" ? "ACTIVE" : currentPhase === "closed" ? "COMPLETE" : "PENDING",
			description: "Open breach window. All wallets can recover despersed identities from the archive.",
		},
		{
			phase: "03",
			title: "COLLECTION COMPLETE",
			status: currentPhase === "closed" && mintInfo?.supply?.remaining === 0 ? "COMPLETE" : "PENDING",
			description: "Breach window closes. All recovered identities are already resolved — faction, continuity, and signal exposure visible from the moment of mint.",
		},
	]

	return (
		<section ref={sectionRef} className="py-16 md:py-24 px-4 md:px-20 nx-bg-surface-high nx-section-divider" aria-label="Mint details">
			<div className="max-w-7xl mx-auto">
			{/* Details grid */}
			<div className="mb-16 md:mb-20" data-reveal>
				<span className="font-label text-[10px] tracking-[0.2em] uppercase nx-text-outline block mb-3">
					SYSTEM_PARAMETERS
				</span>
				<h2 className="font-headline text-2xl md:text-4xl uppercase tracking-tight mb-8">
					MINT DETAILS
				</h2>

				<div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
					{details.map((d, i) => (
						<div key={d.label} className="p-4 md:p-5 nx-bg-surface-low" data-reveal-stagger style={{ "--stagger-index": i } as React.CSSProperties}>
							<span className="font-label text-[10px] tracking-widest uppercase block mb-2 nx-text-outline">
								{d.label}
							</span>
							<span className="font-headline text-lg md:text-xl uppercase">{d.value}</span>
						</div>
					))}
				</div>
			</div>

			{/* Timeline */}
			<div>
				<span className="font-label text-[10px] tracking-[0.2em] uppercase nx-text-outline block mb-3">
					DEPLOYMENT_LOG
				</span>
				<h2 className="font-headline text-2xl md:text-4xl uppercase tracking-tight mb-8">
					MINT TIMELINE
				</h2>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
					{phases.map((p, i) => (
						<div key={p.phase} className="p-6 nx-bg-surface-low border-t-2 border-[var(--nx-primary-container)]" data-reveal-stagger style={{ "--stagger-index": i } as React.CSSProperties}>
							<div className="flex items-center justify-between mb-4">
								<span className="font-headline text-sm nx-text-primary-container">
									PHASE_{p.phase}
								</span>
								<span className={`font-label text-[9px] tracking-widest uppercase px-2 py-1 ${
									p.status === "ACTIVE" ? "nx-bg-primary-container nx-text-on-primary-fixed" :
									p.status === "COMPLETE" ? "nx-bg-surface nx-text-primary-container" :
									"nx-bg-surface nx-text-outline"
								}`}>
									{p.status}
								</span>
							</div>
							<h3 className="font-headline text-lg uppercase mb-3">{p.title}</h3>
							<p className="font-body text-xs nx-text-on-surface-variant">{p.description}</p>
						</div>
					))}
				</div>
			</div>
			</div>
		</section>
	)
}
