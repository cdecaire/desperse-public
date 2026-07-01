import * as React from "react"
import {
	Menu as SableMenu,
	MenuContent as SableMenuContent,
	MenuGroup as SableMenuGroup,
	MenuGroupLabel as SableMenuGroupLabel,
	MenuItem as SableMenuItem,
	MenuPortal as SableMenuPortal,
	MenuSeparator as SableMenuSeparator,
	MenuTrigger as SableMenuTrigger,
} from "@cdecaire/sable"
import { cn } from "@/lib/utils"

/**
 * Migration shim (Phase 2 — Sable adoption).
 *
 * The app's <DropdownMenu*> now render @cdecaire/sable's Menu (Base UI
 * `Menu.Root` + `Trigger`/`Positioner`/`Popup`/`Item`/`Separator`/`Group`,
 * motion-pop + motion-interactive recipes) while keeping the LEGACY Radix-shaped
 * `DropdownMenu*` API so existing call sites don't change.
 *
 * Name mapping (Radix DropdownMenu → Sable Menu):
 *   DropdownMenu          → Menu          (Base.Root; `modal` passes through)
 *   DropdownMenuTrigger   → MenuTrigger   (Base.Trigger; asChild → render)
 *   DropdownMenuContent   → MenuContent   (Portal + Positioner + Popup, one elem)
 *   DropdownMenuItem      → MenuItem      (Base.Item; asChild → render, inset)
 *   DropdownMenuLabel     → MenuGroupLabel(Base.GroupLabel; inset)
 *   DropdownMenuSeparator → MenuSeparator (Base.Separator)
 *   DropdownMenuGroup     → MenuGroup     (Base.Group)
 *   DropdownMenuPortal    → MenuPortal    (Base.Portal)
 *
 * Adaptations:
 *   - asChild (Radix Slot) → Base UI `render` prop on Trigger AND Item. Three
 *     item call sites wrap <Link>/<a> via `asChild`; Base UI merges its item
 *     props onto the rendered element and preserves its children.
 *   - `inset` (Radix-only on Item/Label) is preserved by emulating Radix's
 *     left-pad (`pl-8`) via className, since Sable/Base UI has no inset prop.
 *   - `align` / `side` / `sideOffset` on Content map 1:1 onto Sable's
 *     MenuContent (Base UI positioner props). Legacy default align="end" used by
 *     every call site is forwarded straight through.
 *   - `modal` on the root passes through to Base UI's `Menu.Root`.
 *
 * Omitted Radix parts (CheckboxItem / RadioItem / Sub* / RadioGroup): NOT
 * exported by the legacy shim and NOT used by any call site, so nothing to map.
 */

const DropdownMenu = SableMenu

const DropdownMenuGroup = SableMenuGroup

const DropdownMenuPortal = SableMenuPortal

const DropdownMenuTrigger = React.forwardRef<
	React.ComponentRef<typeof SableMenuTrigger>,
	React.ComponentPropsWithoutRef<typeof SableMenuTrigger> & {
		asChild?: boolean
	}
>(({ asChild = false, children, ...props }, ref) => {
	// asChild (Radix Slot) → Base UI render prop: render the provided child
	// element as the trigger host (Base UI merges trigger props, keeps children).
	if (asChild && React.isValidElement(children)) {
		return <SableMenuTrigger ref={ref as React.ComponentProps<typeof SableMenuTrigger>["ref"]} render={children} {...props} />
	}
	return (
		<SableMenuTrigger ref={ref as React.ComponentProps<typeof SableMenuTrigger>["ref"]} {...props}>
			{children}
		</SableMenuTrigger>
	)
})
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

type DropdownMenuContentProps = React.ComponentPropsWithoutRef<
	typeof SableMenuContent
>

const DropdownMenuContent = React.forwardRef<
	React.ComponentRef<typeof SableMenuContent>,
	DropdownMenuContentProps
>(({ className, sideOffset = 4, ...props }, ref) => (
	<SableMenuContent
		ref={ref}
		sideOffset={sideOffset}
		className={cn("min-w-[8rem] rounded-xl p-1", className)}
		{...props}
	/>
))
DropdownMenuContent.displayName = "DropdownMenuContent"

const DropdownMenuItem = React.forwardRef<
	React.ComponentRef<typeof SableMenuItem>,
	React.ComponentPropsWithoutRef<typeof SableMenuItem> & {
		asChild?: boolean
		/** Radix-only inset; emulated as left padding (Sable has no inset). */
		inset?: boolean
	}
>(({ className, asChild = false, inset, children, ...props }, ref) => {
	const itemClassName = cn(
		"cursor-pointer",
		inset && "pl-8",
		className,
	)
	// asChild (Radix Slot) → Base UI render prop: render the child element (e.g.
	// <Link>/<a>) as the item host, keeping its children.
	if (asChild && React.isValidElement(children)) {
		return (
			<SableMenuItem
				ref={ref}
				render={children}
				className={itemClassName}
				{...props}
			/>
		)
	}
	return (
		<SableMenuItem ref={ref} className={itemClassName} {...props}>
			{children}
		</SableMenuItem>
	)
})
DropdownMenuItem.displayName = "DropdownMenuItem"

const DropdownMenuLabel = React.forwardRef<
	React.ComponentRef<typeof SableMenuGroupLabel>,
	React.ComponentPropsWithoutRef<typeof SableMenuGroupLabel> & {
		/** Radix-only inset; emulated as left padding (Sable has no inset). */
		inset?: boolean
	}
>(({ className, inset, ...props }, ref) => (
	<SableMenuGroupLabel
		ref={ref}
		className={cn(inset && "pl-8", className)}
		{...props}
	/>
))
DropdownMenuLabel.displayName = "DropdownMenuLabel"

const DropdownMenuSeparator = React.forwardRef<
	React.ComponentRef<typeof SableMenuSeparator>,
	React.ComponentPropsWithoutRef<typeof SableMenuSeparator>
>(({ className, ...props }, ref) => (
	<SableMenuSeparator ref={ref} className={className} {...props} />
))
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

export {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuGroup,
	DropdownMenuPortal,
}
