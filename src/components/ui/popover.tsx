import * as React from "react"
import {
	Popover as SablePopover,
	PopoverContent as SablePopoverContent,
	PopoverTrigger as SablePopoverTrigger,
} from "@cdecaire/sable"
import { cn } from "@/lib/utils"

/**
 * Migration shim (Phase 2 — Sable adoption).
 *
 * The app's <Popover*> now render @cdecaire/sable's Popover (Base UI
 * `Popover.Root` + `Trigger`/`Positioner`/`Popup`, motion-pop recipe) while
 * keeping the LEGACY Radix-shaped API so existing call sites don't change:
 *   - Popover:        open / onOpenChange / modal (pass through to Base UI Root)
 *   - PopoverTrigger: asChild (Radix Slot) → converted to Sable's `render` prop
 *   - PopoverContent: className + positioning props (align / side / sideOffset)
 *
 * Name mapping (Radix → Sable):
 *   Popover          → Popover (Base.Root)
 *   PopoverTrigger   → PopoverTrigger (Base.Trigger)
 *   PopoverContent   → PopoverContent (Portal + Positioner + Popup, single elem)
 *
 * Positioning: Sable's PopoverContent already accepts `side` / `align` /
 * `sideOffset` (Base UI positioner props) — the legacy `align` / `sideOffset` /
 * `side` map 1:1, so we forward them straight through.
 *
 * PopoverAnchor: Sable has NO anchor part (Base UI anchors to the trigger).
 * The only call site (date-time-picker.tsx) does NOT use it, so the export is
 * kept as a minimal no-op passthrough purely so the name still resolves. If a
 * future call site actually needs anchored positioning, this must be revisited.
 */

const Popover = SablePopover

const PopoverTrigger = React.forwardRef<
	React.ComponentRef<typeof SablePopoverTrigger>,
	React.ComponentPropsWithoutRef<typeof SablePopoverTrigger> & {
		asChild?: boolean
	}
>(({ asChild = false, children, ...props }, ref) => {
	// asChild (Radix Slot) → Base UI render prop: render the provided child
	// element as the trigger host. Base UI merges its trigger props onto the
	// element and preserves the element's own children.
	if (asChild && React.isValidElement(children)) {
		return (
			<SablePopoverTrigger ref={ref as React.ComponentProps<typeof SablePopoverTrigger>["ref"]} render={children} {...props} />
		)
	}
	return (
		<SablePopoverTrigger ref={ref as React.ComponentProps<typeof SablePopoverTrigger>["ref"]} {...props}>
			{children}
		</SablePopoverTrigger>
	)
})
PopoverTrigger.displayName = "PopoverTrigger"

type PopoverContentProps = React.ComponentPropsWithoutRef<
	typeof SablePopoverContent
>

const PopoverContent = React.forwardRef<
	React.ComponentRef<typeof SablePopoverContent>,
	PopoverContentProps
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
	// Sable's PopoverContent maps align/side/sideOffset onto Base UI's positioner.
	// Reset Sable's fixed `w-72` to `w-auto` so legacy content (e.g. the calendar
	// popover) keeps sizing to its own contents.
	<SablePopoverContent
		ref={ref}
		align={align}
		sideOffset={sideOffset}
		className={cn("w-auto", className)}
		{...props}
	/>
))
PopoverContent.displayName = "PopoverContent"

/**
 * No-op passthrough for the legacy `PopoverAnchor` name. Sable/Base UI has no
 * anchor primitive; this exists only so the export resolves. Unused by current
 * call sites — renders children inline with no positioning behavior.
 */
function PopoverAnchor({ children }: { children?: React.ReactNode }) {
	return <>{children}</>
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
