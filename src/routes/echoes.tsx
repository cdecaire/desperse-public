/**
 * Echoes — Layout route for all /echoes/* pages.
 * Standalone layout (no app shell) with fully isolated visual identity.
 * Shared: nav, footer, scanline/noise overlays, CSS, fonts, mint phase context.
 */

import { useEffect } from "react"
import { createFileRoute, Outlet } from "@tanstack/react-router"
import { EchoesNav } from "@/components/echoes/EchoesNav"
import { EchoesFooter } from "@/components/echoes/EchoesFooter"
import { MintPhaseProvider } from "@/components/echoes/hooks/useMintPhase"
import { useCorruptionEffect } from "@/components/echoes/hooks/useCorruptionEffect"
import { EchoesGate } from "@/components/echoes/EchoesGate"
import { EchoesBootScreen } from "@/components/echoes/EchoesBootScreen"

import echoesCss from "@/styles-echoes.css?url"

export const Route = createFileRoute("/echoes")({
	head: () => ({
		links: [
			{ rel: "stylesheet", href: echoesCss },
			{ rel: "preload", href: "/fonts/kh-interference/KHInterferenceTRIAL-Regular.woff2", as: "font", type: "font/woff2", crossOrigin: "anonymous" },
			{ rel: "preload", href: "/fonts/monaspace-krypton/MonaspaceKrypton-Variable.woff2", as: "font", type: "font/woff2", crossOrigin: "anonymous" },
		],
	}),
	component: EchoesLayout,
})

function EchoesLayout() {
	useCorruptionEffect(".echoes")

	// Set body attribute for Privy modal CSS overrides (portals render outside .echoes scope)
	useEffect(() => {
		document.body.setAttribute("data-echoes", "")
		return () => document.body.removeAttribute("data-echoes")
	}, [])

	useEffect(() => {
		console.log(
			"%c\n" +
			"  ██████╗ ███████╗██████╗ ██████╗ ███████╗\n" +
			"  ██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔════╝\n" +
			"  ██║  ██║███████╗██████╔╝██████╔╝███████╗\n" +
			"  ██║  ██║╚════██║██╔═══╝ ██╔══██╗╚════██║\n" +
			"  ██████╔╝███████║██║     ██║  ██║███████║\n" +
			"  ╚═════╝ ╚══════╝╚═╝     ╚═╝  ╚═╝╚══════╝\n" +
			"\n" +
			"  TRACE DETECTED // SIGNAL PERSISTS\n" +
			"  ECHOES — 4,444 DESPERSED IDENTITIES\n",
			"color: #00BFA6; font-family: monospace; font-size: 10px;"
		)
	}, [])

	return (
		<EchoesGate>
			<EchoesBootScreen>
				<MintPhaseProvider>
					<div className="echoes min-h-screen overflow-x-clip">
					{/* Skip to content */}
					<a
						href="#echoes-content"
						className="sr-only focus:not-sr-only focus:fixed focus:top-16 focus:left-2 focus:z-(--z-skip-link) focus:px-4 focus:py-2 focus:nx-bg-primary-container focus:nx-text-on-primary-fixed focus:font-label focus:text-sm focus:uppercase"
					>
						Skip to content
					</a>

					{/* Scanline + noise overlays */}
					<div className="fixed inset-0 scanline-overlay z-[60] pointer-events-none" aria-hidden="true" />
					<div className="fixed inset-0 noise-grain z-[61] pointer-events-none" aria-hidden="true" />

					<EchoesNav />
					<main id="echoes-content">
						<Outlet />
					</main>
					<EchoesFooter />
				</div>
				</MintPhaseProvider>
			</EchoesBootScreen>
		</EchoesGate>
	)
}
