/**
 * Echoes — FAQ page
 * All FAQ items organized by category.
 */

import { createFileRoute } from "@tanstack/react-router"
import { EchoesFaqHero } from "@/components/echoes/EchoesFaqHero"
import { EchoesFaqFull } from "@/components/echoes/EchoesFaqFull"

export const Route = createFileRoute("/echoes/faq")({
	head: () => ({
		meta: [
			{ title: "ECHOES // FAQ" },
			{ name: "description", content: "Frequently asked questions about the Echoes PFP collection, minting, factions, and the DSPRS world." },
			{ name: "theme-color", content: "#131313" },
			{ property: "og:title", content: "ECHOES // FAQ" },
			{ property: "og:description", content: "Frequently asked questions about the Echoes PFP collection, minting, and the DSPRS world." },
			{ property: "og:type", content: "website" },
			{ property: "og:url", content: "https://desperse.com/echoes/faq" },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: "ECHOES // FAQ" },
			{ name: "twitter:description", content: "FAQ — Echoes PFP collection by Desperse." },
		],
	}),
	component: EchoesFaqPage,
})

function EchoesFaqPage() {
	return (
		<>
			<EchoesFaqHero />
			<EchoesFaqFull />
		</>
	)
}
