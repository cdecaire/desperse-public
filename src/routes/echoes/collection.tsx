/**
 * Echoes — Collection Explorer
 * Interactive search, filter, and stats view for the generated collection.
 */

import { createFileRoute } from "@tanstack/react-router"
import { EchoesCollection } from "@/components/echoes/EchoesCollection"

export const Route = createFileRoute("/echoes/collection")({
	head: () => ({
		meta: [
			{ title: "ECHOES // COLLECTION EXPLORER" },
			{ name: "description", content: "Browse, search, and filter the Echoes collection. View trait distributions and explore recovered identities." },
			{ name: "theme-color", content: "#131313" },
			{ property: "og:title", content: "ECHOES // COLLECTION EXPLORER" },
			{ property: "og:description", content: "Browse, search, and filter the Echoes collection. View trait distributions and explore recovered identities." },
			{ property: "og:type", content: "website" },
			{ property: "og:url", content: "https://desperse.com/echoes/collection" },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: "ECHOES // COLLECTION EXPLORER" },
			{ name: "twitter:description", content: "Browse, search, and filter the Echoes collection." },
		],
	}),
	component: EchoesCollectionPage,
})

function EchoesCollectionPage() {
	return <EchoesCollection />
}
