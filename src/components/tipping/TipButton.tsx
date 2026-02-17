/**
 * TipButton Component
 * Renders a tip icon button that opens a dialog for sending SKR tips.
 * Used on creator profiles and in the message unlock card.
 */

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { SeekerIcon } from "@/components/tipping/SeekerIcon";
import { useTip } from "@/hooks/useTip";
import { useSkrBalance } from "@/hooks/useSkrBalance";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { SKR_MINT } from "@/constants/tokens";
import { cn } from "@/lib/utils";

/** Jupiter swap URL for acquiring SKR */
const JUPITER_SWAP_URL = `https://jup.ag/swap/SOL-${SKR_MINT}`;

const PRESET_AMOUNTS = [50, 100, 250, 500];

interface TipButtonProps {
	/** Target creator's user ID */
	creatorId: string;
	/** Creator display name (for dialog text) */
	creatorName: string;
	/** Creator avatar URL */
	creatorAvatarUrl?: string | null;
	/** Button variant */
	variant?: "ghost" | "outline" | "default";
	/** Button size */
	size?: "icon" | "default" | "cta";
	/** Show only icon (no label) */
	iconOnly?: boolean;
	/** Context for the tip */
	context?: "profile" | "message_unlock";
	/** Pre-filled amount (e.g. for message unlock) */
	defaultAmount?: number;
	/** Called after successful tip */
	onSuccess?: () => void;
	/** Additional class names */
	className?: string;
}

export function TipButton({
	creatorId,
	creatorName,
	creatorAvatarUrl,
	variant = "ghost",
	size = "icon",
	iconOnly = true,
	context = "profile",
	defaultAmount,
	onSuccess,
	className,
}: TipButtonProps) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button
				variant={variant}
				size={size}
				onClick={() => setOpen(true)}
				aria-label={`Tip ${creatorName}`}
				className={className}
			>
				<SeekerIcon className="w-4 h-4" />
				{!iconOnly && <span className="ml-1.5">Tip</span>}
			</Button>

			<TipDialog
				open={open}
				onOpenChange={setOpen}
				creatorId={creatorId}
				creatorName={creatorName}
				creatorAvatarUrl={creatorAvatarUrl}
				context={context}
				defaultAmount={defaultAmount}
				onSuccess={onSuccess}
			/>
		</>
	);
}

interface TipDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	creatorId: string;
	creatorName: string;
	creatorAvatarUrl?: string | null;
	context: "profile" | "message_unlock";
	defaultAmount?: number;
	onSuccess?: () => void;
}

