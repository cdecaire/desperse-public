import { Link } from "@tanstack/react-router"
import { FACTIONS } from "@/data/echoes-factions"

export function EchoesFooter() {
	return (
		<footer className="w-full nx-bg-surface-lowest border-t nx-border-subtle-10">
			{/* Faction color bar */}
			<div className="flex h-[2px]" aria-hidden="true">
				{FACTIONS.map((f) => (
					<div key={f.slug} className="flex-1" style={{ backgroundColor: f.accentColor }} />
				))}
			</div>

			<div className="py-10 md:py-14 px-4 md:px-20 max-w-[1920px] mx-auto">
				<div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
					{/* Brand */}
					<div className="md:col-span-4">
						<div className="font-headline tracking-tighter text-lg mb-3">
							ECHOES // DESPERSE
						</div>
						<p className="font-body text-xs nx-text-on-surface-variant max-w-xs leading-relaxed">
							A generative cyberpunk PFP collection featuring 8,888 recovered identities
							shaped by faction, signal exposure, and survival.
						</p>
					</div>

					{/* Navigation */}
					<div className="md:col-span-3">
						<span className="font-label text-[9px] tracking-[0.2em] uppercase nx-text-outline block mb-4">NAVIGATE</span>
						<div className="flex flex-col gap-2">
							{[
								{ label: "Home", to: "/echoes" },
								{ label: "The Archive", to: "/echoes/lore" },
								{ label: "Mint", to: "/echoes/mint" },
								{ label: "Collection", to: "/echoes/collection" },
								{ label: "FAQ", to: "/echoes/faq" },
							].map((link) => (
								<Link
									key={link.to}
									to={link.to}
									className="font-label text-xs tracking-widest uppercase nx-text-muted-40 nx-hover-text transition-colors w-fit"
								>
									{link.label}
								</Link>
							))}
						</div>
					</div>

					{/* Social */}
					<div className="md:col-span-3">
						<span className="font-label text-[9px] tracking-[0.2em] uppercase nx-text-outline block mb-4">SIGNAL</span>
						<div className="flex flex-col gap-2">
							{[
								{ label: "TWITTER / X", href: "#" },
								{ label: "DISCORD", href: "#" },
								{ label: "DESPERSE.COM", href: "https://desperse.com" },
							].map((link) => (
								<a
									key={link.label}
									href={link.href}
									className="font-label text-xs tracking-widest uppercase nx-text-muted-40 nx-hover-cyan transition-colors w-fit"
									target={link.href !== "#" ? "_blank" : undefined}
									rel={link.href !== "#" ? "noopener noreferrer" : undefined}
									aria-label={link.href !== "#" ? `${link.label} (opens in new tab)` : undefined}
								>
									{link.label}
								</a>
							))}
						</div>
					</div>

					{/* Status */}
					<div className="md:col-span-2">
						<span className="font-label text-[9px] tracking-[0.2em] uppercase nx-text-outline block mb-4">STATUS</span>
						<div className="flex items-center gap-2 mb-2">
							<div className="w-2 h-2 rounded-full nx-bg-primary-container animate-nx-pulse" />
							<span className="font-label text-[9px] tracking-widest uppercase nx-text-primary-container">
								SIGNAL ACTIVE
							</span>
						</div>
						<span className="font-label text-[9px] tracking-widest uppercase nx-text-outline">
							SOLANA DEVNET
						</span>
					</div>
				</div>

				{/* Bottom bar */}
				<div className="mt-10 pt-6 border-t nx-border-subtle-10 flex flex-col sm:flex-row justify-between items-center gap-4">
					<span className="font-label text-[9px] tracking-[0.2em] uppercase nx-text-muted-40">
						&copy;{new Date().getFullYear()} ECHOES BY DESPERSE // SIGNAL PERSISTS
					</span>
					<span className="font-label text-[9px] tracking-[0.2em] uppercase nx-text-muted-40">
						8,888 DESPERSED IDENTITIES // SOLANA
					</span>
				</div>
			</div>
		</footer>
	)
}
