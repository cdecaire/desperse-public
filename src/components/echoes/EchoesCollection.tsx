import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import {
	ECHOES_METADATA,
	FACTION_COLORS,
	RANK_COLORS,
	TRAIT_TYPES,
	getDevImagePaths,
	type EchoMetadata,
} from "@/data/echoes-metadata"
import { getEchoPlaceholder } from "@/data/echoes-images"
import { Icon } from "@/components/ui/icon"
import { useEchoesMintedItems } from "./hooks/useEchoesMintedItems"

// --- Performance constants ---
const CHUNK_SIZE = 60

/** Memoized image path lookup — avoids recomputing paths on every render */
const imagePathCache = new Map<string, string[]>()
function getCachedImagePaths(item: EchoMetadata): string[] {
	const cached = imagePathCache.get(item.name)
	if (cached) return cached
	const paths = getDevImagePaths(item)
	imagePathCache.set(item.name, paths)
	return paths
}

// --- Hooks ---

/** Trap focus within a container and lock body scroll. Returns a ref to attach to the container. */
function useOverlay() {
	const ref = useRef<HTMLDivElement>(null)
	const previousFocus = useRef<HTMLElement | null>(null)

	useEffect(() => {
		// Save and move focus
		previousFocus.current = document.activeElement as HTMLElement
		const firstFocusable = ref.current?.querySelector<HTMLElement>(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
		)
		firstFocusable?.focus()

		// Lock body scroll
		const scrollY = window.scrollY
		document.body.style.position = "fixed"
		document.body.style.top = `-${scrollY}px`
		document.body.style.left = "0"
		document.body.style.right = "0"

		return () => {
			// Restore scroll
			document.body.style.position = ""
			document.body.style.top = ""
			document.body.style.left = ""
			document.body.style.right = ""
			window.scrollTo(0, scrollY)

			// Restore focus
			previousFocus.current?.focus()
		}
	}, [])

	// Focus trap
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key !== "Tab" || !ref.current) return
			const focusable = ref.current.querySelectorAll<HTMLElement>(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
			)
			if (focusable.length === 0) return
			const first = focusable[0]
			const last = focusable[focusable.length - 1]

			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault()
				last.focus()
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault()
				first.focus()
			}
		}
		document.addEventListener("keydown", handleKeyDown)
		return () => document.removeEventListener("keydown", handleKeyDown)
	}, [])

	return ref
}

/** Track which cards have been revealed via IntersectionObserver.
 *  Returns a Set of visible item keys and a callback ref for each card.
 *  The IO is created lazily (not in useEffect) so it's available when refs fire. */
function useGridReveal() {
	const [visible, setVisible] = useState<Set<string>>(() => new Set())
	const prefersReduced = useRef(
		typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
	)
	const observerRef = useRef<IntersectionObserver | null>(null)

	function getObserver() {
		if (observerRef.current) return observerRef.current
		if (typeof IntersectionObserver === "undefined") return null
		observerRef.current = new IntersectionObserver(
			(entries) => {
				const newlyVisible: string[] = []
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const key = (entry.target as HTMLElement).dataset.echoKey
						if (key) newlyVisible.push(key)
						observerRef.current?.unobserve(entry.target)
					}
				}
				if (newlyVisible.length > 0) {
					setVisible((prev) => {
						const next = new Set(prev)
						for (const k of newlyVisible) next.add(k)
						return next
					})
				}
			},
			{ rootMargin: "40px 0px", threshold: 0.05 },
		)
		return observerRef.current
	}

	useEffect(() => {
		return () => observerRef.current?.disconnect()
	}, [])

	const cardRef = useCallback((el: HTMLElement | null) => {
		if (!el) return
		const key = el.dataset.echoKey
		if (!key) return
		if (prefersReduced.current) {
			setVisible((prev) => {
				if (prev.has(key)) return prev
				const next = new Set(prev)
				next.add(key)
				return next
			})
			return
		}
		getObserver()?.observe(el)
	}, [])

	return { visible, cardRef }
}

// --- Helpers ---

function getTrait(item: EchoMetadata, traitType: string): string {
	const val = item.attributes.find((a) => a.trait_type === traitType)?.value
	return val != null ? String(val) : "None"
}

type TraitDist = { value: string; count: number; pct: number }[]

function computeTraitDistribution(traitType: string, items: EchoMetadata[] = ECHOES_METADATA): TraitDist {
	const counts: Record<string, number> = {}
	for (const item of items) {
		const val = getTrait(item, traitType)
		counts[val] = (counts[val] || 0) + 1
	}
	const total = items.length || 1
	return Object.entries(counts)
		.sort((a, b) => b[1] - a[1])
		.map(([value, count]) => ({ value, count, pct: Math.round((count / total) * 100) }))
}

/** Placeholder attributes for unrevealed echoes — no real trait data exposed */
const REDACTED_ATTRIBUTES: EchoMetadata["attributes"] = [
	{ trait_type: "Faction", value: "Unknown" },
	{ trait_type: "Substrate", value: "Unknown" },
	{ trait_type: "Signal", value: "Unknown" },
	{ trait_type: "Rank", value: "Common" },
	{ trait_type: "Frame", value: "Unknown" },
	{ trait_type: "Role", value: "Unknown" },
	{ trait_type: "Rarity Rank", value: 0, display_type: "number" },
	{ trait_type: "Rarity Score", value: 0, display_type: "number" },
]

/**
 * Redact metadata for unrevealed echoes — strips all traits so sorting/filtering
 * can't leak information about unminted items. Returns a new array (does not mutate).
 */
function redactMetadata(items: EchoMetadata[], mintedIndices: Set<number> | null): EchoMetadata[] {
	if (mintedIndices === null) {
		// Still loading — redact everything as a safe default
		return items.map((item) => ({
			...item,
			attributes: REDACTED_ATTRIBUTES,
		}))
	}
	return items.map((item) => {
		const id = getEchoId(item)
		if (mintedIndices.has(id)) return item
		return { ...item, attributes: REDACTED_ATTRIBUTES }
	})
}

/** Traits excluded from filters — shown via badge or not useful as filters */
const HIDDEN_FILTER_TRAITS = new Set([
	"Rarity Rank",
	"Rarity Score",
	"Rank",
	"Echo Classification",
	"Continuity Class",
	"Ghost Reconstruction",
	"Ghost Distortion",
	"Ghost Face Integrity",
	"Ghost Projection",
	"Ghost Echo Artifact",
	"Ghost Interference",
])
const FILTERABLE_TRAITS = TRAIT_TYPES.filter((t) => !HIDDEN_FILTER_TRAITS.has(t))

/** Get the rarity rank (1 = rarest) from the metadata's "Rarity Rank" trait */
function getRarityRank(item: EchoMetadata): number {
	const val = getTrait(item, "Rarity Rank")
	return Number.parseInt(val, 10) || 0
}

/** Rank tier styling — uses CSS custom properties set in styles-echoes.css */
const RANK_TIERS: Record<string, { color: string; bg: string; bgSolid: string }> = {
	Legendary: { color: "var(--nx-rank-legendary)", bg: "var(--nx-rank-legendary-bg)", bgSolid: "var(--nx-rank-legendary-bg-solid)" },
	Elite: { color: "var(--nx-rank-elite)", bg: "var(--nx-rank-elite-bg)", bgSolid: "var(--nx-rank-elite-bg-solid)" },
	Rare: { color: "var(--nx-rank-rare)", bg: "var(--nx-rank-rare-bg)", bgSolid: "var(--nx-rank-rare-bg-solid)" },
	Uncommon: { color: "var(--nx-rank-uncommon)", bg: "var(--nx-rank-uncommon-bg)", bgSolid: "var(--nx-rank-uncommon-bg-solid)" },
	Common: { color: "var(--nx-rank-common)", bg: "var(--nx-rank-common-bg)", bgSolid: "var(--nx-rank-common-bg-solid)" },
}

