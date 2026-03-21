/**
 * Artist Application Page
 * Standalone layout (no app shell) matching browse/landing pages
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/shared/Logo";

export const Route = createFileRoute("/artist-application")({
	component: ArtistApplicationPage,
});

function ArtistApplicationPage() {
	return (
		<div className="min-h-screen bg-background text-foreground flex flex-col">
			{/* Header */}
			<header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center bg-background/80 backdrop-blur-md border-b border-border/50">
				<Link
					to="/"
					className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
				>
					<Logo size={15} className="text-foreground" />
					<span className="text-xl font-extrabold">Desperse</span>
				</Link>
			</header>

			{/* Form embed */}
			<main className="flex-1 pt-24 pb-10 flex justify-center">
				<iframe
					src="https://docs.google.com/forms/d/e/1FAIpQLSekbUh3gyIrUAmZRuCRDoGWOKtvTZJ0COsNDZfhflDEcUONvA/viewform?embedded=true"
					width="640"
					height="1260"
					className="max-w-full border-0"
					title="Google Form"
				>
					Loading...
				</iframe>
			</main>
		</div>
	)
}
