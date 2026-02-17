/**
 * Wallet preferences server functions
 * TanStack createServerFn wrappers for multi-wallet management
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { extractAuthorizationFromPayload, stripAuthorization } from '@/server/auth'
import {
	getUserWalletsDirect,
	setDefaultWalletDirect,
	addWalletDirect,
} from '@/server/utils/wallet-preferences'

const setDefaultWalletSchema = z.object({
	walletId: z.string().uuid(),
})

const addWalletSchema = z.object({
	address: z.string().min(32).max(44),
	type: z.enum(['embedded', 'external']),
	connector: z.string().optional(),
	label: z.string().max(50).optional(),
})

/**
 * Get all wallets for the authenticated user
 */
export const getUserWallets = createServerFn({
	method: 'GET',
}).handler(async (input: unknown) => {
	const rawData =
		input && typeof input === 'object' && 'data' in input
			? (input as { data: unknown }).data
			: input

	const authorization = extractAuthorizationFromPayload(rawData)
	if (!authorization) {
		return { success: false, error: 'Authentication required' }
	}

	return getUserWalletsDirect(authorization)
})

/**
 * Set a wallet as the primary (default) wallet
 */
export const setDefaultWallet = createServerFn({
	method: 'POST',
}).handler(async (input: unknown) => {
	const rawData =
		input && typeof input === 'object' && 'data' in input
			? (input as { data: unknown }).data
			: input

	const authorization = extractAuthorizationFromPayload(rawData)
	if (!authorization) {
		return { success: false, error: 'Authentication required' }
	}

	const cleanedData = stripAuthorization(
		rawData as Record<string, unknown>,
	)
	const { walletId } = setDefaultWalletSchema.parse(cleanedData)

	return setDefaultWalletDirect(authorization, walletId)
})

/**
 * Add a wallet to the authenticated user's wallet list
 */
export const addWallet = createServerFn({
	method: 'POST',
}).handler(async (input: unknown) => {
	const rawData =
		input && typeof input === 'object' && 'data' in input
			? (input as { data: unknown }).data
			: input

	const authorization = extractAuthorizationFromPayload(rawData)
	if (!authorization) {
		return { success: false, error: 'Authentication required' }
	}

	const cleanedData = stripAuthorization(
		rawData as Record<string, unknown>,
	)
	const { address, type, connector, label } = addWalletSchema.parse(cleanedData)

	return addWalletDirect(authorization, address, type, connector, label)
})
