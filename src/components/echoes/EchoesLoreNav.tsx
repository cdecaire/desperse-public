import { useEffect, useState, useRef } from "react"

const SECTIONS = [
	{ id: "system", label: "THE SYSTEM" },
	{ id: "factions", label: "FACTIONS" },
	{ id: "conflicts", label: "CONFLICTS" },
	{ id: "districts", label: "DISTRICTS" },
	{ id: "classifications", label: "CLASSIFICATIONS" },
	{ id: "ghost-class", label: "GHOST-CLASS" },
	{ id: "conditions", label: "CONDITIONS" },
	{ id: "timeline", label: "TIMELINE" },
]

export function EchoesLoreNav() {
	const [activeId, setActiveId] = useState<string | null>(null)
	const observerRef = useRef<IntersectionObserver | null>(null)

	useEffect(() => {
		const elements = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[]
		if (elements.length === 0) return

		observerRef.current = new IntersectionObserver(
			(entries) => {
				// Find the entry closest to the top of the viewport that is intersecting
				const visible = entries
					.filter((e) => e.isIntersecting)
					.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

				if (visible.length > 0) {
					setActiveId(visible[0].target.id)
				}
			},
			{
				rootMargin: "-20% 0px -60% 0px",
				threshold: 0,
			},
		)

		for (const el of elements) {
			observerRef.current.observe(el)
		}

		return () => observerRef.current?.disconnect()
	}, [])

	function scrollTo(id: string) {
		const el = document.getElementById(id)
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "start" })
		}
	}

	return (
		<nav
			className="hidden xl:flex fixed left-6 2xl:left-10 top-1/2 -translate-y-1/2 z-40 flex-col gap-0"
			aria-label="Archive index"
		>
			{/* Vertical connector line */}
			<div className="absolute left-[3px] top-2 bottom-2 w-px nx-bg-outline opacity-20" aria-hidden="true" />

			{SECTIONS.map((section) => {
				const isActive = activeId === section.id

				return (
					<button
						key={section.id}
						type="button"
						onClick={() => scrollTo(section.id)}
						className={`group relative flex items-center gap-3 min-h-[44px] py-2 text-left transition-all duration-300 ${
							isActive ? "opacity-100" : "opacity-40 hover:opacity-70"
						}`}
						aria-current={isActive ? "true" : undefined}
					>
						{/* Dot indicator */}
						<div
							className={`relative z-10 w-[7px] h-[7px] rounded-full transition-all duration-300 ${
								isActive
									? "nx-bg-primary-container scale-100 shadow-[0_0_8px_rgba(var(--nx-primary-container-rgb),0.4)]"
									: "nx-bg-outline scale-75 group-hover:scale-100"
							}`}
						/>

						{/* Label */}
						<span
							className={`font-label text-[9px] tracking-[0.15em] uppercase whitespace-nowrap transition-colors duration-300 ${
								isActive ? "nx-text-primary-container" : "nx-text-outline group-hover:nx-text-on-surface-variant"
							}`}
						>
							{section.label}
						</span>
					</button>
				)
			})}
		</nav>
	)
}
