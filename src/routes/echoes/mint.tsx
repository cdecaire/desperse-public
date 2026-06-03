/**
 * Echoes — Mint page
 * Dedicated mint experience with phase-aware hero, details, how-it-works, and samples.
 */

import { createFileRoute } from "@tanstack/react-router"
import { EchoesMintHero } from "@/components/echoes/EchoesMintHero"
import { EchoesMintDetails } from "@/components/echoes/EchoesMintDetails"
import { EchoesMintHowItWorks } from "@/components/echoes/EchoesMintHowItWorks"
import { EchoesMintSamples } from "@/components/echoes/EchoesMintSamples"

export const Route = createFileRoute("/echoes/mint")({
	head: () => ({
		meta: [
			{ title: "ECHOES // MINT PROTOCOL" },
			{ name: "description", content: "Recover a despersed identity from the DSPRS event. 4,444 generative cyberpunk PFPs on Solana." },
			{ name: "theme-color", content: "#131313" },
			{ property: "og:title", content: "ECHOES // MINT PROTOCOL" },
			{ property: "og:description", content: "Recover a despersed identity from the DSPRS event. 8,888 generative cyberpunk PFPs on Solana." },
			{ property: "og:type", content: "website" },
			{ property: "og:url", content: "https://desperse.com/echoes/mint" },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: "ECHOES // MINT PROTOCOL" },
			{ name: "twitter:description", content: "Recover a despersed identity from the DSPRS event. 4,444 PFPs on Solana." },
		],
	}),
	component: EchoesMintPage,
})

function EchoesMintPage() {
	return (
		<>
			<EchoesMintHero />
			<EchoesMintDetails />
			<EchoesMintHowItWorks />
			<EchoesMintSamples />
		</>
	)
}
