/**
 * Countdown formatting utilities for timed editions.
 * Used by PostCard and post detail page for mint window display.
 */

export type MintWindowDisplayStatus =
	| { phase: "none" }
	| { phase: "scheduled"; label: string; startsAt: Date }
	| { phase: "active"; label: string; endsAt: Date }
	| { phase: "ending_soon"; label: string; endsAt: Date }
	| { phase: "ended"; label: string; endedAt: Date }

/** Threshold in milliseconds: ending-soon kicks in at 1 hour */
const ENDING_SOON_MS = 60 * 60 * 1000

/**
 * Compute mint-window display status from start/end timestamps.
 * Works on both Date objects and ISO strings (as returned by JSON APIs).
 */
export function getMintWindowDisplayStatus(
	mintWindowStart: Date | string | null | undefined,
	mintWindowEnd: Date | string | null | undefined,
): MintWindowDisplayStatus {
	if (!mintWindowStart || !mintWindowEnd) {
		return { phase: "none" }
	}

	const start =
		mintWindowStart instanceof Date
			? mintWindowStart
			: new Date(mintWindowStart)
	const end =
		mintWindowEnd instanceof Date ? mintWindowEnd : new Date(mintWindowEnd)

	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
		return { phase: "none" }
	}

	const now = new Date()

	if (now < start) {
		return {
			phase: "scheduled",
			label: `Starts in ${formatDuration(start.getTime() - now.getTime())}`,
			startsAt: start,
		}
	}

	if (now < end) {
		const remaining = end.getTime() - now.getTime()
		if (remaining <= ENDING_SOON_MS) {
			return {
				phase: "ending_soon",
				label: `${formatDuration(remaining)} left`,
				endsAt: end,
			}
		}
		return {
			phase: "active",
			label: `Ends in ${formatDuration(remaining)}`,
			endsAt: end,
		}
	}

	return {
		phase: "ended",
		label: "Ended",
		endedAt: end,
	}
}

/**
 * Format a millisecond duration into a compact human string.
 * Examples: "2d 3h", "23h", "45m", "30s"
 */
export function formatDuration(ms: number): string {
	if (ms <= 0) return "0s"

	const seconds = Math.floor(ms / 1000)
	const minutes = Math.floor(seconds / 60)
	const hours = Math.floor(minutes / 60)
	const days = Math.floor(hours / 24)

	if (days > 0) {
		const remainingHours = hours % 24
		return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
	}
	if (hours > 0) {
		const remainingMinutes = minutes % 60
		return remainingMinutes > 0
			? `${hours}h ${remainingMinutes}m`
			: `${hours}h`
	}
	if (minutes > 0) {
		return `${minutes}m`
	}
	return `${seconds}s`
}