/** Build searchable text map from a (possibly redacted) metadata array */
function buildSearchableText(items: EchoMetadata[]): Map<EchoMetadata, string> {
	return new Map(
		items.map((item) => [
			item,
			[item.name, ...item.attributes.map((a) => `${a.trait_type} ${a.value}`)].join(" ").toLowerCase(),
		]),
	)
}

/** Combined rank + rarity badge */
function RarityBadge({ rank, rarityRank, size = "sm" }: { rank: string; rarityRank: number; size?: "sm" | "md" }) {
	const tier = RANK_TIERS[rank] ?? RANK_TIERS.Common
	const isSm = size === "sm"

	return (
		<div
			className={`group/badge relative inline-flex items-center gap-1 ${isSm ? "py-0.5 px-1.5" : "py-1 px-2"}`}
			style={{ backgroundColor: tier.bg, color: tier.color }}
		>
			<span className={`inline-block shrink-0 ${isSm ? "w-1.5 h-1.5" : "w-2 h-2"}`} style={{ backgroundColor: tier.color }} />
			<span className={`font-label uppercase tracking-wider ${isSm ? "text-[9px]" : "text-[10px]"}`}>
				{rank}
			</span>
			<span className={`font-label font-bold ${isSm ? "text-[9px]" : "text-[10px]"}`}>
				#{rarityRank}
			</span>
			{/* Hover tooltip */}
			<div
				className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 nx-bg-surface-container border nx-border-subtle-30 shadow-lg opacity-0 group-hover/badge:opacity-100 transition-opacity duration-150 whitespace-nowrap z-20"
				style={{ color: tier.color }}
			>
				<span className="font-label text-[10px] uppercase tracking-wider">
					{rank} — #{rarityRank} by rarity
				</span>
			</div>
		</div>
	)
}

// --- Sidebar (Search + Filters + Stats) ---

function Sidebar({
	filters,
	onFilterToggle,
	onClearAll,
	resultCount,
	dynamicDistributions,
	resolvedCount,
	baseDistributions,
}: {
	filters: Filters
	onFilterToggle: (trait: string, value: string) => void
	onClearAll: () => void
	resultCount: number
	dynamicDistributions: Record<string, TraitDist>
	resolvedCount: number | null
	baseDistributions: Record<string, TraitDist>
}) {
	const rankDist = baseDistributions["Rank"]
	const activeCount = Object.values(filters).reduce((sum, s) => sum + s.size, 0)

	return (
		<aside className="space-y-4" aria-label="Filters and collection statistics">
			{/* Filters header with count */}
			<div>
				<div className="flex items-baseline justify-between">
					<h3 className="font-label text-[10px] nx-text-primary-container tracking-[0.2em] uppercase">
						Filters
					</h3>
					<span className="font-label text-[10px] nx-text-on-surface-variant">
						{resultCount} / {ECHOES_METADATA.length}
					</span>
				</div>
				{activeCount > 0 && (
					<div className="mt-2 space-y-2">
						<div className="flex flex-wrap gap-1">
							{Object.entries(filters).flatMap(([trait, values]) =>
								[...values].map((val) => (
									<FilterPill key={`${trait}-${val}`} label={val} onClick={() => onFilterToggle(trait, val)} />
								)),
							)}
							<button
								type="button"
								onClick={onClearAll}
								className="inline-flex items-center gap-1 font-label text-[9px] min-h-[36px] px-2 py-1.5 uppercase tracking-wider border border-[var(--nx-secondary-container)] nx-text-secondary-container hover:bg-[rgba(var(--nx-secondary-container-rgb),0.1)] transition-colors"
							>
								Clear all
								<Icon name="xmark" className="text-[8px]" />
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Filter list — Faction excluded (handled by toolbar) */}
			<div className="space-y-1">
				{FILTERABLE_TRAITS.filter((t) => t !== "Faction").map((trait) => (
					<SidebarFilter
						key={trait}
						trait={trait}
						selected={filters[trait] ?? new Set()}
						onToggle={(val) => onFilterToggle(trait, val)}
						dist={dynamicDistributions[trait] ?? baseDistributions[trait]}
					/>
				))}
			</div>

			{/* Divider */}
			<div className="border-t nx-border-subtle-10" />

			{/* Stats header */}
			<div>
				<h2 className="font-headline text-lg uppercase tracking-tight leading-[1.1]">
					Archive Index
				</h2>
				<span className="block text-[10px] nx-text-primary-container mt-1 tracking-[0.2em] font-label">
					{ECHOES_METADATA.length} IDENTITIES
				</span>
				{resolvedCount !== null && (
					<span className="block text-[10px] nx-text-on-surface-variant mt-0.5 tracking-[0.15em] font-label">
						{resolvedCount} RESOLVED · {ECHOES_METADATA.length - resolvedCount} UNRESOLVED
					</span>
				)}
			</div>

			{/* Rank breakdown */}
			<div>
				<h3 className="font-label text-[10px] nx-text-primary-container tracking-[0.2em] uppercase mb-3">
					Rank Classification
				</h3>
				<div className="space-y-2">
					{rankDist.map((r) => (
						<div key={r.value}>
							<div className="flex justify-between mb-0.5">
								<span className="font-headline text-xs uppercase">{r.value}</span>
								<span className="font-label text-[10px] nx-text-on-surface-variant">{r.count} ({r.pct}%)</span>
							</div>
							<div
								className="h-1.5 nx-bg-surface-high overflow-hidden"
								role="progressbar"
								aria-valuenow={r.pct}
								aria-valuemin={0}
								aria-valuemax={100}
								aria-label={`${r.value}: ${r.pct}%`}
							>
								<div
									className="h-full transition-all duration-500"
									style={{
										width: `${r.pct}%`,
										backgroundColor: RANK_COLORS[r.value] ?? "var(--nx-on-surface-variant)",
									}}
								/>
							</div>
						</div>
					))}
				</div>
			</div>

		</aside>
	)
}

/** Sidebar filter — popover with search + scrollable value list */
function SidebarFilter({
	trait,
	selected,
	onToggle,
	dist,
}: {
	trait: string
	selected: Set<string>
	onToggle: (value: string) => void
	dist: TraitDist
}) {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState("")
	const popoverRef = useRef<HTMLDivElement>(null)
	const triggerRef = useRef<HTMLButtonElement>(null)

	// Filter values by search query
	const filtered = query
		? dist.filter((e) => e.value.toLowerCase().includes(query.toLowerCase()))
		: dist

	// Close on outside click
	useEffect(() => {
		if (!open) return
		function handleClick(e: MouseEvent) {
			if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
				setOpen(false)
				setQuery("")
			}
		}
		document.addEventListener("mousedown", handleClick)
		return () => document.removeEventListener("mousedown", handleClick)
	}, [open])

	// Close on Escape — return focus to trigger
	useEffect(() => {
		if (!open) return
		function handleKey(e: KeyboardEvent) {
			if (e.key === "Escape") {
				setOpen(false)
				setQuery("")
				triggerRef.current?.focus()
			}
		}
		document.addEventListener("keydown", handleKey)
		return () => document.removeEventListener("keydown", handleKey)
	}, [open])

	return (
		<div className="relative" ref={popoverRef}>
			<button
				ref={triggerRef}
				type="button"
				onClick={() => { setOpen(!open); setQuery("") }}
				aria-expanded={open}
				className={`w-full flex items-center justify-between min-h-[44px] py-2 px-2 text-left transition-colors duration-200 ${
					open
						? "nx-bg-surface-low nx-text-on-surface"
						: selected.size > 0
							? "nx-bg-surface-low nx-text-primary-container"
							: "hover:nx-bg-surface-low nx-text-on-surface"
				}`}
			>
				<span className="font-label text-[10px] uppercase tracking-wider">{trait}</span>
				<div className="flex items-center gap-1.5">
					{selected.size > 0 && (
						<span className="nx-bg-primary-container nx-text-on-primary-fixed w-4 h-4 flex items-center justify-center text-[9px] font-bold" aria-label={`${selected.size} selected`}>
							{selected.size}
						</span>
					)}
					<Icon name="chevron-down" className={`text-[10px] nx-text-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`} />
				</div>
			</button>

			{open && (
				<div className="absolute left-0 right-0 top-full mt-1 z-30 nx-bg-surface-container border nx-border-subtle-30 shadow-lg shadow-black/30" role="listbox" aria-label={`${trait} options`}>
					{/* Search within filter */}
					{dist.length > 6 && (
						<div className="p-2 border-b nx-border-subtle-10">
							<input
								type="text"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder={`Search ${trait.toLowerCase()}...`}
								aria-label={`Search ${trait} values`}
								autoFocus
								className="w-full h-8 px-2 font-body text-[11px] nx-bg-surface-low border nx-border-subtle-30 nx-text-on-surface placeholder:nx-text-muted focus:outline-none focus:border-[var(--nx-primary-container)] transition-colors"
							/>
						</div>
					)}

					{/* Scrollable value list */}
					<div className="max-h-52 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(59,73,76,0.3)_transparent]">
						{filtered.length === 0 ? (
							<div className="px-3 py-4 text-center">
								<span className="font-label text-[10px] nx-text-muted uppercase tracking-wider">No matches</span>
							</div>
						) : (
							filtered.map((entry) => {
								const isActive = selected.has(entry.value)
								return (
									<button
										key={entry.value}
										type="button"
										role="option"
										aria-selected={isActive}
										onClick={() => onToggle(entry.value)}
										className={`w-full flex items-center justify-between min-h-[44px] py-1.5 px-3 text-left transition-colors ${
											isActive
												? "nx-bg-surface-low nx-text-primary-container"
												: "nx-text-on-surface-variant hover:nx-text-on-surface hover:nx-bg-surface-low"
										}`}
									>
										<span className="font-body text-[11px] truncate mr-2">{entry.value}</span>
										<span className="font-label text-[9px] nx-text-muted shrink-0">{entry.count}</span>
									</button>
								)
							})
						)}
					</div>
				</div>
			)}
		</div>
	)
}

