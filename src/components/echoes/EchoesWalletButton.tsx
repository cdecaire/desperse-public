/**
 * EchoesWalletButton — Wallet status button for the Echoes nav.
 *
 * Uses Solana-specific useWallets for connection state, and user.linkedAccounts
 * for wallet metadata (embedded vs external, name, icon).
 *
 * - Embedded wallets (Privy): always connected, shows "Desperse Wallet" + address
 * - External wallets (Phantom, Solflare, etc.): shows wallet icon + name + address
 *   with a connection status indicator. If disconnected, click triggers reconnect.
 * - Click opens a wallet popover with balances and fund option.
 */

import { useState, useCallback, useRef, useEffect, useMemo, forwardRef } from "react"
import { useWallets } from "@privy-io/react-auth/solana"
import { useConnectWallet, usePrivy } from "@privy-io/react-auth"
import { useQuery } from "@tanstack/react-query"
import { useActiveWallet } from "@/hooks/useActiveWallet"

function truncateAddress(address: string): string {
	if (address.length <= 10) return address
	return `${address.slice(0, 4)}...${address.slice(-4)}`
}

/** Resolve wallet metadata from Privy linkedAccounts by address */
function useWalletMeta(address: string | undefined) {
	const { user } = usePrivy()

	return useMemo(() => {
		if (!address || !user?.linkedAccounts) {
			return { isEmbedded: false, walletName: "Wallet", walletIcon: null as string | null }
		}

		const linked = user.linkedAccounts.find(
			(a) =>
				a.type === "wallet" &&
				"address" in a &&
				(a as any).address === address,
		)

		if (!linked) {
			return { isEmbedded: false, walletName: "Wallet", walletIcon: null as string | null }
		}

		const clientType = (linked as any).walletClientType as string | undefined
		const isEmbedded = clientType === "privy"

		if (isEmbedded) {
			return { isEmbedded: true, walletName: "Desperse Wallet", walletIcon: null as string | null }
		}

		// External wallet — capitalize the client type for display
		const name = clientType
			? clientType.charAt(0).toUpperCase() + clientType.slice(1).replace(/_/g, " ")
			: "External Wallet"

		return { isEmbedded: false, walletName: name, walletIcon: null as string | null }
	}, [address, user?.linkedAccounts])
}

export function EchoesWalletButton() {
	const { user, logout } = usePrivy()
	const { ready } = useWallets()
	const { connectWallet } = useConnectWallet()
	const { activeAddress, activePrivyWallet, solanaWalletsReady } = useActiveWallet()
	const [popoverOpen, setPopoverOpen] = useState(false)
	const buttonRef = useRef<HTMLButtonElement>(null)
	const popoverRef = useRef<HTMLDivElement>(null)

	// Use the user's preferred wallet from DB (respects wallet switching)
	const walletAddress = activeAddress

	// Resolve metadata from linked accounts
	const { isEmbedded, walletName, walletIcon } = useWalletMeta(walletAddress)

	// Get the linked external Solana wallet address even when disconnected
	const linkedExternalWallet = useMemo(() => {
		if (!user?.linkedAccounts) return null
		return user.linkedAccounts.find(
			(a) =>
				a.type === "wallet" &&
				"chainType" in a &&
				(a as any).chainType === "solana" &&
				(a as any).walletClientType !== "privy",
		)
	}, [user?.linkedAccounts])

	const externalLinkedAddress = linkedExternalWallet
		? ((linkedExternalWallet as any).address as string)
		: null

	const hasDisconnectedExternal =
		!activePrivyWallet && !!externalLinkedAddress

	// Close popover on outside click / escape
	useEffect(() => {
		if (!popoverOpen) return
		const handleClick = (e: MouseEvent) => {
			if (
				popoverRef.current &&
				!popoverRef.current.contains(e.target as Node) &&
				buttonRef.current &&
				!buttonRef.current.contains(e.target as Node)
			) {
				setPopoverOpen(false)
			}
		}
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setPopoverOpen(false)
		}
		document.addEventListener("mousedown", handleClick)
		document.addEventListener("keydown", handleKey)
		return () => {
			document.removeEventListener("mousedown", handleClick)
			document.removeEventListener("keydown", handleKey)
		}
	}, [popoverOpen])

	const handleClick = useCallback(() => {
		if (hasDisconnectedExternal) {
			connectWallet({ walletChainType: "solana-only" })
		} else {
			setPopoverOpen((prev) => !prev)
		}
	}, [hasDisconnectedExternal, connectWallet])

	// Loading state
	if (!ready || !solanaWalletsReady) {
		return (
			<div className="font-label text-[0.6875rem] px-4 py-2.5 min-h-[44px] uppercase tracking-widest nx-bg-primary-container/10 nx-text-primary-container flex items-center gap-2">
				<div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
				<span className="hidden sm:inline">LOADING</span>
			</div>
		)
	}

	// External wallet linked but disconnected
	if (hasDisconnectedExternal) {
		const linkedName =
			(linkedExternalWallet as any)?.walletClient ??
			(linkedExternalWallet as any)?.walletClientType ??
			"Wallet"
		return (
			<button
				type="button"
				onClick={handleClick}
				className="font-label text-[0.6875rem] px-4 py-2.5 min-h-[44px] uppercase tracking-widest border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 transition-colors flex items-center gap-2"
			>
				<span
					className="relative flex h-2 w-2 shrink-0"
					title="Wallet disconnected"
				>
					<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
					<span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-400" />
				</span>
				<span className="hidden sm:inline capitalize">{linkedName}</span>
				<span className="sm:hidden">RECONNECT</span>
				<span className="hidden sm:inline text-yellow-400/60">
					{truncateAddress(externalLinkedAddress!)}
				</span>
			</button>
		)
	}

	// Connected state
	if (activePrivyWallet && walletAddress) {
		return (
			<div className="relative">
				<button
					ref={buttonRef}
					type="button"
					onClick={handleClick}
					className="font-label text-[0.6875rem] px-4 py-2.5 min-h-[44px] uppercase tracking-widest nx-bg-primary-container/10 hover:nx-bg-primary-container/20 nx-text-primary-container transition-colors flex items-center gap-2"
				>
					{/* Connection status dot */}
					<span
						className="relative flex h-2 w-2 shrink-0"
						title={isEmbedded ? "Embedded wallet — always connected" : `${walletName} connected`}
					>
						<span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
					</span>

					{/* External wallet icon */}
					{walletIcon && (
						<img
							src={walletIcon}
							alt=""
							className="h-4 w-4 shrink-0 rounded-sm"
						/>
					)}

					{/* Wallet name (desktop only) */}
					<span className="hidden sm:inline">
						{isEmbedded ? "CONNECTED" : walletName.toUpperCase()}
					</span>

					{/* Address */}
					<span className="nx-text-primary-container/60">
						{truncateAddress(walletAddress)}
					</span>
				</button>

				{popoverOpen && (
					<WalletPopover
						ref={popoverRef}
						address={walletAddress}
						walletName={walletName}
						walletIcon={walletIcon}
						onDisconnect={() => { setPopoverOpen(false); logout() }}
						/>
				)}
			</div>
		)
	}

	// Fallback — no wallet at all
	return (
		<button
			type="button"
			onClick={() => connectWallet({ walletChainType: "solana-only" })}
			className="font-label text-[0.6875rem] px-4 py-2.5 min-h-[44px] uppercase tracking-widest skew-hover nx-bg-primary-container nx-text-on-primary-fixed"
		>
			CONNECT WALLET
		</button>
	)
}

