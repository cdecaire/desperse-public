import { useCallback, useEffect, useRef } from 'react'

interface UseDoubleTapOptions {
	onSingleTap?: () => void
	onDoubleTap?: () => void
	/** Max ms between taps to count as double. Default: 250 */
	delay?: number
}

/**
 * Distinguishes single tap/click from double tap/click.
 * Returns a unified click handler for both mouse and touch.
 */
export function useDoubleTap({
	onSingleTap,
	onDoubleTap,
	delay = 250,
}: UseDoubleTapOptions) {
	const lastTapRef = useRef(0)
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	// Clean up pending timer on unmount to prevent stale navigation
	useEffect(() => {
		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current)
			}
		}
	}, [])

	const handleClick = useCallback(() => {
		const now = Date.now()
		const elapsed = now - lastTapRef.current
		lastTapRef.current = now

		if (elapsed < delay && elapsed > 0) {
			// Double tap — cancel pending single tap
			if (timerRef.current) {
				clearTimeout(timerRef.current)
				timerRef.current = null
			}
			onDoubleTap?.()
		} else {
			// Potential single tap — wait to see if another comes
			timerRef.current = setTimeout(() => {
				timerRef.current = null
				onSingleTap?.()
			}, delay)
		}
	}, [onSingleTap, onDoubleTap, delay])

	return handleClick
}