/** Shared filter pill — used in sidebar and mobile sheet */
function FilterPill({ label, prefix, onClick }: { label: string; prefix?: string; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="inline-flex items-center gap-1 font-label text-[9px] min-h-[36px] px-2 py-1.5 uppercase tracking-wider nx-bg-surface-low border nx-border-subtle-30 nx-text-on-surface hover:nx-text-secondary-container transition-colors"
		>
			{prefix && <span className="nx-text-on-surface-variant">{prefix}:</span>}
			{label}
			<Icon name="xmark" className="text-[8px]" />
		</button>
	)
}

type Filters = Record<string, Set<string>>

type ViewMode = "large" | "small" | "list"
type SortOption = "common-to-rare" | "rare-to-common" | "id-asc" | "id-desc" | "resolved-first"

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
	{ value: "resolved-first", label: "Resolved First" },
	{ value: "common-to-rare", label: "Common to Rare" },
	{ value: "rare-to-common", label: "Rare to Common" },
	{ value: "id-asc", label: "ID Low to High" },
	{ value: "id-desc", label: "ID High to Low" },
]

/** Extract the numeric ID from "Echoes #123" */
function getEchoId(item: EchoMetadata): number {
	const match = item.name.match(/#(\d+)/)
	return match ? Number.parseInt(match[1], 10) : 0
}

function sortItems(items: EchoMetadata[], sort: SortOption, mintedIndices: Set<number> | null = null): EchoMetadata[] {
	const sorted = [...items]
	switch (sort) {
		case "resolved-first": {
			if (!mintedIndices) return sorted.sort((a, b) => getEchoId(a) - getEchoId(b))
			return sorted.sort((a, b) => {
				const aResolved = mintedIndices.has(getEchoId(a)) ? 0 : 1
				const bResolved = mintedIndices.has(getEchoId(b)) ? 0 : 1
				if (aResolved !== bResolved) return aResolved - bResolved
				return getEchoId(a) - getEchoId(b)
			})
		}
		case "common-to-rare":
			return sorted.sort((a, b) => getRarityRank(b) - getRarityRank(a))
		case "rare-to-common":
			return sorted.sort((a, b) => getRarityRank(a) - getRarityRank(b))
		case "id-asc":
			return sorted.sort((a, b) => getEchoId(a) - getEchoId(b))
		case "id-desc":
			return sorted.sort((a, b) => getEchoId(b) - getEchoId(a))
		default:
			return sorted
	}
}

// --- Collection Toolbar ---

function CollectionToolbar({
	viewMode,
	onViewModeChange,
	search,
	onSearchChange,
	sort,
	onSortChange,
	factionFilter,
	onFactionFilterChange,
	mobileFilterButton,
	baseDistributions,
}: {
	viewMode: ViewMode
	onViewModeChange: (mode: ViewMode) => void
	search: string
	onSearchChange: (v: string) => void
	sort: SortOption
	onSortChange: (s: SortOption) => void
	factionFilter: string | null
	onFactionFilterChange: (f: string | null) => void
	mobileFilterButton?: React.ReactNode
	baseDistributions: Record<string, TraitDist>
}) {
	const factionDist = baseDistributions["Faction"]
	const [sortOpen, setSortOpen] = useState(false)
	const [factionOpen, setFactionOpen] = useState(false)
	const sortRef = useRef<HTMLDivElement>(null)
	const factionRef = useRef<HTMLDivElement>(null)

	// Close dropdowns on outside click
	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
			if (factionRef.current && !factionRef.current.contains(e.target as Node)) setFactionOpen(false)
		}
		document.addEventListener("mousedown", handleClick)
		return () => document.removeEventListener("mousedown", handleClick)
	}, [])

	const viewModes: { mode: ViewMode; icon: string; label: string }[] = [
		{ mode: "large", icon: "grid-2", label: "Large grid" },
		{ mode: "small", icon: "grid-4", label: "Small grid" },
		{ mode: "list", icon: "list", label: "List view" },
	]

	return (
		<div className="flex items-center gap-2 md:gap-3 py-3">
			{/* Search — fills available width */}
			<div className="relative flex-1 min-w-0">
				<Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-sm nx-text-on-surface-variant pointer-events-none" />
				<input
					type="text"
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder="Search items"
					aria-label="Search collection"
					className="w-full h-10 pl-9 pr-9 font-body text-xs nx-bg-surface-low border nx-border-subtle-30 nx-text-on-surface placeholder:nx-text-muted focus:outline-none focus:border-[var(--nx-primary-container)] transition-colors"
				/>
				{search ? (
					<button
						type="button"
						onClick={() => onSearchChange("")}
						className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 nx-text-on-surface-variant hover:nx-text-on-surface transition-colors"
						aria-label="Clear search"
					>
						<Icon name="xmark" className="text-xs" />
					</button>
				) : null}
			</div>

			{/* Faction filter dropdown */}
			<div className="relative hidden sm:block shrink-0" ref={factionRef}>
				<button
					type="button"
					onClick={() => { setFactionOpen(!factionOpen); setSortOpen(false) }}
					aria-expanded={factionOpen}
					className={`flex items-center gap-2 h-10 px-3 border nx-border-subtle-30 font-label text-[10px] uppercase tracking-wider transition-colors ${
						factionFilter
							? "nx-text-primary-container nx-bg-surface-low"
							: "nx-text-on-surface-variant nx-bg-surface-low hover:nx-text-on-surface"
					}`}
				>
					<span className="truncate max-w-[100px]">{factionFilter ?? "Faction"}</span>
					<Icon name="chevron-down" className={`text-[10px] transition-transform ${factionOpen ? "rotate-180" : ""}`} />
				</button>
				{factionOpen && (
					<div className="absolute right-0 top-full mt-1 z-40 min-w-[160px] nx-bg-surface-container border nx-border-subtle-30 shadow-lg shadow-black/30">
						<button
							type="button"
							onClick={() => { onFactionFilterChange(null); setFactionOpen(false) }}
							className={`w-full flex items-center gap-2 px-3 py-2 text-left font-label text-[10px] uppercase tracking-wider transition-colors ${
								!factionFilter ? "nx-text-primary-container nx-bg-surface-low" : "nx-text-on-surface-variant hover:nx-text-on-surface hover:nx-bg-surface-low"
							}`}
						>
							All Factions
						</button>
						{factionDist?.map((f: TraitDist[number]) => (
							<button
								key={f.value}
								type="button"
								onClick={() => { onFactionFilterChange(f.value); setFactionOpen(false) }}
								className={`w-full flex items-center gap-2 px-3 py-2 text-left font-label text-[10px] uppercase tracking-wider transition-colors ${
									factionFilter === f.value ? "nx-text-primary-container nx-bg-surface-low" : "nx-text-on-surface-variant hover:nx-text-on-surface hover:nx-bg-surface-low"
								}`}
							>
								<span className="w-2 h-2 shrink-0" style={{ backgroundColor: FACTION_COLORS[f.value] }} />
								<span className="truncate">{f.value}</span>
								<span className="ml-auto nx-text-muted">{f.count}</span>
							</button>
						))}
					</div>
				)}
			</div>

			{/* Sort dropdown */}
			<div className="relative shrink-0" ref={sortRef}>
				<button
					type="button"
					onClick={() => { setSortOpen(!sortOpen); setFactionOpen(false) }}
					aria-expanded={sortOpen}
					className="flex items-center gap-2 h-10 px-3 nx-bg-surface-low border nx-border-subtle-30 nx-text-on-surface-variant hover:nx-text-on-surface font-label text-[10px] uppercase tracking-wider transition-colors"
				>
					<span className="truncate max-w-[140px]">{SORT_OPTIONS.find((o) => o.value === sort)?.label}</span>
					<Icon name="chevron-down" className={`text-[10px] transition-transform ${sortOpen ? "rotate-180" : ""}`} />
				</button>
				{sortOpen && (
					<div className="absolute right-0 top-full mt-1 z-40 min-w-[170px] nx-bg-surface-container border nx-border-subtle-30 shadow-lg shadow-black/30">
						{SORT_OPTIONS.map((opt) => (
							<button
								key={opt.value}
								type="button"
								onClick={() => { onSortChange(opt.value); setSortOpen(false) }}
								className={`w-full px-3 py-2 text-left font-label text-[10px] uppercase tracking-wider transition-colors ${
									sort === opt.value
										? "nx-text-primary-container nx-bg-surface-low"
										: "nx-text-on-surface-variant hover:nx-text-on-surface hover:nx-bg-surface-low"
								}`}
							>
								{opt.label}
							</button>
						))}
					</div>
				)}
			</div>

			{/* Mobile filter button */}
			{mobileFilterButton}

			{/* View mode toggles — rightmost, hidden on mobile */}
			<div className="hidden md:flex items-center nx-bg-surface-low border nx-border-subtle-30 overflow-hidden shrink-0">
				{viewModes.map((v) => (
					<button
						key={v.mode}
						type="button"
						onClick={() => onViewModeChange(v.mode)}
						className={`flex items-center justify-center w-10 h-10 transition-colors ${
							viewMode === v.mode
								? "nx-bg-surface-high nx-text-on-surface"
								: "nx-text-on-surface-variant hover:nx-text-on-surface hover:nx-bg-surface-container"
						}`}
						aria-label={v.label}
						aria-pressed={viewMode === v.mode}
					>
						<Icon name={v.icon} className="text-sm" />
					</button>
				))}
			</div>
		</div>
	)
}