export function TipDialog({
	open,
	onOpenChange,
	creatorId,
	creatorName,
	creatorAvatarUrl,
	context,
	defaultAmount,
	onSuccess,
}: TipDialogProps) {
	const [amount, setAmount] = useState<string>(
		defaultAmount ? String(defaultAmount) : "",
	);
	const [showCustom, setShowCustom] = useState(false);
	const { state, sendTip, reset } = useTip();
	const { activeAddress } = useActiveWallet();
	const { balance: skrBalance, isLoading: isBalanceLoading } =
		useSkrBalance(open ? activeAddress : null); // Only fetch when dialog is open

	const parsedAmount = Number.parseFloat(amount);
	const isValidAmount =
		!Number.isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= 10000;
	const hasInsufficientFunds =
		isValidAmount && !isBalanceLoading && parsedAmount > skrBalance;

	const handleSend = useCallback(async () => {
		if (!isValidAmount || hasInsufficientFunds) return;

		await sendTip({
			toUserId: creatorId,
			amount: parsedAmount,
			context,
			onSuccess: () => {
				onSuccess?.();
				// Close dialog after a short delay on success
				setTimeout(() => {
					onOpenChange(false);
					reset();
					setAmount(defaultAmount ? String(defaultAmount) : "");
					setShowCustom(false);
				}, 1500);
			},
		});
	}, [
		isValidAmount,
		hasInsufficientFunds,
		parsedAmount,
		creatorId,
		context,
		sendTip,
		onSuccess,
		onOpenChange,
		reset,
		defaultAmount,
	]);

	const handleClose = useCallback(
		(isOpen: boolean) => {
			if (!isOpen && state !== "signing" && state !== "confirming") {
				onOpenChange(false);
				// Reset state when closing
				setTimeout(() => {
					reset();
					setAmount(defaultAmount ? String(defaultAmount) : "");
					setShowCustom(false);
				}, 200);
			}
		},
		[state, onOpenChange, reset, defaultAmount],
	);

	const isPending =
		state === "preparing" || state === "signing" || state === "confirming";

	/** Format the balance for display (max 4 decimal places, trim trailing zeros) */
	const formattedBalance = useMemo(() => {
		if (isBalanceLoading) return "...";
		return skrBalance.toLocaleString(undefined, {
			minimumFractionDigits: 0,
			maximumFractionDigits: 4,
		});
	}, [skrBalance, isBalanceLoading]);

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<div className="flex items-center -space-x-1.5 shrink-0">
							{/* Seeker token - themed: dark bg in light mode, light bg in dark mode */}
							<div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center">
								<SeekerIcon className="w-4 h-4 text-background" />
							</div>
							{/* Creator avatar - same size, slight horizontal overlap, on top */}
							<div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-background bg-muted z-1">
								{creatorAvatarUrl ? (
									<img
										src={creatorAvatarUrl}
										alt={creatorName}
										className="w-full h-full object-cover"
									/>
								) : (
									<div className="w-full h-full flex items-center justify-center">
										<i className="fa-solid fa-user text-xs text-muted-foreground" aria-hidden="true" />
									</div>
								)}
							</div>
						</div>
						{context === "message_unlock"
							? "Tip to Unlock Messaging"
							: `Tip ${creatorName}`}
					</DialogTitle>
					<DialogDescription>
						{context === "message_unlock"
							? `Send a Seeker tip to unlock messaging with ${creatorName}.`
							: `Send Seeker tokens to show your appreciation for ${creatorName.split(" ")[0]}'s work.`}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3 py-1">
					{/* Section Header: Choose Amount + Balance */}
					<div className="flex items-center justify-between">
						<span className="text-xs font-medium tracking-wide text-muted-foreground">
							Choose Amount
						</span>
						<span
							className={cn(
								"text-xs font-medium",
								hasInsufficientFunds
									? "text-destructive"
									: "text-muted-foreground",
							)}
						>
							Balance: {formattedBalance} SKR
						</span>
					</div>

					{showCustom ? (
						/* Custom Amount Input */
						<div className="space-y-2">
							<div className="relative">
								<Input
									type="number"
									placeholder="Enter amount"
									value={amount}
									onChange={(e) => setAmount(e.target.value)}
									disabled={isPending}
									className="pr-12"
									autoFocus
								/>
								<span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium pointer-events-none">
									SKR
								</span>
							</div>
							<button
								type="button"
								onClick={() => {
									setShowCustom(false);
									setAmount("");
								}}
								disabled={isPending}
								className="text-xs text-muted-foreground hover:text-foreground transition-colors"
							>
								<i className="fa-regular fa-arrow-left mr-1" aria-hidden="true" />
								Back to presets
							</button>
						</div>
					) : (
						/* Preset Amounts + Custom toggle */
						<div className="space-y-2">
							<div className="flex gap-2">
								{PRESET_AMOUNTS.map((preset) => {
									const cantAfford =
										!isBalanceLoading &&
										preset > skrBalance;
									const isSelected =
										amount === String(preset);
									return (
										<button
											key={preset}
											type="button"
											onClick={() =>
												setAmount(String(preset))
											}
											disabled={isPending}
											className={cn(
												"flex-1 rounded-full border px-3 py-2 text-sm font-medium transition-colors",
												isSelected
													? "border-foreground bg-foreground text-background"
													: "border-input bg-background hover:bg-accent hover:text-accent-foreground",
												cantAfford &&
													!isSelected &&
													"opacity-40",
												isPending &&
													"opacity-50 cursor-not-allowed",
											)}
										>
											{preset}
										</button>
									);
								})}
							</div>
							<button
								type="button"
								onClick={() => {
									setShowCustom(true);
									setAmount("");
								}}
								disabled={isPending}
								className="text-xs text-muted-foreground hover:text-foreground transition-colors"
							>
								Custom amount
							</button>
						</div>
					)}

					{/* Insufficient funds warning */}
					{hasInsufficientFunds && state === "idle" && (
						<div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
							<i className="fa-regular fa-triangle-exclamation" />
							<span>
								Insufficient balance. You need{" "}
								{(parsedAmount - skrBalance).toLocaleString(
									undefined,
									{
										minimumFractionDigits: 0,
										maximumFractionDigits: 4,
									},
								)}{" "}
								more SKR.
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
							message="Confirming on-chain..."
						/>
					)}
					{state === "success" && (
						<StatusMessage
							icon={
								<i className="fa-solid fa-circle-check text-green-500" />
							}
							message={`Successfully sent ${amount} SKR!`}
						/>
					)}
					{state === "failed" && (
						<StatusMessage
							icon={
								<i className="fa-solid fa-circle-xmark text-destructive" />
							}
							message="Tip failed. Please try again."
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

					{hasInsufficientFunds && !isPending ? (
						<Button
							asChild
							className="gap-2 flex-1"
						>
							<a
								href={JUPITER_SWAP_URL}
								target="_blank"
								rel="noopener noreferrer"
							>
								<i className="fa-regular fa-arrow-up-right-from-square text-xs" />
								Get SKR
							</a>
						</Button>
					) : (
						<Button
							onClick={handleSend}
							disabled={
								!isValidAmount ||
								isPending ||
								state === "success" ||
								hasInsufficientFunds
							}
							className="gap-2 flex-1"
						>
							{isPending ? (
								<>
									<LoadingSpinner size="sm" />
									Sending...
								</>
							) : (
								<>Send Tip</>
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
