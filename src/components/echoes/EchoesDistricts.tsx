export function EchoesDistricts() {
	return (
		<section id="factions" className="py-20 md:py-24 px-4 md:px-20 nx-bg-surface-lowest" aria-label="Districts">
			{/* Header */}
			<div className="mb-12 md:mb-20 text-center">
				<h2 className="font-headline text-3xl md:text-5xl uppercase tracking-tight mb-4">
					FACTIONS OF TESSERA
				</h2>
				<p className="font-label text-xs tracking-[0.2em] uppercase nx-text-outline">
					5 FACTIONS // 8,888 ECHOES // DESPERSED IDENTITIES
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
				{/* Registry Spire — Syre Group — spans 2 */}
				<div className="md:col-span-2 p-6 md:p-10 relative overflow-hidden nx-bg-surface-low">
					<div className="absolute top-0 right-0 p-3 md:p-4 font-label text-[10px] nx-text-primary-container border-b border-l nx-border-subtle-30">
						DISTRICT: REGISTRY_SPIRE
					</div>
					<h3 className="font-headline text-2xl md:text-3xl mb-4 md:mb-6 nx-text-primary-container">
						SYRE GROUP
					</h3>
					<div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
						<div className="flex-1 space-y-4">
							<p className="font-body text-sm nx-text-on-surface-variant">
								They rebuilt Tessera, then patented access to it. The Syres
								run the Registry and believe identity should only persist
								inside licensed systems. Their power is not law. It is permission.
							</p>
							<div className="font-label text-xs uppercase tracking-widest py-2 border-y nx-border-subtle-10">
								Territory: <span className="nx-text-primary">REGISTRY SPIRE // BLACK GLASS TOWERS</span>
							</div>
						</div>
						<div className="w-full md:w-48 aspect-video md:aspect-square nx-glitch nx-bg-surface-high bg-gradient-to-br from-[rgba(0,191,166,0.1)] to-[rgba(42,42,42,1)]" />
					</div>
				</div>

				{/* Ward Delta — Tessera Wardens */}
				<div className="p-6 md:p-10 flex flex-col justify-between nx-bg-secondary-container">
					<div>
						<svg className="w-9 h-9 mb-4 md:mb-6 nx-text-on-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
							<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
						</svg>
						<h3 className="font-headline text-2xl md:text-3xl uppercase leading-none mb-4 nx-text-on-secondary">
							TESSERA WARDENS
						</h3>
						<p className="font-body text-xs nx-text-on-secondary">
							They were hired to secure Tessera. Now they collect from it.
							Every checkpoint is a border. Every raid is an inventory pass.
							The Registry owns the rules. The Tees sell the exceptions.
						</p>
					</div>
					<div className="mt-6 md:mt-8 font-label text-xs tracking-tighter nx-text-on-secondary opacity-70">
						[WARD_DELTA // DISTRICT ENFORCEMENT]
					</div>
				</div>

				{/* Signal Architecture */}
				<div className="p-6 md:p-10 relative overflow-hidden nx-bg-surface-high border-r-8 border-[var(--nx-primary-container)]">
					<h3 className="font-headline text-2xl md:text-3xl mb-4 uppercase nx-text-primary-container">
						ARCHIVE_CONDITIONS
					</h3>
					<div className="space-y-4 md:space-y-6">
						<div className="flex justify-between items-end pb-2 border-b nx-border-subtle">
							<span className="font-label text-xs uppercase tracking-widest nx-text-on-surface-variant">Faction Count</span>
							<span className="font-headline text-xl md:text-2xl">5 FACTIONS</span>
						</div>
						<div className="flex justify-between items-end pb-2 border-b nx-border-subtle">
							<span className="font-label text-xs uppercase tracking-widest nx-text-on-surface-variant">Total Supply</span>
							<span className="font-headline text-lg md:text-xl">8,888 ECHOES</span>
						</div>
						<div className="pt-4">
							<div className="font-label text-[10px] uppercase tracking-[0.2em] mb-2 nx-text-outline">
								FACTION_BALANCE: DISTRIBUTED
							</div>
							<div className="flex gap-1">
								<div className="h-1.5 w-1/5 nx-bg-primary-container" />
								<div className="h-1.5 w-1/5 nx-bg-secondary-container" />
								<div className="h-1.5 w-1/5 bg-[var(--nx-on-tertiary-container)]" />
								<div className="h-1.5 w-1/5 bg-[var(--nx-outline)]" />
								<div className="h-1.5 w-1/5 bg-[var(--nx-primary)]" />
							</div>
							<div className="mt-1 text-[10px] font-label uppercase nx-text-outline">
								Syre / Wardens / Siphon / Unwritten / Witnesses
							</div>
						</div>
					</div>
				</div>

				{/* The Conduits — The Siphon */}
				<div className="p-6 md:p-10 relative overflow-hidden nx-bg-surface-highest border-l-8 border-[var(--nx-on-tertiary-container)]">
					<div className="absolute inset-0 bg-gradient-to-br from-[rgba(123,0,144,0.2)] to-transparent" />
					<div className="relative z-10">
						<h3 className="font-headline text-2xl md:text-3xl mb-4 uppercase">THE SIPHON</h3>
						<p className="font-body text-sm mb-6 nx-text-on-surface-variant">
							What can still travel cannot be owned. The Siphon
							keeps people, medicine, archives, and unlicensed identities moving
							through Tessera's blind spots.
						</p>
						<div className="flex gap-2">
							<div className="h-1 flex-1 bg-[var(--nx-on-tertiary-container)]" />
							<div className="h-1 flex-1 bg-[rgba(110,68,104,0.3)]" />
							<div className="h-1 flex-1 bg-[rgba(110,68,104,0.1)]" />
						</div>
					</div>
				</div>

				{/* Unwritten + Witnesses — spans 2 */}
				<div className="md:col-span-2 p-6 md:p-10 flex flex-col md:flex-row gap-8 md:gap-10 items-center nx-bg-surface-high border-2 nx-border-subtle">
					<div className="w-full md:w-1/3 aspect-square nx-glitch nx-glitch-heavy bg-black border border-[rgba(0,191,166,0.2)]" />
					<div className="flex-1">
						<h3 className="font-headline text-xl md:text-2xl mb-4 uppercase">THE UNWRITTEN & THE WITNESSES</h3>
						<p className="font-body text-sm mb-6 nx-text-on-surface-variant">
							The Unwritten are bodies changed by exposure, refusal, and survival.
							Black-clinic survivors, illegal grafts, Cascade-reshaped post-humans.
							The Witnesses are machine mystics who believe DSPRS woke something inside
							the archive. They worship persistence within the system.
						</p>
						<div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
							{["Black Clinic Row", "The Vault Below", "Dead Grid", "Signal Shrines"].map((t) => (
								<div key={t} className="text-[10px] font-label uppercase tracking-widest p-2 nx-text-outline nx-bg-surface">{t}</div>
							))}
							{["Unwritten: Post-Human", "Witnesses: Continuity"].map((t) => (
								<div key={t} className="text-[10px] font-label uppercase tracking-widest p-2 nx-text-primary-container nx-bg-surface border border-[rgba(0,191,166,0.2)]">{t}</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
