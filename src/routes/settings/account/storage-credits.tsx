import { useState, useCallback, useRef, useEffect } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Progress, Note, Description, DescriptionItem } from "@cdecaire/sable"
import { Stack, Row, Grid } from "@cdecaire/sable/layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Icon } from "@/components/ui/icon"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { PageHeader } from "@/components/shared/PageHeader"
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
			<Stack gap={2} className="pt-4">
				<PageHeader
					title="Storage Credits"
					description="Manage Turbo credits for permanent Arweave storage."
				/>
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
			</Stack>
		)
	}

	return (
		<Stack gap={2} className="pt-4 pb-12">
			{/* Header */}
			<PageHeader
				title="Storage Credits"
				description="Manage Turbo credits for permanent Arweave storage."
			/>

			{/* === Card 1: Authorization Status + Balances === */}
			<div className="rounded-[var(--radius-lg)] bg-white dark:bg-input/30 border border-input px-5 md:px-6 lg:px-8 py-6 md:py-8">
				{isLoading || isSharedLoading ? (
					<Stack gap={1} align="center" className="py-4">
						<LoadingSpinner size="sm" />
						<span className="text-sm text-muted-foreground">Loading storage status...</span>
					</Stack>
				) : error ? (
					<Stack gap={1} align="center" className="py-4">
						<Icon name="circle-exclamation" variant="regular" className="text-2xl text-destructive" />
						<span className="text-sm text-destructive">Failed to load storage status</span>
						<Button variant="ghost" size="default" onClick={() => refetch()}>
							Retry
						</Button>
					</Stack>
				) : (
					<>
						{/* Centered status */}
						<div className="flex flex-col items-center text-center mb-5">
							<div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
								isAuthorized
									? "bg-success/10"
									: "bg-muted"
							}`}>
								<Icon
									name={isAuthorized ? "circle-check" : "shield-check"}
									variant="solid"
									className={`text-xl ${
										isAuthorized
											? "text-success"
											: "text-muted-foreground"
									}`}
								/>
							</div>
							<h2 className="text-title-lg">
								{isAuthorized ? "Service is Authorized" : "Service Not Authorized"}
							</h2>
							<p className="text-sm text-muted-foreground mt-1 max-w-sm">
								{isAuthorized
									? "Desperse is permitted to use your Turbo credits for Arweave storage."
									: "Authorize Desperse to upload edition media to Arweave on your behalf."}
							</p>
						</div>

						{/* Action buttons */}
						<Row gap={1.5} align="center" justify="center" className="mb-6">
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
						</Row>

						{/* Side-by-side balances */}
						<Description cols="2">
							<DescriptionItem
								term="Service Allowance"
								detail={
									<span className="text-title-lg">
										{formatCredits(sharedCredits?.sharedWinc ?? "0")}
									</span>
								}
							/>
							<DescriptionItem
								term="Wallet Balance"
								detail={
									<span className="text-title-lg">
										{formatCredits(balance?.winc ?? "0")}
									</span>
								}
							/>
						</Description>

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
				<Row gap={1.5} align="center" className="mb-4">
					<Icon name="circle-plus" variant="regular" className="w-5 text-center text-muted-foreground" />
					<span className="text-label-lg">Add More Credits</span>
				</Row>

				<Stack gap={2}>
					{/* Preset amount chips */}
					<ToggleGroup
						value={[topUpAmount]}
						onValueChange={(value) => {
							// Always-one-selected presets: ignore a deselect-to-empty.
							if (value[0]) setTopUpAmount(value[0])
						}}
						spacing={1}
						className="grid grid-cols-4 gap-2"
					>
						{TOP_UP_PRESETS.map((amount) => (
							<ToggleGroupItem
								key={amount}
								value={String(amount)}
								disabled={isAnyPending}
								className="w-full py-2 px-3 rounded-lg border text-label-lg transition-colors border-input hover:border-primary/50 text-foreground data-[pressed]:border-primary data-[pressed]:bg-primary data-[pressed]:text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{amount}
							</ToggleGroupItem>
						))}
					</ToggleGroup>

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
							className="text-center text-title-lg pr-12"
							placeholder="0.05"
						/>
						<span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
							SOL
						</span>
					</div>

					{/* Non-refundable warning */}
					<Note variant="warning">
						Credits are non-refundable and cannot be converted back to SOL.
					</Note>

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
				</Stack>

			</div>

			{/* Success / error messages */}
			{actionSuccess && (
				<Note variant="success">{actionSuccess}</Note>
			)}
			{actionError && (
				<Note variant="error">{actionError}</Note>
			)}

			{/* === Activity === */}
			{givenApprovals.length > 0 && (
				<div className="rounded-[var(--radius-lg)] bg-white dark:bg-input/30 border border-input px-5 md:px-6 lg:px-8 py-5 md:py-6">
					<Row gap={1.5} align="center" className="mb-3">
						<Icon name="clock-rotate-left" variant="regular" className="w-5 text-center text-muted-foreground" />
						<span className="text-label-lg">Activity</span>
					</Row>

					<div>
						{givenApprovals.map((approval) => (
							<ApprovalRow key={approval.approvalDataItemId} approval={approval} />
						))}
					</div>
				</div>
			)}
		</Stack>
	)
}

function ApprovalRow({ approval }: { approval: CreditApproval }) {
	const approved = BigInt(approval.approvedWincAmount)
	const used = BigInt(approval.usedWincAmount)
	const remaining = approved - used
	const usagePercent = approved > BigInt(0) ? Number((used * BigInt(100)) / approved) : 0
	const isDesperse = DESPERSE_TURBO_WALLET && approval.approvedAddress.toLowerCase() === DESPERSE_TURBO_WALLET.toLowerCase()

	return (
		<Stack gap={1} className="py-3 border-b border-border/50 last:border-b-0">
			<Row align="center" justify="between">
				<span className="text-label-md">
					{isDesperse ? "Desperse" : truncateAddress(approval.approvedAddress)}
				</span>
				{approval.expirationDate && (
					<span className="text-xs text-muted-foreground">
						Expires {new Date(approval.expirationDate).toLocaleDateString()}
					</span>
				)}
			</Row>
			<Grid cols={3} gap={1} className="text-xs">
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
					<span className={`font-medium ${remaining > BigInt(0) ? "text-success" : "text-muted-foreground"}`}>
						{formatCredits(remaining.toString())}
					</span>
				</div>
			</Grid>
			{/* Usage bar */}
			<Progress value={Math.min(usagePercent, 100)} aria-label="Storage usage" />
		</Stack>
	)
}