// --- Gallery Grid ---

function GalleryGrid({ items, selectedId, onSelect, onClearFilters, hasFilters, viewMode, isPending, mintedIndices }: {
	items: EchoMetadata[]
	selectedId: string | null
	onSelect: (id: string | null) => void
	onClearFilters: () => void
	hasFilters: boolean
	viewMode: ViewMode
	isPending?: boolean
	mintedIndices: Set<number> | null
}) {
	const { visible, cardRef } = useGridReveal()
	const [displayCount, setDisplayCount] = useState(CHUNK_SIZE)
	const sentinelRef = useRef<HTMLDivElement>(null)
	const itemsRef = useRef(items)

	// Reset display count when items change (filter/sort)
	if (itemsRef.current !== items) {
		itemsRef.current = items
		setDisplayCount(CHUNK_SIZE)
	}

	// Infinite scroll — observe sentinel to load more chunks
	useEffect(() => {
		const sentinel = sentinelRef.current
		if (!sentinel) return
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					setDisplayCount((prev) => Math.min(prev + CHUNK_SIZE, itemsRef.current.length))
				}
			},
			{ rootMargin: "400px 0px" },
		)
		observer.observe(sentinel)
		return () => observer.disconnect()
	}, [])

	const displayedItems = items.slice(0, displayCount)
	const hasMore = displayCount < items.length

	if (items.length === 0) {
		return (
			<section className="py-20 text-center" aria-label="No results">
				<p className="font-headline text-xl sm:text-2xl uppercase nx-text-on-surface-variant">
					NO MATCHING IDENTITIES
				</p>
				<p className="font-label text-xs nx-text-muted mt-2 tracking-wider uppercase">
					{hasFilters ? "TRY REMOVING SOME FILTERS" : "NO ECHOES IN ARCHIVE"}
				</p>
				{hasFilters && (
					<button
						type="button"
						onClick={onClearFilters}
						className="mt-6 font-label text-[10px] px-4 py-2 uppercase tracking-wider border nx-border-subtle-30 nx-text-primary-container hover:nx-bg-surface-low transition-colors"
					>
						CLEAR ALL FILTERS
					</button>
				)}
			</section>
		)
	}

	const gridCols = viewMode === "small"
		? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
		: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"

	// Shared footer: sentinel + count indicator
	const gridFooter = (
		<>
			{/* Sentinel for infinite scroll */}
			<div ref={sentinelRef} className="h-1" aria-hidden="true" />
			{/* Count indicator */}
			{items.length > 0 && (
				<div className="flex items-center justify-center gap-3 py-6">
					<span className="font-label text-[10px] nx-text-on-surface-variant tracking-wider uppercase">
						{hasMore
							? `Showing ${displayedItems.length} of ${items.length}`
							: `${items.length} ${items.length === 1 ? "item" : "items"}`}
					</span>
					{hasMore && (
						<span className="inline-block w-3 h-3 border-2 border-[var(--nx-primary-container)] border-t-transparent rounded-full animate-spin" />
					)}
				</div>
			)}
		</>
	)

	// Loading overlay for transitions
	const loadingOverlay = isPending ? (
		<div className="absolute inset-0 z-20 bg-[rgba(var(--nx-surface-rgb),0.6)] flex items-start justify-center pt-20 pointer-events-none" aria-hidden="true">
			<div className="flex items-center gap-2">
				<span className="inline-block w-4 h-4 border-2 border-[var(--nx-primary-container)] border-t-transparent rounded-full animate-spin" />
				<span className="font-label text-[10px] nx-text-on-surface-variant tracking-wider uppercase">Filtering...</span>
			</div>
		</div>
	) : null

	if (viewMode === "list") {
		return (
			<section aria-label="Collection gallery" className="relative">
				{loadingOverlay}
				<div className="flex flex-col">
					{/* List header */}
					<div className="hidden md:grid grid-cols-[100px_1fr_8rem_10rem_6rem_5rem] gap-3 px-3 py-2 border-b nx-border-subtle-10 font-label text-[9px] uppercase tracking-wider nx-text-on-surface-variant">
						<span />
						<span>Echo</span>
						<span>Faction</span>
						<span>Role</span>
						<span>Rank</span>
						<span className="text-right">#</span>
					</div>
					{displayedItems.map((item) => {
						const echoId = getEchoId(item)
						const isRevealed = mintedIndices === null || mintedIndices.has(echoId)
						const faction = isRevealed ? getTrait(item, "Faction") : null
						const rank = isRevealed ? getTrait(item, "Rank") : null
						const role = isRevealed ? getTrait(item, "Role") : null
						const imagePaths = isRevealed ? getCachedImagePaths(item) : null
						const imgSrc = isRevealed && imagePaths ? imagePaths[0] : getEchoPlaceholder(echoId)
						const isSelected = selectedId === item.name
						const isDimmed = selectedId !== null && !isSelected

						return (
							<button
								key={item.name}
								ref={cardRef}
								data-echo-key={item.name}
								type="button"
								onClick={() => onSelect(isSelected ? null : item.name)}
								className={`echo-card group text-left border-b nx-border-subtle-10 transition-all duration-150 ${visible.has(item.name) ? "echo-visible" : ""} ${
									isSelected
										? "nx-bg-surface-low border-l-2 border-l-[var(--nx-primary-container)]"
										: "hover:nx-bg-surface-low"
								} ${isDimmed ? "opacity-35" : ""}`}
								aria-expanded={isSelected}
								aria-label={isRevealed ? `${item.name}, ${faction} ${rank}` : `Unresolved Echo #${echoId}`}
							>
								{/* Mobile list row */}
								<div className="md:hidden flex items-center gap-3 px-3 min-h-[100px]">
									<div className="w-[72px] h-[88px] shrink-0 overflow-hidden nx-bg-surface-highest" style={{ borderLeft: `3px solid ${isRevealed ? (FACTION_COLORS[faction!] ?? "transparent") : "var(--nx-outline)"}` }}>
										<img src={imgSrc} alt="" className={`w-full h-full object-cover ${!isRevealed ? "grayscale-[0.3] opacity-80" : ""}`} loading="lazy" width={72} height={88} />
									</div>
									<div className="flex-1 min-w-0">
										{isRevealed ? (
											<>
												<p className="font-headline text-sm uppercase truncate">{role}</p>
												<span className="font-label text-[9px] nx-text-on-surface-variant uppercase tracking-wider">{faction} · {item.name.replace("Echoes #", "#")}</span>
											</>
										) : (
											<>
												<p className="font-headline text-sm uppercase truncate nx-text-on-surface-variant">Unresolved</p>
												<span className="font-label text-[9px] nx-text-outline uppercase tracking-wider">Echo #{String(echoId).padStart(4, "0")}</span>
											</>
										)}
									</div>
									{isRevealed && rank ? (
										<RarityBadge rank={rank} rarityRank={getRarityRank(item)} size="sm" />
									) : (
										<span className="font-label text-[9px] nx-text-outline uppercase tracking-wider px-1.5 py-0.5 border nx-border-subtle-10">???</span>
									)}
								</div>
								{/* Desktop list row */}
								<div className="hidden md:grid grid-cols-[100px_1fr_8rem_10rem_6rem_5rem] gap-3 items-center px-3 min-h-[100px]">
									<div className="w-[80px] h-[88px] shrink-0 overflow-hidden nx-bg-surface-highest" style={{ borderLeft: `3px solid ${isRevealed ? (FACTION_COLORS[faction!] ?? "transparent") : "var(--nx-outline)"}` }}>
										<img src={imgSrc} alt="" className={`w-full h-full object-cover ${!isRevealed ? "grayscale-[0.3] opacity-80" : ""}`} loading="lazy" width={80} height={88} />
									</div>
									{isRevealed ? (
										<>
											<p className="font-headline text-sm uppercase truncate">{item.name}</p>
											<span className="font-label text-[10px] uppercase tracking-wider truncate" style={{ color: FACTION_COLORS[faction!] }}>{faction}</span>
											<span className="font-body text-sm truncate nx-text-on-surface-variant">{role}</span>
											<RarityBadge rank={rank!} rarityRank={getRarityRank(item)} size="sm" />
										</>
									) : (
										<>
											<p className="font-headline text-sm uppercase truncate nx-text-on-surface-variant">Unresolved #{String(echoId).padStart(4, "0")}</p>
											<span className="font-label text-[10px] uppercase tracking-wider truncate nx-text-outline">???</span>
											<span className="font-body text-sm truncate nx-text-outline">???</span>
											<span className="font-label text-[9px] nx-text-outline uppercase tracking-wider px-1.5 py-0.5 border nx-border-subtle-10">???</span>
										</>
									)}
									<span className="font-label text-[9px] nx-text-on-surface-variant text-right tracking-wider">
										{item.name.replace("Echoes #", "").padStart(4, "0")}
									</span>
								</div>
							</button>
						)
					})}
				</div>
				{gridFooter}
			</section>
		)
	}

	return (
		<section aria-label="Collection gallery" className="relative">
			{loadingOverlay}
			<div>
				<div className={`grid ${gridCols} gap-3 md:gap-4`}>
					{displayedItems.map((item) => {
						const echoId = getEchoId(item)
						const isRevealed = mintedIndices === null || mintedIndices.has(echoId)
						const faction = isRevealed ? getTrait(item, "Faction") : null
						const rank = isRevealed ? getTrait(item, "Rank") : null
						const role = isRevealed ? getTrait(item, "Role") : null
						const isSelected = selectedId === item.name
						const imagePaths = isRevealed ? getCachedImagePaths(item) : null
						const isDimmed = selectedId !== null && !isSelected

						// Seeded micro-transform per card — stable per echo ID, not array index
						const seed = echoId * 7 + item.name.length
						const hoverY = -3 - (seed % 4) * 1.5 // -3 to -7.5 px (always lift)

						return (
							<button
								key={item.name}
								ref={cardRef}
								data-echo-key={item.name}
								type="button"
								onClick={() => onSelect(isSelected ? null : item.name)}
								className={`echo-card group relative text-left aspect-[3/4] nx-bg-surface-highest overflow-visible border transition-all duration-200 ${visible.has(item.name) ? "echo-visible" : ""} ${
									isSelected
										? "border-[var(--nx-primary-container)] shadow-[0_0_20px_rgba(var(--nx-primary-container-rgb),0.15)] ring-1 ring-[var(--nx-primary-container)]"
										: "nx-border-subtle-10 hover:nx-border-subtle-30"
								} ${isDimmed ? "opacity-35" : ""}`}
								style={{ "--hover-transform": `translateY(${hoverY}px) scale(1.03)`, borderTopWidth: "3px", borderTopColor: isRevealed ? (FACTION_COLORS[faction!] ?? "transparent") : "var(--nx-outline)" } as React.CSSProperties}
								aria-expanded={isSelected}
								aria-label={isRevealed ? `${item.name}, ${faction} ${rank}` : `Unresolved Echo #${echoId}`}
							>
								{/* Image area — clipped so content doesn't overflow */}
								<div className="absolute inset-0 overflow-hidden">
									<img
										src={getEchoPlaceholder(echoId)}
										alt=""
										className={`absolute inset-0 w-full h-full object-cover ${!isRevealed ? "grayscale-[0.3] opacity-80" : ""}`}
										aria-hidden="true"
									/>
									{isRevealed && imagePaths && (
										<img
											src={imagePaths[0]}
											alt=""
											className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
											loading="lazy"
											width={viewMode === "small" ? 200 : 400}
											height={viewMode === "small" ? 267 : 533}
											onError={(e) => { e.currentTarget.hidden = true }}
										/>
									)}
								</div>

								{/* Bottom gradient */}
								<div className="absolute -inset-px bottom-0 top-[40%] bg-gradient-to-b from-transparent to-[rgba(var(--nx-surface-rgb),0.9)] pointer-events-none" />

								{/* Bottom info */}
								<div className={`absolute bottom-0 left-0 right-0 z-10 flex items-end justify-between gap-2 ${viewMode === "small" ? "p-2" : "p-3"}`}>
									{isRevealed ? (
										<>
											<div className="flex flex-col min-w-0">
												<span
													className={`font-label uppercase tracking-[0.08em] leading-none truncate mb-1 ${viewMode === "small" ? "text-[8px]" : "text-[9px]"}`}
													style={{ color: FACTION_COLORS[faction!] ?? "var(--nx-on-surface-variant)" }}
												>
													{faction}
												</span>
												<p className={`font-headline uppercase leading-none truncate ${viewMode === "small" ? "text-xs" : "text-sm"}`}>{role}</p>
												{viewMode !== "small" && (
													<span className="font-label text-[9px] nx-text-on-surface-variant/60 leading-none mt-2 tracking-wider">
														ECHOES // {item.name.replace("Echoes #", "").padStart(4, "0")}
													</span>
												)}
											</div>
											{viewMode !== "small" && (
												<RarityBadge rank={rank!} rarityRank={getRarityRank(item)} size="sm" />
											)}
										</>
									) : (
										<div className="flex flex-col min-w-0">
											<span className={`font-label uppercase tracking-[0.15em] leading-none truncate mb-1 nx-text-outline ${viewMode === "small" ? "text-[8px]" : "text-[9px]"}`}>
												UNRESOLVED
											</span>
											<p className={`font-headline uppercase leading-none truncate nx-text-on-surface-variant ${viewMode === "small" ? "text-xs" : "text-sm"}`}>
												Echo #{String(echoId).padStart(4, "0")}
											</p>
										</div>
									)}
								</div>
							</button>
						)
					})}
				</div>
			</div>
			{gridFooter}
		</section>
	)
}

