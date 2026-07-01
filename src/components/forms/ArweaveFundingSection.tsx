/**
 * ArweaveFundingSection
 * Inline funding panel shown when "Permanent Storage" is toggled on in EditionOptions.
 * Displays balance, cost estimate, top-up, and credit authorization — all in-place,
 * no modal needed. The publish button in CreatePostForm stays disabled until
 * `onReadyChange(true)` fires.
 */

import { useState, useCallback, useEffect, useRef } from "react"
import { Description, DescriptionItem, InlineStatus, Note, NumberField } from "@cdecaire/sable"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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
	if (fundingError) {
		return (
			<div className="space-y-2 pt-3 ">
				<Note variant="error">
					Failed to load storage status.{" "}
					{fundingError instanceof Error
						? fundingError.message
						: "Unknown error"}
				</Note>
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
			<Description cols="1">
				<DescriptionItem
					term="Estimated cost"
					detail={
						<span className="font-medium">
							{formatCredits(estimatedCostWinc)}
						</span>
					}
				/>
				<DescriptionItem
					term="Available credits"
					tone={fundedOk ? "success" : "destructive"}
					detail={
						<span className="font-medium">
							{formatCredits(displayBalance)}
						</span>
					}
				/>
				<DescriptionItem
					term="Upload permission"
					tone={hasSharedEnough ? "success" : "destructive"}
					detail={
						<span className="font-medium">
							{hasSharedEnough ? "Granted" : "Required"}
						</span>
					}
				/>
			</Description>

			{/* Action: Top up (only if neither wallet nor shared credits cover cost) */}
			{!fundedOk && (
				<div className="space-y-2">
					<Label size="sm" className="block">
						Top up (SOL)
					</Label>
					<div className="flex gap-2">
						<NumberField
							min={0.001}
							max={0.5}
							step={0.05}
							smallStep={0.01}
							value={topUpAmount ? Number(topUpAmount) : null}
							onValueChange={(v) => setTopUpAmount(v == null ? "" : String(v))}
							disabled={disabled || isAnyPending}
							format={{ maximumFractionDigits: 3 }}
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
				<InlineStatus tone="success" size="sm">
					{actionSuccess}
				</InlineStatus>
			)}
			{actionError && (
				<InlineStatus tone="error" size="sm">
					{actionError}
				</InlineStatus>
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

