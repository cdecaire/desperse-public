import { useEffect, useState } from "react"

function calculateTimeLeft(target: Date) {
	const diff = Math.max(0, target.getTime() - Date.now())
	return {
		total: diff,
		days: Math.floor(diff / (1000 * 60 * 60 * 24)),
		hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
		minutes: Math.floor((diff / (1000 * 60)) % 60),
		seconds: Math.floor((diff / 1000) % 60),
	}
}

export function useCountdown(targetDate: Date) {
	const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetDate))

	useEffect(() => {
		// If already past, set zeros immediately and skip the interval
		const initial = calculateTimeLeft(targetDate)
		if (initial.total <= 0) {
			setTimeLeft({ total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 })
			return
		}

		const timer = setInterval(() => {
			const next = calculateTimeLeft(targetDate)
			setTimeLeft(next)
			if (next.total <= 0) clearInterval(timer)
		}, 1000)
		return () => clearInterval(timer)
	}, [targetDate])

	return timeLeft
}

export function pad(n: number) {
	return String(n).padStart(2, "0")
}

/** Shared mint target date */
export const MINT_TARGET = new Date("2026-05-01T00:00:00Z")
