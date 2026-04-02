import { useEffect } from "react"

/**
 * Global corruption/glitch effect for the Echoes site.
 *
 * Randomly picks DOM elements and applies a brief glitch burst class.
 * Timing, targets, and intensity are randomized on every cycle so the
 * pattern is never recognizable across page loads or repeated visits.
 *
 * Performance:
 * - Single setInterval, no layout reads
 * - CSS class toggle only (classList.add/remove)
 * - All visual work is GPU-composited (clip-path + transform)
 * - Respects prefers-reduced-motion
 */

/** CSS class applied during a glitch burst */
const BURST_CLASS = "nx-corrupt"

/** Selectors to pick targets from — broad enough to hit varied elements */
const TARGET_SELECTORS = [
	// Headings
	"h1",
	"h2",
	"h3",
	// Images and cards
	".echoes-hero-img",
	"img[loading]",
	// Section containers
	"section",
	"header",
	// Interactive elements
	"a[class*='nx-bg']",
	"button[class*='nx-bg']",
	// Labels and badges
	".font-label",
	".font-headline",
	// Specific UI
	"[data-reveal-stagger]",
	"p",
]

/** Random int between min (inclusive) and max (inclusive) */
function randInt(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min
}

/** Pick N random unique items from an array */
function pickRandom<T>(arr: T[], count: number): T[] {
	const shuffled = [...arr].sort(() => Math.random() - 0.5)
	return shuffled.slice(0, count)
}

/**
 * Check if element is at least partially in the viewport.
 * Uses getBoundingClientRect which forces a layout read — acceptable here
 * because glitch chains fire only every 5-12 seconds with a small candidate set.
 */
function isInViewport(el: Element): boolean {
	const rect = el.getBoundingClientRect()
	return (
		rect.bottom > 0 &&
		rect.top < window.innerHeight &&
		rect.right > 0 &&
		rect.left < window.innerWidth &&
		rect.height > 10
	)
}

/** Single glitch chain — picks visible targets and applies burst */
function createGlitchChain(containerSelector: string): () => void {
	let timeoutId: ReturnType<typeof setTimeout>
	/** Track all inner (stagger/duration) timeout IDs for proper cleanup */
	const innerTimeouts: ReturnType<typeof setTimeout>[] = []
	let stopped = false

	function fire() {
		if (stopped) return

		const container = document.querySelector(containerSelector)
		if (!container) {
			timeoutId = setTimeout(fire, 2000)
			return
		}

		// Pick random selectors this cycle
		const selectors = pickRandom(TARGET_SELECTORS, randInt(2, 5))
		const candidates: Element[] = []

		for (const sel of selectors) {
			container.querySelectorAll(sel).forEach((el) => {
				if (
					!el.classList.contains(BURST_CLASS) &&
					isInViewport(el)
				) {
					// Collection grid cards — include but at reduced odds (1 in 4)
					if (el.closest("[aria-label='Collection gallery']") && Math.random() > 0.25) return
					candidates.push(el)
				}
			})
		}

		if (candidates.length > 0) {
			const targets = pickRandom(candidates, randInt(1, 3))

			targets.forEach((el, i) => {
				const staggerDelay = i * randInt(30, 120)
				const staggerId = setTimeout(() => {
					if (stopped) return
					el.classList.add(BURST_CLASS)
					const duration = randInt(120, 350)
					const durationId = setTimeout(() => el.classList.remove(BURST_CLASS), duration)
					innerTimeouts.push(durationId)
				}, staggerDelay)
				innerTimeouts.push(staggerId)
			})
		}

		// Schedule next burst: 5–12s
		timeoutId = setTimeout(fire, randInt(5000, 12000))
	}

	// Initial random delay so chains don't sync
	timeoutId = setTimeout(fire, randInt(1500, 5000))

	return () => {
		stopped = true
		clearTimeout(timeoutId)
		for (const id of innerTimeouts) clearTimeout(id)
		innerTimeouts.length = 0
	}
}

/** Number of independent glitch chains running concurrently */
const CHAIN_COUNT = 3

/**
 * Hover-triggered corruption — when the user hovers an element,
 * there's a random chance a nearby sibling or the element itself glitches.
 * Throttled so it doesn't fire on every mouseover.
 */
function createHoverCorruption(containerSelector: string): () => void {
	let lastFire = 0
	const THROTTLE = 3000 // min ms between hover glitches

	function onMouseOver(e: MouseEvent) {
		const now = Date.now()
		if (now - lastFire < THROTTLE) return

		// 20% chance to trigger on any hover
		if (Math.random() > 0.2) return

		const target = e.target as HTMLElement
		if (!target?.closest?.(containerSelector)) return
		// Don't glitch tiny or non-visible elements
		if (target.offsetHeight < 10) return
		// Skip collection grid — hover transforms handle that area
		if (target.closest("[aria-label='Collection gallery']")) return

		lastFire = now

		// Glitch the hovered element itself
		target.classList.add(BURST_CLASS)
		const duration = randInt(100, 250)
		setTimeout(() => target.classList.remove(BURST_CLASS), duration)

		// 40% chance to also glitch a nearby sibling
		if (Math.random() < 0.4) {
			const siblings = target.parentElement?.children
			if (siblings && siblings.length > 1) {
				const sibling = siblings[randInt(0, siblings.length - 1)] as HTMLElement
				if (sibling !== target && sibling.offsetHeight > 10) {
					setTimeout(() => {
						sibling.classList.add(BURST_CLASS)
						setTimeout(() => sibling.classList.remove(BURST_CLASS), randInt(80, 200))
					}, randInt(50, 150))
				}
			}
		}
	}

	document.addEventListener("mouseover", onMouseOver, { passive: true })
	return () => document.removeEventListener("mouseover", onMouseOver)
}

export function useCorruptionEffect(containerSelector = ".echoes") {
	useEffect(() => {
		if (typeof window === "undefined") return

		const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
		if (motionQuery.matches) return

		// Launch multiple independent chains + hover corruption
		let cleanups = [
			...Array.from({ length: CHAIN_COUNT }, () =>
				createGlitchChain(containerSelector),
			),
			createHoverCorruption(containerSelector),
		]

		// If user enables reduced-motion at runtime, tear down all chains
		function onMotionChange(e: MediaQueryListEvent) {
			if (e.matches) {
				cleanups.forEach((fn) => fn())
				cleanups = []
			}
		}
		motionQuery.addEventListener("change", onMotionChange)

		return () => {
			cleanups.forEach((fn) => fn())
			motionQuery.removeEventListener("change", onMotionChange)
		}
	}, [containerSelector])
}