// --- Detail Modal ---

function DetailModal({ item, onClose, onNext, onPrev, isRevealed }: {
	item: EchoMetadata
	onClose: () => void
	onNext: (() => void) | null
	onPrev: (() => void) | null
	isRevealed: boolean
}) {
	const faction = isRevealed ? getTrait(item, "Faction") : null
	const rank = isRevealed ? getTrait(item, "Rank") : null
	const imagePaths = isRevealed ? getCachedImagePaths(item) : null
	const echoId = getEchoId(item)
	const [activeVariant, setActiveVariant] = useState(0)
	const [isVisible, setIsVisible] = useState(false)
	const overlayRef = useOverlay()

	useEffect(() => {
		requestAnimationFrame(() => setIsVisible(true))
	}, [])

	useEffect(() => {
		setActiveVariant(0)
	}, [item.name])

	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") onClose()
			if (e.key === "ArrowRight" && onNext) onNext()
			if (e.key === "ArrowLeft" && onPrev) onPrev()
		}
		document.addEventListener("keydown", onKeyDown)
		return () => document.removeEventListener("keydown", onKeyDown)
	}, [onClose, onNext, onPrev])

	// Unrevealed placeholder
	const placeholderSrc = getEchoPlaceholder(echoId)

	return (
		<div ref={overlayRef} className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 md:p-6">
			{/* Backdrop */}
			<div
				className={`absolute inset-0 bg-[rgba(var(--nx-surface-rgb),0.8)] backdrop-blur-sm transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Modal */}
			<div
				className={`relative w-full max-w-6xl max-h-[82vh] nx-bg-surface-container border nx-border-subtle-30 overflow-hidden transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
					isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
				}`}
				role="dialog"
				aria-label={isRevealed ? item.name : `Unresolved Echo #${echoId}`}
			>
				{/* Two-column layout: large image left, details right */}
				<div className="flex flex-col md:flex-row max-h-[82vh]">
					{/* Left — large image with carousel (or placeholder for unrevealed) */}
					<div className="relative md:w-[58%] lg:w-[62%] shrink-0 nx-bg-surface-highest overflow-hidden group/carousel aspect-square">
						{isRevealed && imagePaths ? (
							<>
								<div
									className="flex h-full transition-transform duration-300 ease-out"
									style={{ transform: `translateX(-${activeVariant * 100}%)` }}
								>
									{imagePaths.map((path, i) => (
										<img
											key={path}
											src={path}
											alt={`${item.name} variant ${i + 1}`}
											className="w-full h-full object-cover shrink-0"
											draggable={false}
											onError={(e) => { e.currentTarget.src = placeholderSrc }}
										/>
									))}
								</div>

								{/* Carousel arrows */}
								{activeVariant > 0 && (
									<button
										type="button"
										onClick={() => setActiveVariant((prev) => prev - 1)}
										className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-[rgba(var(--nx-surface-rgb),0.7)] backdrop-blur nx-text-on-surface opacity-60 hover:opacity-100 focus:opacity-100 transition-opacity"
										aria-label="Previous variant"
									>
										<Icon name="chevron-left" className="text-xs" />
									</button>
								)}
								{activeVariant < imagePaths.length - 1 && (
									<button
										type="button"
										onClick={() => setActiveVariant((prev) => prev + 1)}
										className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-[rgba(var(--nx-surface-rgb),0.7)] backdrop-blur nx-text-on-surface opacity-60 hover:opacity-100 focus:opacity-100 transition-opacity"
										aria-label="Next variant"
									>
										<Icon name="chevron-right" className="text-xs" />
									</button>
								)}

								{/* Dot indicators */}
								{imagePaths.length > 1 && (
									<div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-0">
										{imagePaths.map((_, i) => (
											<button
												key={i}
												type="button"
												onClick={() => setActiveVariant(i)}
												className="flex items-center justify-center w-8 h-8"
												aria-label={`View variant ${i + 1}`}
											>
												<span className={`block w-2 h-2 rounded-full transition-colors ${
													i === activeVariant ? "nx-bg-on-surface" : "bg-[rgba(var(--nx-on-surface-rgb),0.6)]"
												}`} />
											</button>
										))}
									</div>
								)}

								{/* Faction color accent */}
								<div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: FACTION_COLORS[faction!] ?? "transparent" }} />
							</>
						) : (
							<>
								<img
									src={placeholderSrc}
									alt="Unresolved echo"
									className="w-full h-full object-cover grayscale-[0.3] opacity-80"
									draggable={false}
								/>
								<div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--nx-outline)]" />
							</>
						)}
					</div>

					{/* Right — details */}
					<div className="md:w-[45%] lg:w-[40%] overflow-y-auto px-6 py-6 md:pt-16">
						{isRevealed ? (
							<>
								<span className="font-label text-[10px] nx-text-on-surface-variant tracking-wider uppercase block mb-2">
									{item.name.replace("Echoes ", "ECHO_")}
								</span>
								<h3 className="font-headline text-2xl uppercase tracking-tight mb-4">{item.name}</h3>

								<div className="flex items-center gap-2 mb-8">
									<span
										className="font-label text-[10px] px-2.5 py-1 uppercase tracking-wider"
										style={{
											backgroundColor: `color-mix(in srgb, ${FACTION_COLORS[faction!] ?? "var(--nx-on-surface-variant)"} 15%, transparent)`,
											color: FACTION_COLORS[faction!] ?? "var(--nx-on-surface-variant)",
										}}
									>
										{faction}
									</span>
									<RarityBadge rank={rank!} rarityRank={getRarityRank(item)} size="md" />
								</div>

								{/* Trait list */}
								<div className="space-y-0">
									{item.attributes
										.filter((attr) => !HIDDEN_FILTER_TRAITS.has(attr.trait_type))
										.map((attr) => (
										<div key={attr.trait_type} className="flex items-baseline justify-between py-2.5 border-b nx-border-subtle-10 last:border-0">
											<span className="font-label text-[10px] nx-text-on-surface-variant uppercase tracking-wider">
												{attr.trait_type}
											</span>
											<span className="font-body text-sm nx-text-on-surface text-right">
												{attr.value}
											</span>
										</div>
									))}
								</div>
							</>
						) : (
							<>
								<span className="font-label text-[10px] nx-text-outline tracking-[0.2em] uppercase block mb-2">
									ECHO_{String(echoId).padStart(4, "0")}
								</span>
								<h3 className="font-headline text-2xl uppercase tracking-tight mb-4 nx-text-on-surface-variant">
									Unresolved
								</h3>

								<div className="flex items-center gap-2 mb-8">
									<span className="font-label text-[10px] px-2.5 py-1 uppercase tracking-[0.15em] border nx-border-subtle-10 nx-text-outline">
										Identity Pending
									</span>
								</div>

								<p className="font-body text-sm nx-text-on-surface-variant leading-relaxed mb-8">
									This echo has not yet been recovered from the DSPRS event. Its identity, faction, and attributes remain unresolved until minted.
								</p>

								{/* Redacted trait list */}
								<div className="space-y-0">
									{["Faction", "Role", "Rank", "Frame", "Substrate", "Signal"].map((traitType) => (
										<div key={traitType} className="flex items-baseline justify-between py-2.5 border-b nx-border-subtle-10 last:border-0">
											<span className="font-label text-[10px] nx-text-outline uppercase tracking-wider">
												{traitType}
											</span>
											<span className="font-body text-sm nx-text-outline text-right tracking-wider">
												???
											</span>
										</div>
									))}
								</div>
							</>
						)}
					</div>
				</div>
			</div>

			{/* Controls bar — below the modal */}
			<div
				className={`relative z-10 flex items-center justify-center gap-4 mt-4 transition-all duration-300 ${
					isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
				}`}
			>
				{onPrev ? (
					<button type="button" onClick={onPrev} className="flex items-center justify-center w-11 h-11 nx-bg-surface-high border nx-border-subtle-30 nx-text-on-surface-variant hover:nx-text-on-surface transition-colors" aria-label="Previous echo (← arrow key)">
						<Icon name="chevron-left" className="text-sm" />
					</button>
				) : (
					<div className="w-11 h-11" aria-hidden="true" />
				)}

				<button
					type="button"
					onClick={onClose}
					className="flex items-center gap-2 px-5 h-10 nx-bg-surface-high border nx-border-subtle-30 nx-text-on-surface-variant hover:nx-text-on-surface transition-colors font-label text-[10px] uppercase tracking-wider"
					aria-label="Close (Esc)"
				>
					<Icon name="xmark" className="text-xs" />
					<span>Close</span>
					<span className="nx-text-outline ml-1">Esc</span>
				</button>

				{onNext ? (
					<button type="button" onClick={onNext} className="flex items-center justify-center w-11 h-11 nx-bg-surface-high border nx-border-subtle-30 nx-text-on-surface-variant hover:nx-text-on-surface transition-colors" aria-label="Next echo (→ arrow key)">
						<Icon name="chevron-right" className="text-sm" />
					</button>
				) : (
					<div className="w-11 h-11" aria-hidden="true" />
				)}
			</div>
		</div>
	)
}

