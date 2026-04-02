/**
 * Echoes — The Archive
 * Single cohesive lore page: system, factions, districts, classifications,
 * Ghost-Class anomalies, archive conditions, timeline.
 */

import { createFileRoute } from "@tanstack/react-router"
import { EchoesLoreHero } from "@/components/echoes/EchoesLoreHero"
import { EchoesLoreNav } from "@/components/echoes/EchoesLoreNav"
import { EchoesLoreSystem } from "@/components/echoes/EchoesLoreSystem"
import { EchoesFactionGrid } from "@/components/echoes/EchoesFactionGrid"
import { EchoesFactionConflicts } from "@/components/echoes/EchoesFactionConflicts"
import { EchoesLoreDistricts } from "@/components/echoes/EchoesLoreDistricts"
import { EchoesLoreClassifications } from "@/components/echoes/EchoesLoreClassifications"
import { EchoesGhostClass } from "@/components/echoes/EchoesGhostClass"
import { EchoesLoreConditions } from "@/components/echoes/EchoesLoreConditions"
import { EchoesLoreTimeline } from "@/components/echoes/EchoesLoreTimeline"
import { EchoesLoreFaq } from "@/components/echoes/EchoesLoreFaq"

export const Route = createFileRoute("/echoes/lore")({
	head: () => ({
		meta: [
			{ title: "Echoes — The Archive" },
			{ name: "description", content: "The DSPRS archive. The Registry, factions, districts, Echo classifications, the 3E Cascade, and the continuity anomalies the city cannot explain." },
			{ name: "theme-color", content: "#131313" },
			{ property: "og:title", content: "Echoes — The Archive" },
			{ property: "og:description", content: "The DSPRS archive. The Registry, factions, districts, and the continuity anomalies the city cannot explain." },
			{ property: "og:type", content: "website" },
			{ property: "og:url", content: "https://desperse.com/echoes/lore" },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: "Echoes — The Archive" },
			{ name: "twitter:description", content: "The DSPRS archive. The Registry, factions, districts, and the continuity anomalies the city cannot explain." },
		],
	}),
	component: EchoesLorePage,
})

function EchoesLorePage() {
	return (
		<>
			<EchoesLoreNav />
			<EchoesLoreHero />
			<EchoesLoreSystem />
			<EchoesFactionGrid />
			<EchoesFactionConflicts />
			<EchoesLoreDistricts />
			<EchoesLoreClassifications />
			<EchoesGhostClass />
			<EchoesLoreConditions />
			<EchoesLoreTimeline />
			<EchoesLoreFaq />
		</>
	)
}
