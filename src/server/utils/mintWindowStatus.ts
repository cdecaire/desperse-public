/**
 * Mint window status helpers for timed editions.
 *
 * - getMintWindowStatus:  derive the current phase from DB timestamps
 * - validateMintWindow:   validate + compute DB-ready timestamps from user input
 */

// ---------------------------------------------------------------------------
// Status helper
// ---------------------------------------------------------------------------

export type MintWindowStatus =
	| { status: "no_window" }
	| { status: "not_started"; startsAt: Date }
	| { status: "active"; endsAt: Date }
	| { status: "ended"; endedAt: Date }

export function getMintWindowStatus(post: {
	mintWindowStart: Date | null
	mintWindowEnd: Date | null
}): MintWindowStatus {
	const { mintWindowStart, mintWindowEnd } = post

	if (mintWindowStart === null || mintWindowEnd === null) {
		return { status: "no_window" }
	}

	const now = new Date()

	if (now < mintWindowStart) {
		return { status: "not_started", startsAt: mintWindowStart }
	}

	if (now < mintWindowEnd) {
		return { status: "active", endsAt: mintWindowEnd }
	}

	return { status: "ended", endedAt: mintWindowEnd }
}

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

export interface MintWindowInput {
	mintWindowEnabled?: boolean
	mintWindowStartMode?: "now" | "scheduled"
	mintWindowStartTime?: string | Date | null
	mintWindowDurationHours?: number | null
}

export interface MintWindowValidationResult {
	valid: boolean
	error?: string
	/** Computed value ready for DB insertion */
	mintWindowStart?: Date | null
	/** Computed value ready for DB insertion */
	mintWindowEnd?: Date | null
}

const MILLIS_PER_HOUR = 3_600_000

export function validateMintWindow(
	input: MintWindowInput,
	mode: "create" | "update",
): MintWindowValidationResult {
	if (!input.mintWindowEnabled) {
		return { valid: true, mintWindowStart: null, mintWindowEnd: null }
	}

	if (mode === "create") {
		return validateCreate(input)
	}

	return validateUpdate(input)
}

// ---------------------------------------------------------------------------
// Internal: create-mode validation
// ---------------------------------------------------------------------------

function validateCreate(input: MintWindowInput): MintWindowValidationResult {
	const { mintWindowStartMode, mintWindowDurationHours } = input

	if (mintWindowStartMode === "now") {
		if (
			mintWindowDurationHours === undefined ||
			mintWindowDurationHours === null ||
			mintWindowDurationHours <= 0
		) {
			return { valid: false, error: "Duration must be greater than 0 hours" }
		}
		if (mintWindowDurationHours < 1) {
			return { valid: false, error: "Minimum duration is 1 hour" }
		}

		const start = new Date()
		const end = new Date(start.getTime() + mintWindowDurationHours * MILLIS_PER_HOUR)
		return { valid: true, mintWindowStart: start, mintWindowEnd: end }
	}

	if (mintWindowStartMode === "scheduled") {
		if (!input.mintWindowStartTime) {
			return { valid: false, error: "Scheduled start time is required" }
		}
		if (
			mintWindowDurationHours === undefined ||
			mintWindowDurationHours === null ||
			mintWindowDurationHours <= 0
		) {
			return { valid: false, error: "Duration must be greater than 0 hours" }
		}
		if (mintWindowDurationHours < 1) {
			return { valid: false, error: "Minimum duration is 1 hour" }
		}

		const start =
			input.mintWindowStartTime instanceof Date
				? input.mintWindowStartTime
				: new Date(input.mintWindowStartTime)

		if (Number.isNaN(start.getTime())) {
			return { valid: false, error: "Invalid start time" }
		}

		const end = new Date(start.getTime() + mintWindowDurationHours * MILLIS_PER_HOUR)
		const now = new Date()

		if (end <= start) {
			return { valid: false, error: "End time must be after start time" }
		}
		if (end <= now) {
			return { valid: false, error: "Mint window must not have already ended" }
		}

		return { valid: true, mintWindowStart: start, mintWindowEnd: end }
	}

	return { valid: false, error: "Invalid start mode: must be 'now' or 'scheduled'" }
}

// ---------------------------------------------------------------------------
// Internal: update-mode validation
// ---------------------------------------------------------------------------

function validateUpdate(input: MintWindowInput): MintWindowValidationResult {
	const { mintWindowStartMode, mintWindowDurationHours } = input

	// Determine start time ---------------------------------------------------
	let start: Date

	if (mintWindowStartMode === "now") {
		start = new Date()
	} else if (mintWindowStartMode === "scheduled") {
		if (!input.mintWindowStartTime) {
			return { valid: false, error: "Scheduled start time is required" }
		}
		start =
			input.mintWindowStartTime instanceof Date
				? input.mintWindowStartTime
				: new Date(input.mintWindowStartTime)

		if (Number.isNaN(start.getTime())) {
			return { valid: false, error: "Invalid start time" }
		}
	} else {
		return { valid: false, error: "Invalid start mode: must be 'now' or 'scheduled'" }
	}

	// Determine end time (no minimum duration enforced on update) -------------
	if (
		mintWindowDurationHours === undefined ||
		mintWindowDurationHours === null ||
		mintWindowDurationHours <= 0
	) {
		return { valid: false, error: "Duration must be greater than 0 hours" }
	}

	const end = new Date(start.getTime() + mintWindowDurationHours * MILLIS_PER_HOUR)
	const now = new Date()

	if (end <= start) {
		return { valid: false, error: "End time must be after start time" }
	}
	if (end <= now) {
		return { valid: false, error: "New end time must be in the future" }
	}

	return { valid: true, mintWindowStart: start, mintWindowEnd: end }
}