// --- Mobile Filter Sheet ---

function MobileFilterSheet({
	filters,
	onFilterToggle,
	onClearAll,
	resultCount,
	onClose,
	dynamicDistributions,
	baseDistributions,
}: {
	filters: Filters
	onFilterToggle: (trait: string, value: string) => void
	onClearAll: () => void
	resultCount: number
	onClose: () => void
	dynamicDistributions: Record<string, TraitDist>
	baseDistributions: Record<string, TraitDist>
}) {
	const [isVisible, setIsVisible] = useState(false)
	const activeCount = Object.values(filters).reduce((sum, s) => sum + s.size, 0)
	const overlayRef = useOverlay()

	useEffect(() => {
		requestAnimationFrame(() => setIsVisible(true))
	}, [])

	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") onClose()
		}
		document.addEventListener("keydown", onKeyDown)
		return () => document.removeEventListener("keydown", onKeyDown)
	}, [onClose])

	return (
		<div ref={overlayRef} className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
			{/* Backdrop */}
			<div
				className={`absolute inset-0 bg-[rgba(var(--nx-surface-rgb),0.7)] transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Sheet */}
			<div
				className={`relative nx-bg-surface-container border-t nx-border-subtle-30 overflow-y-auto max-h-[85vh] transition-transform duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
					isVisible ? "translate-y-0" : "translate-y-full"
				}`}
				role="dialog"
				aria-label="Filters and statistics"
			>
				{/* Handle + header */}
				<div className="sticky top-0 z-10 nx-bg-surface-container border-b nx-border-subtle-10 px-5 pt-3 pb-3">
					<div className="w-10 h-1 nx-bg-surface-high mx-auto mb-3 rounded-full" aria-hidden="true" />
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<h2 className="font-headline text-sm uppercase tracking-tight">Filters</h2>
							<span className="font-label text-[10px] nx-text-on-surface-variant tracking-wider">
								{resultCount} results
							</span>
						</div>
						<div className="flex items-center gap-2">
							{activeCount > 0 && (
								<button
									type="button"
									onClick={onClearAll}
									className="font-label text-[10px] nx-text-secondary-container uppercase tracking-wider px-3 py-2"
								>
									CLEAR ({activeCount})
								</button>
							)}
							<button
								type="button"
								onClick={onClose}
								className="flex items-center justify-center w-10 h-10 nx-text-on-surface-variant hover:nx-text-on-surface transition-colors"
								aria-label="Close filters"
							>
								<Icon name="xmark" className="text-base" />
							</button>
						</div>
					</div>
				</div>

				{/* Filter list */}
				<div className="px-5 py-4 space-y-1">
					{FILTERABLE_TRAITS.map((trait) => (
						<SidebarFilter
							key={trait}
							trait={trait}
							selected={filters[trait] ?? new Set()}
							onToggle={(val) => onFilterToggle(trait, val)}
							dist={dynamicDistributions[trait] ?? baseDistributions[trait]}
						/>
					))}
				</div>

				{/* Active pills */}
				{activeCount > 0 && (
					<div className="px-5 pb-4 flex flex-wrap gap-1.5">
						{Object.entries(filters).flatMap(([trait, values]) =>
							[...values].map((val) => (
								<FilterPill key={`${trait}-${val}`} label={val} prefix={trait} onClick={() => onFilterToggle(trait, val)} />
							)),
						)}
					</div>
				)}

				{/* Bottom safe area padding */}
				<div className="h-6" />
			</div>
		</div>
	)
}

// --- Main Component ---

export function EchoesCollection() {
	// Display value for the search input (immediate)
	const [searchInput, setSearchInput] = useState("")
	// Debounced search value used for filtering
	const [search, setSearch] = useState("")
	const [filters, setFilters] = useState<Filters>({})
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const [viewMode, setViewMode] = useState<ViewMode>("large")
	const [sort, setSort] = useState<SortOption>("resolved-first")
	const [factionFilter, setFactionFilter] = useState<string | null>(null)
	const [isPending, startTransition] = useTransition()
	const searchTimer = useRef<ReturnType<typeof setTimeout>>(null)

	// Fetch which items have been minted (revealed)
	const { data: mintedData } = useEchoesMintedItems()
	const mintedIndices = useMemo(() => {
		if (!mintedData) return null
		return new Set(mintedData.mintedIndices)
	}, [mintedData])

	// Redacted metadata — unrevealed items have traits stripped so sort/filter can't leak
	const metadata = useMemo(() => redactMetadata(ECHOES_METADATA, mintedIndices), [mintedIndices])
	const searchableText = useMemo(() => buildSearchableText(metadata), [metadata])
	const allDistributions = useMemo<Record<string, TraitDist>>(() =>
		Object.fromEntries(TRAIT_TYPES.map((t) => [t, computeTraitDistribution(t, metadata)])),
	[metadata])

	// Debounced search — input stays responsive, filtering is deferred
	const handleSearchChange = useCallback((value: string) => {
		setSearchInput(value)
		if (searchTimer.current) clearTimeout(searchTimer.current)
		searchTimer.current = setTimeout(() => {
			startTransition(() => setSearch(value))
		}, 200)
	}, [])

	const handleFilterToggle = (trait: string, value: string) => {
		startTransition(() => {
			setFilters((prev) => {
				const next = { ...prev }
				const set = new Set(prev[trait] ?? [])
				if (set.has(value)) {
					set.delete(value)
				} else {
					set.add(value)
				}
				if (set.size === 0) {
					delete next[trait]
				} else {
					next[trait] = set
				}
				return next
			})
		})
	}

	const handleClearAll = () => {
		startTransition(() => {
			setFilters({})
			setFactionFilter(null)
		})
		setSearchInput("")
		setSearch("")
	}

	const handleSortChange = useCallback((s: SortOption) => {
		startTransition(() => setSort(s))
	}, [])

	const handleFactionFilterChange = useCallback((f: string | null) => {
		startTransition(() => setFactionFilter(f))
	}, [])

	const filtered = useMemo(() => {
		const q = search.toLowerCase().trim()
		const hasActiveFilters = factionFilter !== null || Object.values(filters).some((s) => s.size > 0)
		const items = metadata.filter((item) => {
			const echoId = getEchoId(item)
			const isRevealed = mintedIndices === null || mintedIndices.has(echoId)

			// Unrevealed items: only match "unresolved" search, skip trait filters
			if (!isRevealed) {
				if (q && !`unresolved echo #${echoId} echo_${String(echoId).padStart(4, "0")}`.includes(q)) return false
				if (hasActiveFilters) return false
				return true
			}

			if (q) {
				const text = searchableText.get(item) ?? ""
				if (!text.includes(q)) return false
			}
			if (factionFilter && getTrait(item, "Faction") !== factionFilter) return false
			for (const [trait, values] of Object.entries(filters)) {
				if (values.size === 0) continue
				if (!values.has(getTrait(item, trait))) return false
			}
			return true
		})
		return sortItems(items, sort, mintedIndices)
	}, [search, filters, factionFilter, sort, mintedIndices, metadata, searchableText])

	// Dynamic distributions — single pass over items for all traits simultaneously
	const dynamicDistributions = useMemo(() => {
		const q = search.toLowerCase().trim()
		const activeFilterEntries = Object.entries(filters).filter(([, values]) => values.size > 0)

		// For each trait, we accumulate counts: trait → value → count
		const counts: Record<string, Record<string, number>> = {}
		for (const trait of FILTERABLE_TRAITS) {
			counts[trait] = {}
		}

		for (const item of metadata) {
			// Skip unrevealed items from distributions
			const echoId = getEchoId(item)
			if (mintedIndices !== null && !mintedIndices.has(echoId)) continue

			// Pre-check search filter (shared across all traits)
			if (q) {
				const text = searchableText.get(item) ?? ""
				if (!text.includes(q)) continue
			}

			// For each filterable trait, check if the item passes all OTHER filters
			// Build a bitmask of which active filters this item passes
			const filterResults: boolean[] = activeFilterEntries.map(([t, values]) =>
				values.has(getTrait(item, t)),
			)

			// Check faction filter result (shared)
			const passesFaction = !factionFilter || getTrait(item, "Faction") === factionFilter

			for (const trait of FILTERABLE_TRAITS) {
				// Must pass all filters EXCEPT this trait's own + faction if computing Faction
				let passes = trait === "Faction" || passesFaction
				if (passes) {
					for (let i = 0; i < activeFilterEntries.length; i++) {
						if (activeFilterEntries[i][0] === trait) continue
						if (!filterResults[i]) { passes = false; break }
					}
				}
				if (passes) {
					const val = getTrait(item, trait)
					counts[trait][val] = (counts[trait][val] || 0) + 1
				}
			}
		}

		// Convert counts to sorted TraitDist arrays
		const result: Record<string, TraitDist> = {}
		for (const trait of FILTERABLE_TRAITS) {
			const traitCounts = counts[trait]
			const total = Object.values(traitCounts).reduce((s, c) => s + c, 0) || 1
			result[trait] = Object.entries(traitCounts)
				.sort((a, b) => b[1] - a[1])
				.map(([value, count]) => ({ value, count, pct: Math.round((count / total) * 100) }))
		}
		return result
	}, [search, filters, factionFilter, mintedIndices, metadata, searchableText])

	// Drawer navigation
	const selectedItem = selectedId ? filtered.find((i) => i.name === selectedId) ?? null : null
	const selectedIndex = selectedItem ? filtered.indexOf(selectedItem) : -1
	const handleNext = selectedIndex >= 0 && selectedIndex < filtered.length - 1
		? () => setSelectedId(filtered[selectedIndex + 1].name)
		: null
	const handlePrev = selectedIndex > 0
		? () => setSelectedId(filtered[selectedIndex - 1].name)
		: null

	const activeCount = Object.values(filters).reduce((sum, s) => sum + s.size, 0)
	const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

	return (
		<div className="pt-14 md:pt-16">
			{/* Toolbar — sticky on all sizes, spans full width above sidebar+grid */}
			<div className="sticky top-14 md:top-16 z-40 backdrop-blur-sm border-b nx-border-subtle-10 bg-[rgba(var(--nx-surface-rgb),0.95)]">
				<div className="max-w-[1920px] mx-auto px-4 md:px-6">
					<CollectionToolbar
						viewMode={viewMode}
						onViewModeChange={setViewMode}
						search={searchInput}
						onSearchChange={handleSearchChange}
						sort={sort}
						onSortChange={handleSortChange}
						factionFilter={factionFilter}
						onFactionFilterChange={handleFactionFilterChange}
						baseDistributions={allDistributions}
						mobileFilterButton={
							<button
								type="button"
								onClick={() => setMobileFiltersOpen(true)}
								className="lg:hidden relative flex items-center justify-center w-10 h-10 shrink-0 border nx-border-subtle-30 nx-bg-surface-low nx-text-on-surface-variant hover:nx-text-on-surface transition-colors"
								aria-label="Open filters"
							>
								<Icon name="filter" className="text-sm" />
								{activeCount > 0 && (
									<span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center nx-bg-primary-container nx-text-on-primary-fixed text-[9px] font-bold">
										{activeCount}
									</span>
								)}
							</button>
						}
					/>
				</div>
			</div>

			{/* Mobile filter sheet */}
			{mobileFiltersOpen && (
				<MobileFilterSheet
					filters={filters}
					onFilterToggle={handleFilterToggle}
					onClearAll={handleClearAll}
					resultCount={filtered.length}
					onClose={() => setMobileFiltersOpen(false)}
					dynamicDistributions={dynamicDistributions}
					baseDistributions={allDistributions}
				/>
			)}

			<div className="max-w-[1920px] mx-auto px-4 md:px-6 pb-6 md:pb-10">
				<div className="flex gap-8 lg:gap-10">
					{/* Sidebar — hidden on mobile, shown on lg+ */}
					<div className="hidden lg:block w-60 xl:w-72 shrink-0 sticky top-[8.5rem] self-start max-h-[calc(100vh-9rem)] overflow-y-auto pt-4 md:pt-6 lg:pt-8 pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
						<Sidebar
							filters={filters}
							onFilterToggle={handleFilterToggle}
							onClearAll={handleClearAll}
							resultCount={filtered.length}
							dynamicDistributions={dynamicDistributions}
							resolvedCount={mintedIndices ? mintedIndices.size : null}
							baseDistributions={allDistributions}
						/>
					</div>
					{/* Main gallery */}
					<div className="flex-1 min-w-0 pt-4 md:pt-6 lg:pt-8">
						<GalleryGrid items={filtered} selectedId={selectedId} onSelect={setSelectedId} onClearFilters={handleClearAll} hasFilters={activeCount > 0 || search.length > 0 || factionFilter !== null} viewMode={viewMode} isPending={isPending} mintedIndices={mintedIndices} />
					</div>
				</div>
			</div>

			{/* Detail drawer */}
			{selectedItem && (
				<DetailModal
					item={selectedItem}
					onClose={() => setSelectedId(null)}
					onNext={handleNext}
					onPrev={handlePrev}
					isRevealed={mintedIndices === null || mintedIndices.has(getEchoId(selectedItem))}
				/>
			)}
		</div>
	)
}
