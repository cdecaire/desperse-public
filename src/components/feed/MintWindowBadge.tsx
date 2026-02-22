/**
 * MintWindowBadge Component
 * Displays a live-updating countdown badge for timed editions.
 *
 * Phases:
 *   - scheduled:    "Starts in 2d 3h"  (muted styling)
 *   - active:       "Ends in 23h"      (accent styling)
 *   - ending_soon:  "45m left"         (amber/orange urgency)
 *   - ended:        "Ended"            (muted, dim)
 *   - none:         renders nothing
 */

import { useState, useEffect, useCallback, type ReactNode } from "react"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"
import {
	getMintWindowDisplayStatus,
	type MintWindowDisplayStatus,
} from "@/lib/countdown"

interface MintWindowBadgeProps {
	mintWindowStart: Date | string | null | undefined
	mintWindowEnd: Date | string | null | undefined
	/** Optional: show final mint count when ended */
	mintedCount?: number
	/** Compact variant for the PostCard header line */
	variant?: "compact" | "prominent" | "dark"
	/** Action button to render inside the dark variant */
	action?: ReactNode
	className?: string
}

/** Choose an interval that matches the precision we're showing. */
function tickInterval(status: MintWindowDisplayStatus): number {
	if (status.phase === "ending_soon") return 1_000 // every second
	if (status.phase === "active" || status.phase === "scheduled")
		return 30_000 // every 30 s
	return 0 // no ticking needed
}

export function MintWindowBadge({
	mintWindowStart,
	mintWindowEnd,
	mintedCount,
	variant = "compact",
	action,
	className,
}: MintWindowBadgeProps) {
	const compute = useCallback(
		() => getMintWindowDisplayStatus(mintWindowStart, mintWindowEnd),
		[mintWindowStart, mintWindowEnd],
	)

	const [status, setStatus] = useState<MintWindowDisplayStatus>(compute)

	useEffect(() => {
		// Recompute immediately when props change
		const next = compute()
		setStatus(next)

		const ms = tickInterval(next)
		if (ms === 0) return

		const id = setInterval(() => {
			setStatus(compute())
		}, ms)

		return () => clearInterval(id)
	}, [compute])

	if (status.phase === "none") return null

	if (variant === "dark") {
		return <DarkBadge status={status} mintedCount={mintedCount} action={action} className={className} />
	}

	if (variant === "prominent") {
		return <ProminentBadge status={status} mintedCount={mintedCount} className={className} />
	}

	// --- Compact variant (PostCard header) ---
	const badgeStyles: Record<string, string> = {
		scheduled: "text-muted-foreground",
		active: "text-emerald-500",
		ending_soon: "text-amber-500",
		ended: "text-muted-foreground/70",
	}

	const iconMap: Record<string, string> = {
		scheduled: "fa-regular fa-clock",
		active: "fa-regular fa-clock",
		ending_soon: "fa-solid fa-clock",
		ended: "fa-regular fa-clock",
	}

	return (
		<span
			className={cn(
				"flex items-center gap-1",
				badgeStyles[status.phase],
				className,
			)}
		>
			<Icon name={iconMap[status.phase]} className="text-[10px]" />
			<span>{status.label}</span>
			{status.phase === "ended" &&
				mintedCount !== undefined &&
				mintedCount > 0 && (
					<span className="ml-0.5">
						· {mintedCount} minted
					</span>
				)}
		</span>
	)
}

/** Status type excluding "none" (which is filtered before rendering). */
type ActiveMintWindowStatus = Exclude<MintWindowDisplayStatus, { phase: "none" }>

/** Prominent variant for the post detail page. */
function ProminentBadge({
	status,
	mintedCount,
	className,
}: {
	status: ActiveMintWindowStatus
	mintedCount?: number
	className?: string
}) {
	const containerStyles: Record<string, string> = {
		scheduled:
			"bg-muted/50 border-border text-muted-foreground",
		active:
			"bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
		ending_soon:
			"bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
		ended:
			"bg-muted/30 border-border text-muted-foreground",
	}

	const iconMap: Record<string, string> = {
		scheduled: "fa-regular fa-clock",
		active: "fa-regular fa-clock",
		ending_soon: "fa-solid fa-fire",
		ended: "fa-regular fa-circle-check",
	}

	// Build local time strings
	let timeDetail: string | null = null
	if (status.phase === "scheduled") {
		timeDetail = `Opens ${status.startsAt.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
	} else if (status.phase === "active" || status.phase === "ending_soon") {
		timeDetail = `Closes ${status.endsAt.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
	} else if (status.phase === "ended") {
		timeDetail = `Closed ${status.endedAt.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
	}

	return (
		<div
			className={cn(
				"flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
				containerStyles[status.phase],
				className,
			)}
		>
			<Icon name={iconMap[status.phase]} className="text-base" />
			<div className="flex flex-col">
				<span className="font-semibold leading-tight">
					{status.label}
					{status.phase === "ended" &&
						mintedCount !== undefined &&
						mintedCount > 0 && (
							<span className="font-normal ml-1">
								· {mintedCount} minted
							</span>
						)}
				</span>
				{timeDetail && (
					<span className="text-xs opacity-75 leading-tight">
						{timeDetail}
					</span>
				)}
			</div>
		</div>
	)
}

/** Dark variant: full-width CTA bar with countdown + action button. */
function DarkBadge({
	status,
	mintedCount,
	action,
	className,
}: {
	status: ActiveMintWindowStatus
	mintedCount?: number
	action?: ReactNode
	className?: string
}) {
	const dateOpts: Intl.DateTimeFormatOptions = {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}

	let timeDetail: string | null = null
	if (status.phase === "scheduled") {
		timeDetail = `Opens ${status.startsAt.toLocaleString(undefined, dateOpts)}`
	} else if (status.phase === "active" || status.phase === "ending_soon") {
		timeDetail = `Closes ${status.endsAt.toLocaleString(undefined, dateOpts)}`
	} else if (status.phase === "ended") {
		timeDetail =
			mintedCount !== undefined && mintedCount > 0
				? `${mintedCount} minted`
				: `Closed ${status.endedAt.toLocaleString(undefined, dateOpts)}`
	}

	const isEnded = status.phase === "ended"

	return (
		<div
			className={cn(
				"flex items-center justify-between rounded-2xl px-4 py-3",
				isEnded
					? "bg-muted text-foreground"
					: "bg-foreground text-background",
				className,
			)}
		>
			<div className="flex flex-col gap-1.5">
				<span className="font-bold text-xs leading-tight">
					{status.label}
				</span>
				{timeDetail && (
					<span className="font-semibold text-[10.5px] leading-tight opacity-75">
						{timeDetail}
					</span>
				)}
			</div>
			{action}
		</div>
	)
}
