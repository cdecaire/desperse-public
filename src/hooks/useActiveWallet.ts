/**
 * Active wallet hook for multi-wallet support
 * Queries the userWallets table for the user's wallets and active (primary) wallet,
 * then correlates with Privy wallet objects for signing.
 */

import { useMemo } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { usePrivy } from '@privy-io/react-auth'
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana'
import { getUserWallets, setDefaultWallet } from '@/server/functions/walletPreferences'
import { useAuth } from './useAuth'
import type { UserWallet } from '@/server/utils/wallet-preferences'

type ServerFnInput<T> = { data: T }
const wrapInput = <T,>(data: T): ServerFnInput<T> => ({ data })

export function useActiveWallet() {
	const { isAuthenticated, privyId, walletAddress, getAuthHeaders } = useAuth()
	const { user } = usePrivy()
	const { wallets: privyWallets, ready: solanaWalletsReady } = useSolanaWallets()
	const queryClient = useQueryClient()

	// Only wallets LINKED to this Privy account may ever be selected. useWallets()
	// also reports browser-connected extension wallets that can belong to a
	// different account entirely — using one for display/signing is an
	// account-identity bug.
	const ownedPrivyWallets = useMemo(() => {
		const linked = new Set(
			(user?.linkedAccounts ?? [])
				.filter(
					(a) => a.type === 'wallet' && a.chainType === 'solana' && 'address' in a,
				)
				.map((a) => (a as { address: string }).address),
		)
		return privyWallets.filter((w) => linked.has(w.address))
	}, [privyWallets, user?.linkedAccounts])

	const { data, isLoading } = useQuery({
		queryKey: ['user-wallets', privyId],
		queryFn: async () => {
			const headers = await getAuthHeaders()
			const result = await getUserWallets(
				wrapInput({ _authorization: headers.Authorization }) as never,
			)
			return result as {
				success: boolean
				wallets?: UserWallet[]
				error?: string
			}
		},
		enabled: isAuthenticated,
	})

	const wallets = data?.wallets ?? []

	// The active wallet is the one with isPrimary: true, or first wallet as fallback
	const activeWallet = useMemo(() => {
		const primary = wallets.find((w) => w.isPrimary)
		if (primary) return primary
		if (wallets.length > 0) return wallets[0]
		return null
	}, [wallets])

	// Match the active wallet address to a Privy ConnectedSolanaWallet for signing
	// Falls back to first OWNED Privy wallet when no DB wallets exist (pre-migration users)
	const activePrivyWallet = useMemo(() => {
		if (!activeWallet) {
			// No DB wallets - fall back to first linked Privy wallet
			return ownedPrivyWallets[0] || null
		}
		// Match by address
		return (
			ownedPrivyWallets.find((w) => w.address === activeWallet.address) || null
		)
	}, [activeWallet, ownedPrivyWallets])

	// Convenience: the address to use for transactions
	const activeAddress = useMemo(() => {
		return (
			activeWallet?.address ??
			ownedPrivyWallets[0]?.address ??
			walletAddress ??
			null
		)
	}, [activeWallet, ownedPrivyWallets, walletAddress])

	const setActiveWalletMutation = useMutation({
		mutationFn: async (walletId: string) => {
			const headers = await getAuthHeaders()
			const result = await setDefaultWallet(
				wrapInput({
					walletId,
					_authorization: headers.Authorization,
				}) as never,
			)
			return result as { success: boolean; error?: string }
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['user-wallets'] })
			// Also invalidate wallet overview so the panel refreshes
			queryClient.invalidateQueries({ queryKey: ['wallets-overview'] })
		},
	})

	/** Refresh the wallet list from the DB */
	const refreshWallets = () => {
		queryClient.invalidateQueries({ queryKey: ['user-wallets'] })
	}

	return {
		/** All wallets from the userWallets DB table */
		wallets,
		/** The primary/active wallet from DB (or null if no DB wallets) */
		activeWallet,
		/** Privy ConnectedSolanaWallet matching the active address (for signing) */
		activePrivyWallet,
		/** Address to use for transactions (active wallet or first Privy wallet) */
		activeAddress,
		/** Whether Privy wallets SDK is ready */
		solanaWalletsReady,
		/** Set a different wallet as the primary/active wallet */
		setActiveWallet: setActiveWalletMutation.mutateAsync,
		/** Whether a setActiveWallet call is in progress */
		isSettingActive: setActiveWalletMutation.isPending,
		/** Whether the initial wallet list is loading */
		isLoading,
		/** Refresh wallet list from DB */
		refreshWallets,
	}
}