/**
 * Wallet popover — shows balances and fund button.
 */
const WalletPopover = forwardRef<
	HTMLDivElement,
	{
		address: string
		walletName: string
		walletIcon: string | null
		onDisconnect: () => void
	}
>(function WalletPopover({ address, walletName, walletIcon, onDisconnect }, ref) {

	// Query devnet balance via the echoes RPC proxy
	const { data, isLoading } = useQuery({
		queryKey: ["echoes-devnet-balance", address],
		queryFn: async () => {
			const res = await fetch("/api/v1/echoes-rpc", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 1,
					method: "getBalance",
					params: [address],
				}),
			})
			const json = await res.json() as { result?: { value: number } }
			const lamports = json.result?.value ?? 0
			return { sol: lamports / 1_000_000_000 }
		},
		staleTime: 15_000,
		refetchInterval: 30_000,
	})

	const handleCopyAddress = () => {
		navigator.clipboard.writeText(address)
	}

	return (
		<div
			ref={ref}
			className="absolute right-0 top-full mt-2 w-72 border nx-border-subtle nx-bg-surface rounded-md shadow-xl z-50 overflow-hidden"
		>
			{/* Header */}
			<div className="px-4 py-3 border-b nx-border-subtle">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						{walletIcon && (
							<img src={walletIcon} alt="" className="h-4 w-4 rounded-sm" />
						)}
						<span className="font-label text-[10px] tracking-widest uppercase nx-text-on-surface">
							{walletName}
						</span>
					</div>
					<button
						type="button"
						onClick={handleCopyAddress}
						className="font-mono text-[10px] nx-text-muted hover:nx-text-on-surface transition-colors"
						title="Copy address"
					>
						{truncateAddress(address)}
					</button>
				</div>
			</div>

			{/* Devnet Balance */}
			<div className="px-4 py-4">
				<div className="flex items-center gap-1.5 mb-3">
					<span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400" />
					<span className="font-label text-[9px] tracking-widest uppercase text-yellow-400">DEVNET</span>
				</div>
				{isLoading ? (
					<div className="space-y-3 py-2">
						<div className="relative h-1 w-full overflow-hidden rounded-full nx-bg-surface-variant">
							<div className="absolute inset-y-0 w-8 rounded-full nx-bg-primary-container animate-[echoes-scan_1.5s_ease-in-out_infinite]" />
						</div>
						<p className="font-label text-[10px] tracking-widest uppercase nx-text-muted text-center">
							SCANNING WALLET
						</p>
						<style>{`
							@keyframes echoes-scan {
								0% { left: -2rem; }
								50% { left: calc(100% - 0rem); }
								100% { left: -2rem; }
							}
						`}</style>
					</div>
				) : data ? (
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<img
								src="/solana-sol-logo.svg"
								alt="SOL"
								className="h-5 w-5"
							/>
							<span className="font-label text-xs uppercase nx-text-on-surface">
								SOL
							</span>
						</div>
						<span className="font-mono text-xs nx-text-muted">
							{data.sol.toFixed(4)}
						</span>
					</div>
				) : (
					<p className="text-xs nx-text-muted">Unable to load balance</p>
				)}
			</div>

			{/* Actions */}
			<div className="px-4 pb-3 flex gap-2">
				<button
					type="button"
					onClick={handleCopyAddress}
					className="flex-1 font-label text-[10px] tracking-widest uppercase py-2 nx-bg-surface-variant nx-text-on-surface hover:opacity-90 transition-opacity rounded-sm"
				>
					COPY ADDRESS
				</button>
				<button
					type="button"
					onClick={onDisconnect}
					className="flex-1 font-label text-[10px] tracking-widest uppercase py-2 nx-bg-surface-variant text-red-400 hover:bg-red-500/10 transition-colors rounded-sm"
				>
					DISCONNECT
				</button>
			</div>
		</div>
	)
})
