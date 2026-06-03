/**
 * Echoes — Landing Page (index)
 * Hero, gallery, factions teaser, explainer, lore teaser, CTA.
 */

import { createFileRoute } from "@tanstack/react-router"
import { EchoesHero } from "@/components/echoes/EchoesHero"
import { EchoesGallery } from "@/components/echoes/EchoesGallery"
import { EchoesFactionsTeaser } from "@/components/echoes/EchoesFactionsTeaser"
import { EchoesExplainer } from "@/components/echoes/EchoesExplainer"
import { EchoesLore } from "@/components/echoes/EchoesLore"
import { EchoesCta } from "@/components/echoes/EchoesCta"

export const Route = createFileRoute("/echoes/")({
	head: () => ({
		meta: [
			{ title: "ECHOES // DSPRS TRACE DETECTED" },
			{ name: "description", content: "Recovered identities from the DSPRS event. A generative cyberpunk PFP collection from Desperse. 4,444 Echoes on Solana." },
			{ name: "theme-color", content: "#131313" },
			{ property: "og:title", content: "ECHOES // DSPRS TRACE DETECTED" },
			{ property: "og:description", content: "Recovered identities from the DSPRS event. A generative cyberpunk PFP collection from Desperse." },
			{ property: "og:type", content: "website" },
			{ property: "og:url", content: "https://desperse.com/echoes" },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: "ECHOES // DSPRS TRACE DETECTED" },
			{ name: "twitter:description", content: "Recovered identities from the DSPRS event. A generative cyberpunk PFP collection from Desperse." },
		],
	}),
	component: EchoesIndex,
})

function EchoesIndex() {
	return (
		<>
			<EchoesHero />
			<EchoesGallery />
			<EchoesFactionsTeaser />
			<EchoesExplainer />
			<EchoesLore />
			<EchoesCta />
		</>
	)
}
