import { createFileRoute, Link, notFound } from "@tanstack/react-router"
import { FACTIONS } from "@/data/echoes-factions"

const BASE_URL = "https://desperse.com"

function getFaction(slug: string) {
	return FACTIONS.find((faction) => faction.slug === slug)
}

export const Route = createFileRoute("/echoes/factions/$factionSlug")({
	loader: ({ params }) => {
		const faction = getFaction(params.factionSlug)

		if (!faction) {
			throw notFound()
		}

		return { faction }
	},
	head: ({ loaderData, params }) => {
		const faction = loaderData?.faction ?? getFaction(params.factionSlug)
		const name = faction?.name ?? "Echoes Faction"
		const description = faction?.description ?? "Explore the factions of Tessera inside the Echoes archive."
		const url = `${BASE_URL}/echoes/factions/${params.factionSlug}`
		const canonicalArchiveUrl = `${BASE_URL}/echoes/lore#faction-${params.factionSlug}`

		return {
			meta: [
				{ title: `${name} — Echoes Faction Dossier` },
				{ name: "description", content: description },
				{ name: "theme-color", content: faction?.accentColor ?? "#131313" },
				{ property: "og:title", content: `${name} — Echoes Faction Dossier` },
				{ property: "og:description", content: description },
				{ property: "og:type", content: "article" },
				{ property: "og:url", content: url },
				{ name: "twitter:card", content: "summary_large_image" },
				{ name: "twitter:title", content: `${name} — Echoes Faction Dossier` },
				{ name: "twitter:description", content: description },
			],
			links: [
				{ rel: "canonical", href: url },
				{ rel: "alternate", href: canonicalArchiveUrl },
			],
		}
	},
	component: EchoesFactionDossierPage,
})

function EchoesFactionDossierPage() {
	const { faction } = Route.useLoaderData()
	const archiveAnchor = `/echoes/lore#faction-${faction.slug}`

	return (
		<article className="min-h-screen px-4 md:px-20 py-20 md:py-28 nx-bg-surface-lowest">
			<div className="max-w-4xl mx-auto">
				<nav className="mb-10 font-label text-xs uppercase tracking-widest nx-text-outline" aria-label="Echoes archive breadcrumb">
					<Link to="/echoes/lore" hash="factions" className="hover:nx-text-primary transition-colors">
						Echoes Archive
					</Link>
					<span aria-hidden="true"> // </span>
					<span>{faction.name}</span>
				</nav>

				<header className="mb-12">
					<span className="font-label text-[10px] tracking-[0.2em] uppercase block mb-4" style={{ color: faction.accentColor }}>
						{faction.tag}
					</span>
					<h1 id={`faction-${faction.slug}`} className="font-headline text-4xl md:text-7xl uppercase tracking-tight mb-6">
						{faction.name}
					</h1>
					<p className="font-body text-lg md:text-xl nx-text-on-surface-variant leading-relaxed">
						{faction.description}
					</p>
				</header>

				<section aria-labelledby={`${faction.slug}-dossier-heading`} className="space-y-6 mb-12">
					<h2 id={`${faction.slug}-dossier-heading`} className="font-headline text-2xl md:text-3xl uppercase tracking-tight">
						Faction dossier
					</h2>
					<p className="font-body text-sm md:text-base nx-text-on-surface-variant leading-relaxed">
						{faction.fullDescription}
					</p>
				</section>

				<section aria-labelledby={`${faction.slug}-signals-heading`} className="grid gap-4 md:grid-cols-2 mb-12">
					<h2 id={`${faction.slug}-signals-heading`} className="sr-only">
						Indexable faction signals
					</h2>
					<div className="p-5 nx-bg-surface-low border nx-border-subtle-10 md:col-span-2">
						<h3 className="font-label text-xs uppercase tracking-widest nx-text-outline mb-2">Central figure</h3>
						<p className="font-body text-sm nx-text-on-surface-variant">{faction.centralFigure}</p>
					</div>
					<div className="p-5 nx-bg-surface-low border nx-border-subtle-10">
						<h3 className="font-label text-xs uppercase tracking-widest nx-text-outline mb-2">Self</h3>
						<p className="font-body text-sm nx-text-on-surface-variant">{faction.selfDescription}</p>
					</div>
					<div className="p-5 nx-bg-surface-low border nx-border-subtle-10">
						<h3 className="font-label text-xs uppercase tracking-widest nx-text-outline mb-2">Others</h3>
						<p className="font-body text-sm nx-text-on-surface-variant">{faction.othersDescription}</p>
					</div>
					<div className="p-5 nx-bg-surface-low border nx-border-subtle-10">
						<h3 className="font-label text-xs uppercase tracking-widest nx-text-outline mb-2">Territory</h3>
						<p className="font-body text-sm nx-text-on-surface-variant">{faction.territory}</p>
					</div>
					<div className="p-5 nx-bg-surface-low border nx-border-subtle-10">
						<h3 className="font-label text-xs uppercase tracking-widest nx-text-outline mb-2">Visual cues</h3>
						<p className="font-body text-sm nx-text-on-surface-variant">{faction.visualCues}</p>
					</div>
				</section>

				<section aria-labelledby={`${faction.slug}-traits-heading`} className="mb-12">
					<h2 id={`${faction.slug}-traits-heading`} className="font-headline text-2xl md:text-3xl uppercase tracking-tight mb-4">
						Identity traits
					</h2>
					<ul className="grid gap-4 md:grid-cols-2" aria-label={`${faction.name} identity traits`}>
						{faction.identityTraits.map((trait: string) => (
							<li key={trait} className="p-5 nx-bg-surface-low border nx-border-subtle-10 font-body text-sm nx-text-on-surface-variant leading-relaxed">
								{trait}
							</li>
						))}
					</ul>
				</section>

				<section aria-labelledby={`${faction.slug}-role-heading`} className="mb-12">
					<h2 id={`${faction.slug}-role-heading`} className="font-headline text-2xl md:text-3xl uppercase tracking-tight mb-4">
						Narrative role in the 3E Cascade
					</h2>
					<p className="font-body text-sm md:text-base nx-text-on-surface-variant leading-relaxed">
						{faction.narrativeRole}
					</p>
				</section>

				<Link
					to="/echoes/lore"
					hash={`faction-${faction.slug}`}
					className="inline-flex font-label text-xs uppercase tracking-widest px-5 py-3 nx-bg-primary-container nx-text-on-primary-fixed hover:opacity-90 transition-opacity"
					aria-label={`Open ${faction.name} in the full Echoes archive`}
				>
					Open archive anchor: {archiveAnchor}
				</Link>
			</div>
		</article>
	)
}
