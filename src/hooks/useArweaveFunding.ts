/**
 * Arweave Funding Hook
 * Combines balance, cost estimation, and shared credit status for the
 * pre-publish funding flow. Used by ArweaveStorageModal.
 */

import { useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useArweaveBalance } from "@/hooks/useArweaveBalance"
import {
	estimateCost,
	getSharedCreditsWithDesperse,
} from "@/lib/arweave/turbo-client"

interface UseArweaveFundingOptions {
	/** Byte sizes of uploaded media files */
	fileSizes: number[]
	/** Only query when the modal is open */
	enabled: boolean
}

export function useArweaveFunding({
	fileSizes,
	enabled,
}: UseArweaveFundingOptions) {
	const queryClient = useQueryClient()
	const {
		balance,
		isLoading: isBalanceLoading,
		error: balanceError,
		topUp,
		isTopUpPending,
		shareCredits,
		isSharePending,
		refetch: refetchBalance,
		getTurboClient,
		walletAddress,
	} = useArweaveBalance()

	// Cost estimate query — includes ~2KB for metadata JSON
	const {
		data: costEstimate,
		isLoading: isCostLoading,
		error: costError,
		refetch: refetchCost,
	} = useQuery({
		queryKey: ["arweave-cost-estimate", ...fileSizes],
		queryFn: async () => {
			const turbo = await getTurboClient()
			// Add ~2KB for NFT metadata JSON
			return estimateCost(turbo, [...fileSizes, 2048])
		},
		enabled: enabled && !!walletAddress && fileSizes.length > 0,
		staleTime: 60_000, // 1 minute
	})

	// Shared credits query — checks how much the user has shared with Desperse
	const {
		data: sharedCredits,
		isLoading: isSharedLoading,
		error: sharedError,
		refetch: refetchShared,
	} = useQuery({
		queryKey: ["arweave-shared-credits", walletAddress],
		queryFn: async () => {
			const turbo = await getTurboClient()
			return getSharedCreditsWithDesperse(turbo)
		},
		enabled: enabled && !!walletAddress,
		staleTime: 30_000, // 30 seconds
	})

	// Derived values
	const balanceWinc = balance?.winc ?? "0"
	const estimatedCostWinc = costEstimate?.winc ?? "0"
	const sharedWinc = sharedCredits?.sharedWinc ?? "0"

	const costBig = BigInt(estimatedCostWinc)
	const hasCostEstimate = costBig > BigInt(0)
	// "Funded" = wallet balance covers the cost OR shared credits with Desperse do
	const hasSufficientBalance =
		hasCostEstimate &&
		(BigInt(balanceWinc) >= costBig || BigInt(sharedWinc) >= costBig)
	const hasSharedEnough = sharedCredits?.hasApproval ?? false
	const canPublish = hasSharedEnough && hasSufficientBalance

	const isLoading = isBalanceLoading || isCostLoading || isSharedLoading
	const error = balanceError || costError || sharedError

	// Mutation wrappers that invalidate all queries on success
	const handleTopUp = useCallback(
		async (amountSol: number) => {
			const result = await topUp(amountSol)
			// Invalidate all funding-related queries
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: ["arweave-balance"],
				}),
				queryClient.invalidateQueries({
					queryKey: ["arweave-cost-estimate"],
				}),
				queryClient.invalidateQueries({
					queryKey: ["arweave-shared-credits"],
				}),
			])
			return result
		},
		[topUp, queryClient],
	)

	const handleShareCredits = useCallback(
		async (wincAmount: string) => {
			const result = await shareCredits(wincAmount)
			// Invalidate all funding-related queries
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: ["arweave-balance"],
				}),
				queryClient.invalidateQueries({
					queryKey: ["arweave-shared-credits"],
				}),
			])
			return result
		},
		[shareCredits, queryClient],
	)

	const refetchAll = useCallback(async () => {
		await Promise.all([refetchBalance(), refetchCost(), refetchShared()])
	}, [refetchBalance, refetchCost, refetchShared])

	return {
		// Raw data
		balanceWinc,
		estimatedCostWinc,
		sharedWinc,
		// Derived booleans
		hasSufficientBalance,
		hasSharedEnough,
		canPublish,
		// Wallet state
		walletAddress,
		// Mutations
		topUp: handleTopUp,
		shareCredits: handleShareCredits,
		isTopUpPending,
		isSharePending,
		// Loading / error
		isLoading,
		error,
		// Refetch
		refetchAll,
		// Turbo client access (for recovery operations)
		getTurboClient,
	}
}
