import * as React from "react"
import { Toggle as SableToggle } from "@cdecaire/sable"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Migration shim (Phase 2 — Sable adoption).
 *
 * The app's <Toggle> now renders @cdecaire/sable's Toggle (Base UI Toggle +
 * the motion-interactive/motion-press recipes) while keeping the LEGACY shadcn
 * API so existing call sites don't change:
 *   - variant: default | outline
 *   - size:    default | sm | lg
 *
 * Name/state adaptations (Radix → Base UI):
 *   - Radix `TogglePrimitive.Root` → Sable `Toggle` (Base UI Toggle)
 *   - pressed state attr `data-[state=on]` → `data-pressed`
 *
 * `toggleVariants` is preserved (toggle-group.tsx composes it onto the grouped
 * items, exactly like button.tsx keeps `buttonVariants` for calendar.tsx). The
 * cva mirrors the legacy shadcn classes but with the pressed selector adapted
 * to `data-[pressed]` so the styling lands on Base UI's emitted attribute.
 */

// Preserved for backward-compat: toggle-group.tsx imports toggleVariants and
// composes it onto its items. State selector adapted Radix → Base UI:
// `data-[state=on]` → `data-[pressed]`.
const toggleVariants = cva(
	"inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium hover:bg-muted hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 data-[pressed]:bg-accent data-[pressed]:text-accent-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none transition-[color,box-shadow] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap",
	{
		variants: {
			variant: {
				default: "bg-transparent",
				outline:
					"border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground",
			},
			size: {
				default: "h-9 px-2 min-w-9",
				sm: "h-8 px-1.5 min-w-8",
				lg: "h-10 px-2.5 min-w-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
)

type ToggleProps = React.ComponentProps<typeof SableToggle> &
	VariantProps<typeof toggleVariants>

function Toggle({ className, variant, size, ...props }: ToggleProps) {
	return (
		<SableToggle
			data-slot="toggle"
			className={cn(toggleVariants({ variant, size, className }))}
			{...props}
		/>
	)
}
Toggle.displayName = "Toggle"

export { Toggle, toggleVariants }
