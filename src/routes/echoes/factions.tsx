/**
 * Redirect /echoes/factions → /echoes/lore#factions
 */

import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/echoes/factions")({
	beforeLoad: () => {
		throw redirect({ to: "/echoes/lore", hash: "factions" })
	},
})
