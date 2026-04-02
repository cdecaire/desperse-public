/**
 * Echoes access gate — verifies a secret access code server-side.
 * The code is stored in the ECHOES_ACCESS_CODE env var (never client-exposed).
 */

import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

const codeSchema = z.object({ code: z.string().min(1) })

export const verifyEchoesAccess = createServerFn({
	method: "POST",
}).handler(async (input: unknown) => {
	const rawData =
		input && typeof input === "object" && "data" in input
			? (input as { data: unknown }).data
			: input

	const { code } = codeSchema.parse(rawData)

	const expected = process.env.ECHOES_ACCESS_CODE
	if (!expected) {
		console.error("[verifyEchoesAccess] ECHOES_ACCESS_CODE env var is not set")
		return { success: false as const, error: "Access gate not configured" }
	}

	if (code === expected) {
		return { success: true as const }
	}

	return { success: false as const, error: "Invalid access code" }
})
