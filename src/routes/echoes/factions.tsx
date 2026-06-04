import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router"
import { FACTIONS } from "@/data/echoes-factions"

export const Route = createFileRoute("/echoes/factions")({
	head: () => ({
		meta: [
			{ title: "Echoes Factions — Tessera Dossiers" },
			{ name: "description", content: "Indexable faction dossiers for Syre Group, Tessera Wardens, The Siphon, The Unwritten, and The Witnesses in the Echoes archive." },
			{ name: "theme-color", content: "#131313" },
			{ property: "og:title", content: "Echoes Factions — Tessera Dossiers" },
			{ property: "og:description", content: "Indexable faction dossiers for the major Tessera factions inside the Echoes archive." },
			{ property: "og:type", content: "website" },
			{ property: "og:url", content: "https://desperse.com/echoes/factions" },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: "Echoes Factions — Tessera Dossiers" },
			{ name: "twitter:description", content: "Indexable faction dossiers for the major Tessera factions inside the Echoes archive." },
		],
		links: [{ rel: "canonical", href: "https://desperse.com/echoes/factions" }],
	}),
	component: EchoesFactionsIndexPage,
})

function EchoesFactionsIndexPage() {
	const matchRoute = useMatchRoute()
	const isDossierPage = matchRoute({ to: "/echoes/factions/$factionSlug" })

	if (isDossierPage) {
		return <Outlet />
	}

	return (
		<section className="min-h-screen px-4 md:px-20 py-20 md:py-28 nx-bg-surface-lowest">
			<div className="max-w-5xl mx-auto">
				<header className="mb-12">
					<span className="font-label text-[10px] tracking-[0.2em] uppercase nx-text-outline block mb-4">
						FACTION_DOSSIERS // {FACTIONS.length} ACTIVE CLASSIFICATIONS
					</span>
					<h1 id="factions" className="font-headline text-4xl md:text-7xl uppercase tracking-tight mb-6">
						Echoes Factions
					</h1>
					<p className="font-body text-lg md:text-xl nx-text-on-surface-variant leading-relaxed max-w-3xl">
						Every faction in Tessera answers the DSPRS event differently. These indexable dossiers expose the archive anchors, titles, and share metadata for each major classification.
					</p>
				</header>

				<div className="grid gap-4 md:grid-cols-2" aria-label="Echoes faction dossier links">
					{FACTIONS.map((faction) => (
						<article key={faction.slug} id={`faction-${faction.slug}`} className="p-5 md:p-6 nx-bg-surface-low border nx-border-subtle-10">
							<span className="font-label text-[10px] tracking-[0.2em] uppercase block mb-3" style={{ color: faction.accentColor }}>
								{faction.tag}
							</span>
							<h2 className="font-headline text-2xl md:text-3xl uppercase tracking-tight mb-3">
								<Link to="/echoes/factions/$factionSlug" params={{ factionSlug: faction.slug }} className="hover:nx-text-primary transition-colors">
									{faction.name}
								</Link>
							</h2>
							<p className="font-body text-sm nx-text-on-surface-variant leading-relaxed mb-4">
								{faction.description}
							</p>
							<Link
								to="/echoes/lore"
								hash={`faction-${faction.slug}`}
								className="font-label text-xs uppercase tracking-widest nx-text-outline hover:nx-text-primary transition-colors"
							>
								Open archive anchor
							</Link>
						</article>
					))}
				</div>
			</div>
		</section>
	)
}
