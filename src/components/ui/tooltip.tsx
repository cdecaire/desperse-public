import * as React from "react"
import {
	Tooltip as SableTooltip,
	TooltipContent as SableTooltipContent,
	TooltipProvider as SableTooltipProvider,
	TooltipTrigger as SableTooltipTrigger,
} from "@cdecaire/sable"
import { cn } from "@/lib/utils"

/**
 * Migration shim (Phase 2 — Sable adoption).
 *
 * The app's <Tooltip> keeps its LEGACY MONOLITHIC `content`-prop API while
 * rendering @cdecaire/sable's COMPOSITION underneath (Base UI Tooltip:
 * Provider → Root → Trigger → Portal/Positioner/Popup). Hover/focus open,
 * ARIA wiring, and collision-aware positioning all come from Base UI.
 *
 * Legacy API (unchanged — all call sites compile as-is):
 *   - children: the trigger element (rendered via Base UI's `render` prop)
 *   - content:  the tooltip body (rendered as TooltipContent children)
 *   - className: forwarded to the popup surface
 *   - position: 'top' | 'bottom' → mapped to Sable's `side`
 *
 * Composition mapping (monolithic → Sable parts):
 *   <TooltipProvider>          // wrapped INTERNALLY so each tooltip works
 *     <Tooltip>                //   standalone; delay still groups correctly
 *       <TooltipTrigger render={children} />   // children → trigger host
 *       <TooltipContent side={position}>{content}</TooltipContent>
 *     </Tooltip>
 *   </TooltipProvider>
 *
 * Provider handling: Sable's TooltipProvider only shares open/close DELAYS
 * across a group; a tooltip works fine without one. We wrap each shim in its
 * own Provider so a standalone <Tooltip> still behaves correctly even when no
 * app-level provider exists. (If an ancestor Provider is added later, nesting
 * is harmless — the nearest one wins for this tooltip's delay.)
 *
 * Trigger wrapping: Base UI's Trigger uses `render` to adopt a child element
 * as the anchor host (merging trigger props + ARIA onto it). `children` at
 * every call site is a single element (label/span/img/Button), so it maps
 * directly. As a safety net, non-element children are wrapped in an
 * inline-flex <span> so the trigger always has a valid host element.
 *
 * Ref gotcha (see button.tsx / popover.tsx): forwardRef → Sable needs the
 * ref cast `ref as React.ComponentProps<typeof SableTooltipTrigger>["ref"]`.
 */

// Legacy vertical `position` → Base UI positioner `side`.
const POSITION_TO_SIDE = {
	top: "top",
	bottom: "bottom",
} as const

interface TooltipProps {
	children: React.ReactNode
	content: React.ReactNode
	className?: string
	/** Preferred position of the tooltip relative to the trigger (auto-flips on collision). */
	position?: "top" | "bottom"
}

export const Tooltip = React.forwardRef<
	React.ComponentRef<typeof SableTooltipTrigger>,
	TooltipProps
>(({ children, content, className, position = "top" }, ref) => {
	const side = POSITION_TO_SIDE[position] ?? "top"

	// children → trigger host. Use the child element directly via `render`;
	// wrap anything that isn't a single valid element in a <span> so Base UI
	// always has a concrete element to anchor + wire ARIA onto.
	const triggerElement = React.isValidElement(children) ? (
		children
	) : (
		<span className="inline-flex items-center">{children}</span>
	)

	return (
		<SableTooltipProvider>
			<SableTooltip>
				<SableTooltipTrigger
					ref={ref as React.ComponentProps<typeof SableTooltipTrigger>["ref"]}
					render={triggerElement as React.ReactElement}
				/>
				<SableTooltipContent side={side} className={cn(className)}>
					{content}
				</SableTooltipContent>
			</SableTooltip>
		</SableTooltipProvider>
	)
})
Tooltip.displayName = "Tooltip"
