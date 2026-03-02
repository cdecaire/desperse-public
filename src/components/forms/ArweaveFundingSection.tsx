/**
 * ArweaveFundingSection
 * Inline funding panel shown when "Permanent Storage" is toggled on in EditionOptions.
 * Displays balance, cost estimate, top-up, and credit authorization — all in-place,
 * no modal needed. The publish button in CreatePostForm stays disabled until
 * `onReadyChange(true)` fires.
 */

import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Icon } from "@/components/ui/icon"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { useArweaveFunding } from "@/hooks/useArweaveFunding"
import { formatCredits } from "@/lib/arweave/turbo-client"
import { isUserRejectedError } from "@/lib/errorUtils"
import { useWallets } from "@privy-io/react-auth/solana"
import { useConnectWallet } from "@privy-io/react-auth"
import { Link } from "@tanstack/react-router"

interface ArweaveFundingSectionProps {
	/** Byte sizes of uploaded media for cost estimation */
	fileSizes: number[]
	/** Called when funding readiness changes */
	onReadyChange: (ready: boolean) => void
	/** Disable interactions (e.g. during form submission) */
	disabled?: boolean
}

export function ArweaveFundingSection({
	fileSizes,
	onReadyChange,
	disabled,
}: ArweaveFundingSectionProps) {
	const [topUpAmount, setTopUpAmount] = useState("0.05")
	const [actionError, setActionError] = useState<string | null>(null)
	const [actionSuccess, setActionSuccess] = useState<string | null>(null)
	const [topUpComplete, setTopUpComplete] = useState(false)
	const [isBusy, setIsBusy] = useState(false)
	const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const { wallets, ready: walletsReady } = useWallets()
	const { connectWallet } = useConnectWallet({
		onError: (err) => {
			setActionError(
				err === "exited_auth_flow"
					? "Wallet connection cancelled."
					: "Failed to connect wallet.",
			)
		},
	})
	const hasWallet = wallets.length > 0

	const {
		balanceWinc,
		sharedWinc,
		estimatedCostWinc,
		hasSufficientBalance,
		hasSharedEnough,
		canPublish,
		topUp,
		shareCredits,
		isTopUpPending,
		isSharePending,
		isLoading,
		error: fundingError,
		refetchAll,
	} = useArweaveFunding({
		fileSizes,
		enabled: hasWallet,
	})

	// Report readiness upstream
	const isReady = canPublish || (topUpComplete && hasSharedEnough)
	useEffect(() => {
		onReadyChange(isReady)
	}, [isReady, onReadyChange])

	// Cleanup timer on unmount
	useEffect(() => {
		return () => {
			if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current)
		}
	}, [])

	// Top-up handler
	const handleTopUp = useCallback(async () => {
		setActionError(null)
		setActionSuccess(null)
		setIsBusy(true)
		const sol = parseFloat(topUpAmount)
		if (isNaN(sol) || sol <= 0) {
			setActionError("Enter a valid SOL amount greater than 0.")
			setIsBusy(false)
			return
		}
		try {
			const result = await topUp(sol)
			setTopUpComplete(true)
			if (result.status === "pending") {
				setActionSuccess(
					"Top-up submitted. Credits may take a minute to appear.",
				)
				refetchTimerRef.current = setTimeout(() => {
					refetchAll()
				}, 10_000)
			} else {
				setActionSuccess("Top-up confirmed!")
				refetchTimerRef.current = setTimeout(() => {
					refetchAll()
				}, 3000)
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Top-up failed"
			setActionError(isUserRejectedError(msg) ? "Transaction cancelled." : msg)
		} finally {
			setIsBusy(false)
		}
	}, [topUpAmount, topUp, refetchAll])

	// Share credits handler
	const handleShareCredits = useCallback(async () => {
		setActionError(null)
		setActionSuccess(null)
		setIsBusy(true)
		try {
			const costBig = BigInt(estimatedCostWinc)
			const buffer = costBig + (costBig * BigInt(20)) / BigInt(100)
			await shareCredits(buffer.toString())
			await refetchAll()
			setActionSuccess("Credits authorized!")
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Authorization failed"
			setActionError(isUserRejectedError(msg) ? "Transaction cancelled." : msg)
		} finally {
			setIsBusy(false)
		}
	}, [estimatedCostWinc, shareCredits, refetchAll])

	const isAnyPending = isBusy || isTopUpPending || isSharePending
	const fundedOk = hasSufficientBalance || topUpComplete

	// Best display balance: show shared credits if they cover cost, otherwise wallet balance
	const displayBalance = BigInt(sharedWinc) > BigInt(0) ? sharedWinc : balanceWinc

	// No wallet
	if (walletsReady && !hasWallet) {
		return (
			<div className="space-y-3 pt-3 ">
				<p className="text-xs text-muted-foreground">
					Connect a Solana wallet to fund permanent storage.
				</p>
				<Button
					type="button"
					variant="outline"
					size="default"
					onClick={() =>
						connectWallet({ walletChainType: "solana-only" })
					}
					disabled={disabled}
					className="w-full"
				>
					Connect Wallet
				</Button>
				{actionError && (
					<p className="text-xs text-destructive">{actionError}</p>
				)}
			</div>
		)
	}

	// Loading
	if (isLoading) {
		return (
			<div className="flex items-center gap-2 pt-3 ">
				<LoadingSpinner size="sm" />
				<span className="text-xs text-muted-foreground">
					Checking storage status...
				</span>
			</div>
		)
	}

	// Error loading
	if (fundingError && !balanceWinc) {
		return (
			<div className="space-y-2 pt-3 ">
				<p className="text-xs text-destructive">
					Failed to load storage status.{" "}
					{fundingError instanceof Error
						? fundingError.message
						: "Unknown error"}
				</p>
				<Button
					type="button"
					variant="outline"
					size="default"
					onClick={() => refetchAll()}
					disabled={disabled}
				>
					Retry
				</Button>
			</div>
		)
	}

	return (
		<div className="space-y-3 pt-3">
			{/* Status overview */}
			<div className="space-y-2">
				<div className="flex justify-between text-xs">
					<span className="text-muted-foreground">
						Estimated cost
					</span>
					<span className="font-medium">
						{formatCredits(estimatedCostWinc)}
					</span>
				</div>
				<div className="flex justify-between text-xs">
					<span className="text-muted-foreground">Available credits</span>
					<span
						className={`font-medium ${fundedOk ? "text-green-600 dark:text-green-400" : "text-destructive"}`}
					>
						{formatCredits(displayBalance)}
					</span>
				</div>
				<div className="flex justify-between text-xs">
					<span className="text-muted-foreground">
						Upload permission
					</span>
					<span
						className={`font-medium ${hasSharedEnough ? "text-green-600 dark:text-green-400" : "text-destructive"}`}
					>
						{hasSharedEnough ? "Granted" : "Required"}
					</span>
				</div>
			</div>

			{/* Action: Top up (only if neither wallet nor shared credits cover cost) */}
			{!fundedOk && (
				<div className="space-y-2">
					<label className="text-xs font-medium block">
						Top up (SOL)
					</label>
					<div className="flex gap-2">
						<Input
							type="number"
							step="0.01"
							min="0.001"
							max="0.5"
							value={topUpAmount}
							onChange={(e) => setTopUpAmount(e.target.value)}
							disabled={disabled || isAnyPending}
							className="max-w-[120px] h-8 text-sm"
						/>
						<Button
							type="button"
							size="default"
							onClick={handleTopUp}
							disabled={disabled || isAnyPending}
							className="h-8 text-sm px-3"
						>
							{isTopUpPending || (isBusy && !isSharePending) ? (
								<>
									<LoadingSpinner
										size="sm"
										className="mr-1.5"
									/>
									Signing...
								</>
							) : (
								"Top Up"
							)}
						</Button>
					</div>
					<p className="text-xs text-muted-foreground">
						SOL is converted to Turbo credits for Arweave uploads.
					</p>
				</div>
			)}

			{/* Action: Authorize (if funded but not authorized) */}
			{fundedOk && !hasSharedEnough && (
				<div className="space-y-2">
					<p className="text-xs text-muted-foreground">
						Authorize Desperse to upload your media to Arweave when
						the first edition is collected. Unused credits stay in
						your account.
					</p>
					<Button
						type="button"
						variant="outline"
						size="default"
						onClick={handleShareCredits}
						disabled={disabled || isAnyPending}
						className="w-full h-8 text-sm"
					>
						{isSharePending || (isBusy && !isTopUpPending) ? (
							<>
								<LoadingSpinner
									size="sm"
									className="mr-1.5"
								/>
								Signing...
							</>
						) : (
							"Authorize Credits"
						)}
					</Button>
				</div>
			)}

			{/* Success / error messages */}
			{actionSuccess && (
				<p className="text-xs text-green-600 dark:text-green-400">
					{actionSuccess}
				</p>
			)}
			{actionError && (
				<div className="flex items-start gap-1.5 text-xs text-destructive">
					<Icon
						name="circle-exclamation"
						variant="regular"
						className="mt-0.5 shrink-0"
					/>
					<span>{actionError}</span>
				</div>
			)}

			{/* Link to settings */}
			<Link
				to="/settings/account/storage-credits"
				className="text-xs text-muted-foreground underline hover:text-foreground"
			>
				Manage storage credits in Settings
			</Link>
		</div>
	)
}

