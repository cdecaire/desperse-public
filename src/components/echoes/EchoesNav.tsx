import { useEffect, useState } from "react"
import { Link, useLocation } from "@tanstack/react-router"
import { EchoesWalletButton } from "./EchoesWalletButton"

const NAV_ITEMS = [
	{ label: "HOME", to: "/echoes" },
	{ label: "THE ARCHIVE", to: "/echoes/lore" },
	{ label: "MINT", to: "/echoes/mint" },
	{ label: "COLLECTION", to: "/echoes/collection" },
	{ label: "FAQ", to: "/echoes/faq" },
]

export function EchoesNav() {
	const [menuOpen, setMenuOpen] = useState(false)
	const { pathname } = useLocation()

	useEffect(() => {
		if (!menuOpen) return
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setMenuOpen(false)
		}
		document.addEventListener("keydown", handleKeyDown)
		return () => document.removeEventListener("keydown", handleKeyDown)
	}, [menuOpen])

	return (
		<nav className="fixed top-0 w-full z-50 h-14 md:h-16 backdrop-blur-xl border-b nx-border-subtle shadow-[0_0_40px_rgba(var(--nx-primary-container-rgb),0.05)] bg-[rgba(var(--nx-surface-rgb),0.9)]" aria-label="Main navigation">
			<div className="flex justify-between items-center w-full px-4 md:px-6 max-w-[1920px] mx-auto h-full">
				<Link to="/echoes" className="text-lg md:text-xl tracking-[-0.05em] font-headline nx-text-primary-container">
					ECHOES // DSPRS
				</Link>

				{/* Desktop nav */}
				<div className="hidden md:flex gap-8 items-center">
					{NAV_ITEMS.map((item) => {
						const isHome = item.to === "/echoes"
						const isActive = isHome
							? pathname === "/echoes" || pathname === "/echoes/"
							: pathname.startsWith(item.to)
						const isMint = item.label === "MINT"

						return (
							<Link
								key={item.label}
								to={item.to}
								className={`font-label uppercase tracking-tighter text-[0.6875rem] transition-colors duration-100 ${
									isMint
										? "px-3 py-1.5 border border-[var(--nx-primary-container)] nx-text-primary-container hover:nx-bg-primary-container hover:nx-text-on-primary-fixed"
										: isActive
											? "nx-text-primary-container"
											: "nx-text-muted nx-hover-text"
								}`}
							>
								{item.label}
							</Link>
						)
					})}
				</div>

				<div className="flex items-center gap-3 md:gap-4">
					<EchoesWalletButton />

					{/* Mobile hamburger */}
					<button
						type="button"
						className="md:hidden flex items-center justify-center w-11 h-11 nx-text-on-surface"
						onClick={() => setMenuOpen(!menuOpen)}
						aria-label={menuOpen ? "Close menu" : "Open menu"}
						aria-expanded={menuOpen}
					>
						{menuOpen ? (
							<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
								<path d="M18 6L6 18M6 6l12 12" />
							</svg>
						) : (
							<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
								<path d="M3 12h18M3 6h18M3 18h18" />
							</svg>
						)}
					</button>
				</div>
			</div>

			{/* Mobile menu */}
			{menuOpen && (
				<div className="md:hidden nx-bg-surface border-b nx-border-subtle px-4 py-6">
					<div className="flex flex-col gap-1">
						{NAV_ITEMS.map((item) => {
							const isHome = item.to === "/echoes"
							const isActive = isHome
								? pathname === "/echoes" || pathname === "/echoes/"
								: pathname.startsWith(item.to)

							return (
								<Link
									key={item.label}
									to={item.to}
									className={`font-label uppercase tracking-tighter text-sm py-3 px-3 transition-colors ${
										isActive ? "nx-text-primary-container" : "nx-text-muted nx-hover-text"
									}`}
									onClick={() => setMenuOpen(false)}
								>
									{item.label}
								</Link>
							)
						})}
					</div>
				</div>
			)}
		</nav>
	)
}
