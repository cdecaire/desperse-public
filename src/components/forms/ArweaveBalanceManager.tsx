/**
 * ArweaveBalanceManager — Inline funding widget for Arweave storage credits.
 *
 * Shows current balance, estimated cost, and lets creators:
 * 1. Top up Turbo credits with SOL
 * 2. Share credits with the Desperse platform wallet
 *
 * Displayed within the edition creation form when Arweave storage is selected.
 */

import { useState } from "react"
import { useArweaveBalance } from "@/hooks/useArweaveBalance"
import { Button } from "@/components/ui/button"

interface ArweaveBalanceManagerProps {
	/** Estimated upload cost in winc (for showing sufficiency) */
	estimatedCostWinc?: string
	/** Whether the manager is in a compact inline mode */
	compact?: boolean
}

export function ArweaveBalanceManager({
	estimatedCostWinc,
	compact = false,
}: ArweaveBalanceManagerProps) {
	const {
		balance,
		isLoading,
		error,
		topUp,
		isTopUpPending,
		shareCredits,
		isSharePending,
		refetch,
	} = useArweaveBalance()

	const [topUpAmount, setTopUpAmount] = useState("0.05")
	const [showTopUp, setShowTopUp] = useState(false)
	const [actionError, setActionError] = useState<string | null>(null)

	const balanceWinc = balance?.winc ? BigInt(balance.winc) : BigInt(0)
	const costWinc = estimatedCostWinc ? BigInt(estimatedCostWinc) : BigInt(0)
	const hasSufficientBalance = costWinc > BigInt(0) ? balanceWinc >= costWinc : balanceWinc > BigInt(0)

	// Format winc to a human-readable string (approximate)
	const formatWinc = (winc: bigint): string => {
		if (winc === BigInt(0)) return "0"
		// 1 AR = 1e12 winc, show in AR units
		const arAmount = Number(winc) / 1e12
		if (arAmount < 0.001) return "<0.001 AR"
		return `${arAmount.toFixed(3)} AR`
	}

	const handleTopUp = async () => {
		setActionError(null)
		try {
			const amount = Number.parseFloat(topUpAmount)
			if (Number.isNaN(amount) || amount <= 0) {
				setActionError("Enter a valid amount")
				return
			}
			await topUp(amount)
			setShowTopUp(false)
		} catch (err) {
			setActionError(err instanceof Error ? err.message : "Top-up failed")
		}
	}

	const handleShareCredits = async () => {
		setActionError(null)
		try {
			// Share entire balance with platform (common flow)
			if (balanceWinc <= BigInt(0)) {
				setActionError("No credits to share. Top up first.")
				return
			}
			await shareCredits(balanceWinc.toString())
		} catch (err) {
			setActionError(err instanceof Error ? err.message : "Failed to share credits")
		}
	}

	if (isLoading) {
		return (
			<div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 text-sm text-zinc-500">
				Loading storage balance...
			</div>
		)
	}

	if (error) {
		return (
			<div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3 text-sm">
				<p className="text-red-600 dark:text-red-400">Failed to load storage balance</p>
				<Button variant="ghost" size="default" onClick={() => refetch()} className="mt-1 text-xs">
					Retry
				</Button>
			</div>
		)
	}

	return (
		<div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-2">
			{/* Balance display */}
			<div className="flex items-center justify-between">
				<span className="text-sm text-zinc-500 dark:text-zinc-400">Storage Credits</span>
				<span className={`text-sm font-medium ${hasSufficientBalance ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
					{formatWinc(balanceWinc)}
				</span>
			</div>

			{/* Cost estimate */}
			{costWinc > BigInt(0) && (
				<div className="flex items-center justify-between text-xs text-zinc-400">
					<span>Estimated cost</span>
					<span>{formatWinc(costWinc)}</span>
				</div>
			)}

			{/* Insufficient balance warning */}
			{!hasSufficientBalance && (
				<p className="text-xs text-amber-600 dark:text-amber-400">
					Insufficient credits. Top up and share credits to enable permanent storage.
				</p>
			)}

			{/* Action error */}
			{actionError && (
				<p className="text-xs text-red-500">{actionError}</p>
			)}

			{/* Actions */}
			{!compact && (
				<div className="flex gap-2 pt-1">
					{!showTopUp ? (
						<>
							<Button
								variant="outline"
								size="default"
								onClick={() => setShowTopUp(true)}
								className="text-xs flex-1"
							>
								Top Up
							</Button>
							<Button
								variant="outline"
								size="default"
								onClick={handleShareCredits}
								disabled={isSharePending || balanceWinc <= BigInt(0)}
								className="text-xs flex-1"
							>
								{isSharePending ? "Sharing..." : "Authorize"}
							</Button>
						</>
					) : (
						<div className="flex gap-2 w-full items-center">
							<input
								type="number"
								step="0.01"
								min="0.01"
								value={topUpAmount}
								onChange={(e) => setTopUpAmount(e.target.value)}
								className="w-24 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1 text-xs"
								placeholder="SOL"
							/>
							<span className="text-xs text-zinc-400">SOL</span>
							<Button
								variant="default"
								size="default"
								onClick={handleTopUp}
								disabled={isTopUpPending}
								className="text-xs"
							>
								{isTopUpPending ? "..." : "Pay"}
							</Button>
							<Button
								variant="ghost"
								size="default"
								onClick={() => setShowTopUp(false)}
								className="text-xs"
							>
								Cancel
							</Button>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
