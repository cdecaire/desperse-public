/**
 * Public server functions for the /preservation page.
 *
 * Strict server-fn boundary: only exports createServerFn wrappers.
 * No DB / Node / blockchain SDK imports — those live in
 * @/server/utils/preservation.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { withOptionalAuth } from '@/server/auth'
import {
	lookupFoundationCatalog as lookupCatalogImpl,
	joinPreservationWaitlist as joinWaitlistImpl,
} from '@/server/utils/preservation'

const lookupSchema = z.object({
	addressOrEns: z.string().min(3).max(64),
})

const joinWaitlistSchema = z.object({
	email: z.string().email().optional().nullable(),
	ethAddress: z.string().min(3).max(64).optional().nullable(),
	catalogSnapshot: z
		.object({
			pieceCount: z.number().int().min(0),
			totalSizeBytes: z.number().min(0),
			firstMintAt: z.string().nullable(),
		})
		.optional()
		.nullable(),
})

export const lookupFoundationCatalog = createServerFn({ method: 'POST' }).handler(
	async (input: unknown) => {
		const { auth: _auth, input: data } = await withOptionalAuth(lookupSchema, input)
		return lookupCatalogImpl(data.addressOrEns)
	},
)

export const joinPreservationWaitlist = createServerFn({ method: 'POST' }).handler(
	async (input: unknown) => {
		const { auth, input: data } = await withOptionalAuth(joinWaitlistSchema, input)
		return joinWaitlistImpl({
			userId: auth?.userId ?? null,
			email: data.email ?? null,
			ethAddress: data.ethAddress ?? null,
			catalogSnapshot: data.catalogSnapshot ?? null,
		})
	},
)
