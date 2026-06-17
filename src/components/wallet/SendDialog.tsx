/**
 * SendDialog Component
 * Dialog for sending SOL/USDC/SKR from the wallet menu.
 * Single screen: recipient address + amount → send.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MiddleTruncate } from "@cdecaire/sable";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useSend } from "@/hooks/useSend";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { useConnectWallet } from "@privy-io/react-auth";
import { useWallets as useSolanaWallets } from "@privy-io/react-auth/solana";
import { isAddress } from "@solana/addresses";
import { cn } from "@/lib/utils";
import { toastError } from "@/lib/toast";
import type { SendableAsset } from "@/server/utils/transfer-transaction";

const SOL_RESERVE = 0.005;

interface SendDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	asset: SendableAsset | null;
	balance: number;
	symbol: string;
	iconUrl: string | null;
}

export function SendDialog({
	open,
	onOpenChange,
	asset,
	balance,
	symbol,
	iconUrl,
}: SendDialogProps) {
	const [toAddress, setToAddress] = useState("");
	const [amount, setAmount] = useState("");
	const [addressTouched, setAddressTouched] = useState(false);
	const { state, send, reset } = useSend();
	const { activeWallet, activeAddress, activePrivyWallet, solanaWalletsReady } =
		useActiveWallet();
	const { wallets: solanaWallets } = useSolanaWallets();
	const { connectWallet } = useConnectWallet({
		onError: () => {
			toastError("Wallet connection failed. Please try again.");
		},
	});

	// Wallet availability
	const hasWallet =
		solanaWalletsReady && (activePrivyWallet || solanaWallets[0]);

	// Wallet label for display
	const walletLabel = useMemo(() => {
		if (activeWallet?.label) return activeWallet.label;
		if (activeWallet?.type === "embedded") return "Desperse Wallet";
		if (activePrivyWallet) {
			const clientType = (activePrivyWallet as any).walletClientType;
			if (clientType === "privy") return "Desperse Wallet";
			// Capitalize first letter
			if (clientType)
				return clientType.charAt(0).toUpperCase() + clientType.slice(1);
		}
		return "Wallet";
	}, [activeWallet, activePrivyWallet]);

	// Validation
	const isValidAddress = toAddress.length > 0 && isAddress(toAddress);
	const isSelfSend = isValidAddress && toAddress === activeAddress;
	const showAddressError = addressTouched && toAddress.length > 0 && !isValidAddress;

	const parsedAmount = Number.parseFloat(amount);
	const isValidAmount =
		!Number.isNaN(parsedAmount) && parsedAmount > 0;

	const maxAmount = useMemo(() => {
		if (!asset) return 0;
		if (asset === "sol") {
			return Math.max(0, balance - SOL_RESERVE);
		}
		return balance;
	}, [asset, balance]);

	const hasInsufficientFunds = isValidAmount && parsedAmount > maxAmount;

	const canSend =
		isValidAddress &&
		!isSelfSend &&
		isValidAmount &&
		!hasInsufficientFunds &&
		hasWallet;

	const isPending =
		state === "preparing" || state === "signing" || state === "confirming";

	const handleMax = useCallback(() => {
		if (maxAmount <= 0) return;
		// Format with appropriate decimals
		const decimals = asset === "sol" ? 9 : 6;
		// Trim trailing zeros but keep meaningful precision
		const formatted = maxAmount.toFixed(Math.min(decimals, 6)).replace(/\.?0+$/, "");
		setAmount(formatted);
	}, [maxAmount, asset]);

	const handleSend = useCallback(async () => {
		if (!canSend || !asset) return;

		// Close our dialog immediately — Privy's signing modal takes over
		onOpenChange(false);

		await send({
			toAddress,
			amount,
			asset,
			onSuccess: () => {
				// Reset form state after success
				reset();
				setToAddress("");
				setAmount("");
				setAddressTouched(false);
			},
		});
	}, [canSend, asset, toAddress, amount, send, onOpenChange, reset]);

	const handleClose = useCallback(
		(isOpen: boolean) => {
			if (!isOpen && state !== "signing" && state !== "confirming") {
				onOpenChange(false);
				setTimeout(() => {
					reset();
					setToAddress("");
					setAmount("");
					setAddressTouched(false);
				}, 200);
			}
		},
		[state, onOpenChange, reset],
	);

	// Reset form when asset changes or dialog opens
	useEffect(() => {
		if (open) {
			setToAddress("");
			setAmount("");
			setAddressTouched(false);
			reset();
		}
	}, [open, asset, reset]);

	if (!asset) return null;

	const formattedBalance = balance.toLocaleString(undefined, {
		minimumFractionDigits: 0,
		maximumFractionDigits: asset === "sol" ? 4 : 2,
	});

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<div className="h-8 w-8 shrink-0 rounded-full bg-background dark:bg-muted border border-border flex items-center justify-center overflow-hidden">
							{iconUrl ? (
								<img
									src={iconUrl}
									alt={symbol}
									className={cn(
										iconUrl === "/solana-sol-logo.svg"
											? "h-5 w-5 object-contain"
											: "w-full h-full object-cover",
									)}
								/>
							) : (
								<span className="text-xs font-semibold text-muted-foreground">
									{symbol.slice(0, 2).toUpperCase()}
								</span>
							)}
						</div>
						Send {symbol}
					</DialogTitle>
					<DialogDescription>
						Transfer {symbol} to another Solana wallet.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3 py-1">
					{/* From: Wallet info */}
					<div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
						<span>From</span>
						<span className="font-medium text-foreground">
							{walletLabel}
						</span>
						<span>
							<MiddleTruncate text={activeAddress || ""} startChars={4} endChars={4} />
						</span>
					</div>

					{/* Recipient address */}
					<div className="space-y-1.5">
						<label
							htmlFor="send-recipient"
							className="text-sm font-medium"
						>
							Recipient
						</label>
						<Input
							id="send-recipient"
							type="text"
							placeholder="Enter recipient public key"
							value={toAddress}
							onChange={(e) => setToAddress(e.target.value.trim())}
							onBlur={() => setAddressTouched(true)}
							disabled={isPending || state === "success"}
							autoComplete="off"
							autoCorrect="off"
							spellCheck={false}
							data-1p-ignore
							data-lpignore="true"
							data-form-type="other"
						/>
						{showAddressError && (
							<p className="text-xs text-destructive">
								Invalid Solana address
							</p>
						)}
						{isSelfSend && (
							<p className="text-xs text-amber-500">
								This is your own wallet address
							</p>
						)}
					</div>

					{/* Amount */}
					<div className="space-y-1.5">
						<div className="flex items-center justify-between">
							<label
								htmlFor="send-amount"
								className="text-sm font-medium"
							>
								Amount
							</label>
							<span
								className={cn(
									"text-xs font-medium",
									hasInsufficientFunds
										? "text-destructive"
										: "text-muted-foreground",
								)}
							>
								Balance: {formattedBalance} {symbol}
							</span>
						</div>
						<div className="relative">
							<Input
								id="send-amount"
								type="number"
								placeholder="0.00"
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
								disabled={isPending || state === "success"}
								className="pr-24"
								min="0"
								step="any"
								autoComplete="off"
								data-1p-ignore
								data-lpignore="true"
							/>
							<div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
								<button
									type="button"
									onClick={handleMax}
									disabled={
										isPending ||
										state === "success" ||
										maxAmount <= 0
									}
									className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-40"
								>
									MAX
								</button>
								<span className="text-sm text-muted-foreground font-medium pointer-events-none">
									{symbol}
								</span>
							</div>
						</div>
						{asset === "sol" && isValidAmount && !hasInsufficientFunds && (
							<p className="text-xs text-muted-foreground">
								Leaving a small SOL balance for network fees.
							</p>
						)}
						{hasInsufficientFunds && (
							<p className="text-xs text-destructive">
								Insufficient balance
							</p>
						)}
					</div>

					{/* Warning */}
					{state === "idle" &&
						isValidAddress &&
						isValidAmount &&
						!hasInsufficientFunds &&
						!isSelfSend && (
							<div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
								<Icon
									name="triangle-exclamation"
									variant="regular"
									className="mt-0.5 shrink-0"
								/>
								<span>
									Transfers cannot be reversed. Double-check
									the wallet address.
								</span>
							</div>
						)}

					{/* Status Messages */}
					{state === "preparing" && (
						<StatusMessage
							icon={<LoadingSpinner size="sm" />}
							message="Preparing transaction..."
						/>
					)}
					{state === "signing" && (
						<StatusMessage
							icon={<LoadingSpinner size="sm" />}
							message="Please sign the transaction in your wallet..."
						/>
					)}
					{state === "confirming" && (
						<StatusMessage
							icon={<LoadingSpinner size="sm" />}
							message="Submitting transaction..."
						/>
					)}
					{state === "success" && (
						<StatusMessage
							icon={
								<Icon
									name="circle-check"
									className="text-green-500"
								/>
							}
							message={`Sent ${amount} ${symbol}!`}
						/>
					)}
					{state === "failed" && (
						<StatusMessage
							icon={
								<Icon
									name="circle-xmark"
									className="text-destructive"
								/>
							}
							message="Send failed. Please try again."
						/>
					)}
				</div>

				<DialogFooter>
					<Button
						variant="ghost"
						onClick={() => handleClose(false)}
						disabled={isPending}
					>
						Cancel
					</Button>

					{!hasWallet ? (
						<Button
							onClick={() =>
								connectWallet({
									walletChainType: "solana-only",
								})
							}
							className="gap-2 flex-1"
						>
							Connect Wallet
						</Button>
					) : (
						<Button
							onClick={handleSend}
							disabled={
								!canSend ||
								isPending ||
								state === "success"
							}
							className="gap-2 flex-1"
						>
							{isPending ? (
								<>
									<LoadingSpinner size="sm" />
									Sending...
								</>
							) : (
								"Send"
							)}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function StatusMessage({
	icon,
	message,
}: {
	icon: React.ReactNode;
	message: string;
}) {
	return (
		<div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
			{icon}
			<span>{message}</span>
		</div>
	);
}
