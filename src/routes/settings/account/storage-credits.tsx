import { useState, useCallback, useRef, useEffect } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Icon } from "@/components/ui/icon"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { useArweaveBalance } from "@/hooks/useArweaveBalance"
import {
	formatCredits,
	getSharedCreditsWithDesperse,
	DESPERSE_TURBO_WALLET,
} from "@/lib/arweave/turbo-client"
import type { CreditApproval } from "@/lib/arweave/turbo-client"
import { isUserRejectedError } from "@/lib/errorUtils"
import { useQuery } from "@tanstack/react-query"
import { useWallets } from "@privy-io/react-auth/solana"
import { useConnectWallet } from "@privy-io/react-auth"

export const Route = createFileRoute("/settings/account/storage-credits")({
	component: StorageCreditsPage,
})

/** Preset SOL amounts for quick top-up */
const TOP_UP_PRESETS = [0.01, 0.05, 0.1, 0.5]

/** Truncate an address for display */
function truncateAddress(addr: string): string {
	if (addr.length <= 12) return addr
	return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function StorageCreditsPage() {
	const { wallets, ready: walletsReady } = useWallets()
	const { connectWallet } = useConnectWallet()
	const hasWallet = wallets.length > 0

	const {
		balance,
		isLoading,
		error,
		topUp,
		isTopUpPending,
		shareCredits,
		isSharePending,
		revokeCredits,
		isRevokePending,
		refetch,
		getTurboClient,
		walletAddress,
	} = useArweaveBalance()

	// Shared credits query
	const {
		data: sharedCredits,
		isLoading: isSharedLoading,
		refetch: refetchShared,
	} = useQuery({
		queryKey: ["arweave-shared-credits", walletAddress],
		queryFn: async () => {
			const turbo = await getTurboClient()
			return getSharedCreditsWithDesperse(turbo)
		},
		enabled: !!walletAddress,
		staleTime: 30_000,
	})

	const [topUpAmount, setTopUpAmount] = useState("0.05")
	const [actionError, setActionError] = useState<string | null>(null)
	const [actionSuccess, setActionSuccess] = useState<string | null>(null)
	const [isBusy, setIsBusy] = useState(false)
	const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		return () => {
			if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current)
		}
	}, [])

	const clearMessages = () => {
		setActionError(null)
		setActionSuccess(null)
	}

	const refetchAll = useCallback(async () => {
		await Promise.all([refetch(), refetchShared()])
	}, [refetch, refetchShared])

	// Top-up handler
	const handleTopUp = useCallback(async () => {
		clearMessages()
		setIsBusy(true)
		const sol = parseFloat(topUpAmount)
		if (isNaN(sol) || sol <= 0) {
			setActionError("Enter a valid SOL amount greater than 0.")
			setIsBusy(false)
			return
		}
		if (sol > 0.5) {
			setActionError("Maximum top-up is 0.5 SOL.")
			setIsBusy(false)
			return
		}
		try {
			const result = await topUp(sol)
			if (result.status === "pending") {
				setActionSuccess("Top-up submitted. Credits may take a minute to appear.")
				refetchTimerRef.current = setTimeout(() => refetchAll(), 10_000)
			} else {
				setActionSuccess("Top-up confirmed!")
				refetchTimerRef.current = setTimeout(() => refetchAll(), 3000)
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Top-up failed"
			setActionError(isUserRejectedError(msg) ? "Transaction cancelled." : msg)
		} finally {
			setIsBusy(false)
		}
	}, [topUpAmount, topUp, refetchAll])

	// Authorize handler
	const handleAuthorize = useCallback(async () => {
		clearMessages()
		setIsBusy(true)
		try {
			const balanceWinc = BigInt(balance?.winc ?? "0")
			if (balanceWinc === BigInt(0)) {
				setActionError("No credits to authorize. Top up first.")
				setIsBusy(false)
				return
			}
			await shareCredits(balanceWinc.toString())
			await refetchAll()
			setActionSuccess("Credits authorized for Desperse!")
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Authorization failed"
			setActionError(isUserRejectedError(msg) ? "Transaction cancelled." : msg)
		} finally {
			setIsBusy(false)
		}
	}, [balance, shareCredits, refetchAll])

	// Revoke handler
	const handleRevoke = useCallback(async () => {
		clearMessages()
		setIsBusy(true)
		try {
			await revokeCredits(DESPERSE_TURBO_WALLET)
			await refetchAll()
			setActionSuccess("Unused credits reclaimed successfully.")
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Revoke failed"
			setActionError(isUserRejectedError(msg) ? "Transaction cancelled." : msg)
		} finally {
			setIsBusy(false)
		}
	}, [revokeCredits, refetchAll])

	const isAnyPending = isBusy || isTopUpPending || isSharePending || isRevokePending

	// Approval data from balance response
	const givenApprovals: CreditApproval[] = balance?.givenApprovals ?? []
	const isAuthorized = sharedCredits?.hasApproval ?? false

	// No wallet connected
	if (walletsReady && !hasWallet) {
		return (
			<div className="space-y-4 pt-4">
				<div className="space-y-2">
					<h1 className="hidden md:block text-xl font-bold">Storage Credits</h1>
					<p className="text-sm text-muted-foreground">
						Manage Turbo credits for permanent Arweave storage.
					</p>
				</div>
				<div className="rounded-[var(--radius-lg)] bg-white dark:bg-input/30 border border-input px-5 md:px-6 lg:px-8 py-8 text-center">
					<Icon name="wallet" variant="regular" className="text-3xl text-muted-foreground mb-3" />
					<p className="text-sm text-muted-foreground mb-4">
						Connect a Solana wallet to manage storage credits.
					</p>
					<Button
						variant="outline"
						onClick={() => connectWallet({ walletChainType: "solana-only" })}
					>
						Connect Wallet
					</Button>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-4 pt-4 pb-12">
			{/* Header */}
			<div className="space-y-2">
				<h1 className="hidden md:block text-xl font-bold">Storage Credits</h1>
				<p className="text-sm text-muted-foreground">
					Manage Turbo credits for permanent Arweave storage.
				</p>
			</div>

			{/* === Card 1: Authorization Status + Balances === */}
			<div className="rounded-[var(--radius-lg)] bg-white dark:bg-input/30 border border-input px-5 md:px-6 lg:px-8 py-6 md:py-8">
				{isLoading || isSharedLoading ? (
					<div className="flex flex-col items-center gap-2 py-4">
						<LoadingSpinner size="sm" />
						<span className="text-sm text-muted-foreground">Loading storage status...</span>
					</div>
				) : error ? (
					<div className="flex flex-col items-center gap-2 py-4">
						<Icon name="circle-exclamation" variant="regular" className="text-2xl text-destructive" />
						<span className="text-sm text-destructive">Failed to load storage status</span>
						<Button variant="ghost" size="default" onClick={() => refetch()}>
							Retry
						</Button>
					</div>
				) : (
					<>
						{/* Centered status */}
						<div className="flex flex-col items-center text-center mb-5">
							<div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
								isAuthorized
									? "bg-green-100 dark:bg-green-900/30"
									: "bg-muted"
							}`}>
								<Icon
									name={isAuthorized ? "circle-check" : "shield-check"}
									variant="solid"
									className={`text-xl ${
										isAuthorized
											? "text-green-600 dark:text-green-400"
											: "text-muted-foreground"
									}`}
								/>
							</div>
							<h2 className="text-lg font-semibold">
								{isAuthorized ? "Service is Authorized" : "Service Not Authorized"}
							</h2>
							<p className="text-sm text-muted-foreground mt-1 max-w-sm">
								{isAuthorized
									? "Desperse is permitted to use your Turbo credits for Arweave storage."
									: "Authorize Desperse to upload edition media to Arweave on your behalf."}
							</p>
						</div>

						{/* Action buttons */}
						<div className="flex items-center justify-center gap-3 mb-6">
							{isAuthorized ? (
								<Button
									variant="outline"
									onClick={handleRevoke}
									disabled={isAnyPending}
									className="text-destructive hover:text-destructive"
								>
									{isRevokePending || (isBusy && !isTopUpPending && !isSharePending) ? (
										<>
											<LoadingSpinner size="sm" className="mr-1.5" />
											Revoking...
										</>
									) : (
										<>
											<Icon name="circle-xmark" variant="regular" className="mr-1.5" />
											Revoke Access
										</>
									)}
								</Button>
							) : (
								<Button
									variant="outline"
									onClick={handleAuthorize}
									disabled={isAnyPending || BigInt(balance?.winc ?? "0") === BigInt(0)}
								>
									{isSharePending || (isBusy && !isTopUpPending && !isRevokePending) ? (
										<>
											<LoadingSpinner size="sm" className="mr-1.5" />
											Signing...
										</>
									) : (
										<>
											<Icon name="shield-check" variant="regular" className="mr-1.5" />
											Authorize Service
										</>
									)}
								</Button>
							)}
						</div>

						{/* Side-by-side balances */}
						<div className="grid grid-cols-2 divide-x divide-border rounded-lg border border-border overflow-hidden">
							<div className="px-4 py-3 text-center">
								<span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">
									Service Allowance
								</span>
								<span className="text-lg font-bold">
									{formatCredits(sharedCredits?.sharedWinc ?? "0")}
								</span>
							</div>
							<div className="px-4 py-3 text-center">
								<span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">
									Wallet Balance
								</span>
								<span className="text-lg font-bold">
									{formatCredits(balance?.winc ?? "0")}
								</span>
							</div>
						</div>

						{!isAuthorized && BigInt(balance?.winc ?? "0") === BigInt(0) && (
							<p className="text-xs text-muted-foreground text-center mt-3">
								Add credits below, then authorize Desperse to use them.
							</p>
						)}
					</>
				)}
			</div>

			{/* === Card 2: Add More Credits === */}
			<div className="rounded-[var(--radius-lg)] bg-white dark:bg-input/30 border border-input px-5 md:px-6 lg:px-8 py-5 md:py-6">
				<div className="flex items-center gap-3 mb-4">
					<Icon name="circle-plus" variant="regular" className="w-5 text-center text-muted-foreground" />
					<span className="text-sm font-medium">Add More Credits</span>
				</div>

				<div className="space-y-4">
					{/* Preset amount chips */}
					<div className="grid grid-cols-4 gap-2">
						{TOP_UP_PRESETS.map((amount) => (
							<button
								key={amount}
								type="button"
								onClick={() => setTopUpAmount(String(amount))}
								disabled={isAnyPending}
								className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
									topUpAmount === String(amount)
										? "border-primary bg-primary text-primary-foreground"
										: "border-input hover:border-primary/50 text-foreground"
								} disabled:opacity-50 disabled:cursor-not-allowed`}
							>
								{amount}
							</button>
						))}
					</div>

					{/* Custom amount input */}
					<div className="relative">
						<Input
							type="number"
							step="0.01"
							min="0.001"
							max="0.5"
							value={topUpAmount}
							onChange={(e) => setTopUpAmount(e.target.value)}
							disabled={isAnyPending}
							className="text-center text-lg font-semibold pr-12"
							placeholder="0.05"
						/>
						<span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
							SOL
						</span>
					</div>

					{/* Non-refundable warning */}
					<div className="flex items-start gap-1.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
						<Icon name="circle-info" variant="solid" className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
						<p className="text-xs text-amber-800 dark:text-amber-300">
							Credits are non-refundable and cannot be converted back to SOL.
						</p>
					</div>

					{/* Purchase button */}
					<Button
						onClick={handleTopUp}
						disabled={isAnyPending}
						className="w-full"
					>
						{isTopUpPending || (isBusy && !isSharePending && !isRevokePending) ? (
							<>
								<LoadingSpinner size="sm" className="mr-1.5" />
								Signing...
							</>
						) : (
							"Purchase Storage Credits"
						)}
					</Button>
				</div>

			</div>

			{/* Success / error messages */}
			{actionSuccess && (
				<div className="flex items-start gap-1.5 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50">
					<Icon name="circle-check" variant="solid" className="text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
					<p className="text-xs text-green-800 dark:text-green-300">{actionSuccess}</p>
				</div>
			)}
			{actionError && (
				<div className="flex items-start gap-1.5 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
					<Icon name="circle-exclamation" variant="solid" className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
					<p className="text-xs text-red-800 dark:text-red-300">{actionError}</p>
				</div>
			)}

			{/* === Activity === */}
			{givenApprovals.length > 0 && (
				<div className="rounded-[var(--radius-lg)] bg-white dark:bg-input/30 border border-input px-5 md:px-6 lg:px-8 py-5 md:py-6">
					<div className="flex items-center gap-3 mb-3">
						<Icon name="clock-rotate-left" variant="regular" className="w-5 text-center text-muted-foreground" />
						<span className="text-sm font-medium">Activity</span>
					</div>

					<div>
						{givenApprovals.map((approval) => (
							<ApprovalRow key={approval.approvalDataItemId} approval={approval} />
						))}
					</div>
				</div>
			)}
		</div>
	)
}

