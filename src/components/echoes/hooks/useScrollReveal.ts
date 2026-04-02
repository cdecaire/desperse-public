import { useEffect, useRef } from "react"

type ScrollRevealOptions = {
	/** IntersectionObserver threshold (0-1). Default: 0.15 */
	threshold?: number
	/** Root margin for earlier/later trigger. Default: "0px 0px -60px 0px" */
	rootMargin?: string
}

/**
 * Sets `data-revealed="true"` on the element when it enters the viewport (once).
 * All animation behavior is in CSS — this hook only flips the attribute.
 * Respects prefers-reduced-motion by revealing immediately.
 */
export function useScrollReveal<T extends HTMLElement>(
	options?: ScrollRevealOptions,
) {
	const ref = useRef<T>(null)

	useEffect(() => {
		const el = ref.current
		if (!el) return

		// Reduced motion: reveal immediately, no animation
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			el.dataset.revealed = "true"
			return
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					el.dataset.revealed = "true"
					observer.disconnect()
				}
			},
			{
				threshold: options?.threshold ?? 0.15,
				rootMargin: options?.rootMargin ?? "0px 0px -60px 0px",
			},
		)

		observer.observe(el)
		return () => observer.disconnect()
		// Deps use the primitive values from options (not the options object itself)
		// so callers can pass inline `{ threshold, rootMargin }` without causing
		// the observer to recreate on every render.
	}, [options?.threshold, options?.rootMargin])

	return ref
}

/**
 * Continuously tracks scroll progress through an element, setting
 * `--reveal-progress` CSS custom property (0 to 1) for scroll-linked effects.
 * Used for image grow effects.
 */
export function useScrollProgress<T extends HTMLElement>() {
	const ref = useRef<T>(null)

	useEffect(() => {
		const el = ref.current
		if (!el) return

		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			el.style.setProperty("--reveal-progress", "1")
			el.dataset.revealed = "true"
			return
		}

		const thresholds = Array.from({ length: 21 }, (_, i) => i * 0.05)

		const observer = new IntersectionObserver(
			([entry]) => {
				const ratio = Math.round(entry.intersectionRatio * 100) / 100
				el.style.setProperty("--reveal-progress", String(ratio))
				if (ratio > 0.1) {
					el.dataset.revealed = "true"
				}
			},
			{ threshold: thresholds },
		)

		observer.observe(el)
		return () => observer.disconnect()
	}, [])

	return ref
}
