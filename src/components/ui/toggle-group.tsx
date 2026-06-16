"use client"

import * as React from "react"
import {
	Toggle as SableToggle,
	ToggleGroup as SableToggleGroup,
} from "@cdecaire/sable"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { toggleVariants } from "@/components/ui/toggle"

/**
 * Migration shim (Phase 2 — Sable adoption).
 *
 * <ToggleGroup> now renders @cdecaire/sable's ToggleGroup (Base UI ToggleGroup)
 * and <ToggleGroupItem> renders Sable's Toggle (Base UI Toggle). In the Base UI
 * model a group's items ARE Toggles carrying a `value` — Sable does NOT export a
 * separate `ToggleGroupItem`, so the item is shimmed here as a themed Toggle.
 *
 * Name/state adaptations (Radix → Base UI):
 *   - Radix `ToggleGroupPrimitive.Root` → Sable `ToggleGroup`
 *   - Radix `ToggleGroupPrimitive.Item` → Sable `Toggle`
 *   - pressed state attr `data-[state=on]` → `data-pressed` (via toggleVariants)
 *
 * The legacy `spacing` prop + segmented-rounding logic is PRESERVED unchanged:
 * the `--gap` CSS var and the `data-spacing` / `data-variant` / `data-size`
 * attributes still drive the same Tailwind selectors (`data-[spacing=0]:...`,
 * `data-[spacing=default]:data-[variant=outline]:shadow-xs`). These resolve
 * identically on the Base UI host since they are app-defined data attributes,
 * not Radix internals. (Zero call sites today — effectively dead — but kept
 * fully wired for consistency.)
 */

const ToggleGroupContext = React.createContext<
	VariantProps<typeof toggleVariants> & {
		spacing?: number
	}
>({
	size: "default",
	variant: "default",
	spacing: 0,
})

function ToggleGroup({
	className,
	variant,
	size,
	spacing = 0,
	children,
	...props
}: React.ComponentProps<typeof SableToggleGroup> &
	VariantProps<typeof toggleVariants> & {
		spacing?: number
	}) {
	return (
		<SableToggleGroup
			data-slot="toggle-group"
			data-variant={variant}
			data-size={size}
			data-spacing={spacing}
			style={{ "--gap": spacing } as React.CSSProperties}
			className={cn(
				"group/toggle-group flex w-fit items-center gap-[--spacing(var(--gap))] rounded-md data-[spacing=default]:data-[variant=outline]:shadow-xs",
				className,
			)}
			{...props}
		>
			<ToggleGroupContext.Provider value={{ variant, size, spacing }}>
				{children}
			</ToggleGroupContext.Provider>
		</SableToggleGroup>
	)
}

function ToggleGroupItem({
	className,
	children,
	variant,
	size,
	...props
}: React.ComponentProps<typeof SableToggle> &
	VariantProps<typeof toggleVariants>) {
	const context = React.useContext(ToggleGroupContext)

	return (
		<SableToggle
			data-slot="toggle-group-item"
			data-variant={context.variant || variant}
			data-size={context.size || size}
			data-spacing={context.spacing}
			className={cn(
				toggleVariants({
					variant: context.variant || variant,
					size: context.size || size,
				}),
				"w-auto min-w-0 shrink-0 px-3 focus:z-10 focus-visible:z-10",
				"data-[spacing=0]:rounded-none data-[spacing=0]:shadow-none data-[spacing=0]:first:rounded-l-md data-[spacing=0]:last:rounded-r-md data-[spacing=0]:data-[variant=outline]:border-l-0 data-[spacing=0]:data-[variant=outline]:first:border-l",
				className,
			)}
			{...props}
		>
			{children}
		</SableToggle>
	)
}

export { ToggleGroup, ToggleGroupItem }