function ApprovalRow({ approval }: { approval: CreditApproval }) {
	const approved = BigInt(approval.approvedWincAmount)
	const used = BigInt(approval.usedWincAmount)
	const remaining = approved - used
	const usagePercent = approved > BigInt(0) ? Number((used * BigInt(100)) / approved) : 0
	const isDesperse = DESPERSE_TURBO_WALLET && approval.approvedAddress.toLowerCase() === DESPERSE_TURBO_WALLET.toLowerCase()

	return (
		<div className="py-3 border-b border-border/50 last:border-b-0 space-y-2">
			<div className="flex items-center justify-between">
				<span className="text-xs font-medium">
					{isDesperse ? "Desperse" : truncateAddress(approval.approvedAddress)}
				</span>
				{approval.expirationDate && (
					<span className="text-xs text-muted-foreground">
						Expires {new Date(approval.expirationDate).toLocaleDateString()}
					</span>
				)}
			</div>
			<div className="grid grid-cols-3 gap-2 text-xs">
				<div>
					<span className="text-muted-foreground block">Approved</span>
					<span className="font-medium">{formatCredits(approval.approvedWincAmount)}</span>
				</div>
				<div>
					<span className="text-muted-foreground block">Used</span>
					<span className="font-medium">{formatCredits(approval.usedWincAmount)}</span>
				</div>
				<div>
					<span className="text-muted-foreground block">Remaining</span>
					<span className={`font-medium ${remaining > BigInt(0) ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
						{formatCredits(remaining.toString())}
					</span>
				</div>
			</div>
			{/* Usage bar */}
			<div className="h-1.5 bg-muted rounded-full overflow-hidden">
				<div
					className="h-full bg-primary rounded-full transition-all"
					style={{ width: `${Math.min(usagePercent, 100)}%` }}
				/>
			</div>
		</div>
	)
}
