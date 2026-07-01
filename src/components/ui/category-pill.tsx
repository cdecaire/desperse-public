/**
 * CategoryPill Component
 * Display and interact with post categories
 *
 * Usage examples:
 *
 * Display (read-only):
 *   <CategoryPill>Photography</CategoryPill>
 *
 * Link (with router Link):
 *   <CategoryPill variant="link" asChild>
 *     <Link to="/category/photography">Photography</Link>
 *   </CategoryPill>
 *
 * Interactive (selectable):
 *   <CategoryPill variant="interactive" selected={isSelected} onClick={toggle}>
 *     Photography
 *   </CategoryPill>
 *
 * Migration shim (Sable adoption).
 *
 * The app's <CategoryPill> keeps its LEGACY API (variant display|link|interactive,
 * size default|lg, selected, asChild, disabled) so call sites don't change.
 *
 * Sable's CategoryPill models ONLY the interactive selectable toggle (a native
 * <button> with a selected→primary fill) — it has no display/link variants, no
 * size, and no asChild/render escape hatch. So we render Sable's CategoryPill for
 * the `interactive` variant (its exact analog, passing selected/disabled through),
 * and keep the `display` / `link` / `asChild` branches on the preserved local
 * `categoryPillVariants` cva, since Sable has no equivalent for those surfaces.
 * `categoryPillVariants` is preserved (no external importer today, kept for API
 * stability and used by the non-interactive branches here).
 */

import * as React from "react"
import { CategoryPill as SableCategoryPill } from "@cdecaire/sable"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const categoryPillVariants = cva(
	"inline-flex items-center rounded-full font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
	{
		variants: {
			variant: {
				display: "bg-muted/30 text-muted-foreground/70",
				link: "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer",
				interactive:
					"border bg-muted/50 text-foreground border-border hover:bg-muted hover:border-muted-foreground/30",
			},
			size: {
				default: "px-2 py-0.5 text-xs",
				lg: "px-3 py-1.5 text-sm",
			},
			selected: {
				true: "",
				false: "",
			},
		},
		compoundVariants: [
			// Interactive + selected state
			{
				variant: "interactive",
				selected: true,
				className:
					"bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:border-primary",
			},
		],
		defaultVariants: {
			variant: "display",
			size: "default",
			selected: false,
		},
	}
)

type CategoryPillProps = React.HTMLAttributes<HTMLElement> &
	VariantProps<typeof categoryPillVariants> & {
		/** Render as a custom element using Slot (e.g., wrap a Link component) */
		asChild?: boolean
		/** Disabled state (only applies to interactive variant) */
		disabled?: boolean
	}

const CategoryPill = React.forwardRef<HTMLElement, CategoryPillProps>(
	(
		{
			className,
			variant,
			size,
			selected,
			asChild = false,
			disabled = false,
			...props
		},
		ref
	) => {
		const isInteractive = variant === "interactive"

		// asChild composition (e.g. router Link as a `link` pill). Sable's
		// CategoryPill is a native <button> with no render/asChild escape hatch,
		// so this stays on the local cva surface.
		if (asChild) {
			return (
				<Slot
					ref={ref as React.Ref<HTMLElement>}
					data-slot="category-pill"
					className={cn(
						categoryPillVariants({ variant, size, selected, className }),
						disabled && "opacity-50 cursor-not-allowed pointer-events-none"
					)}
					{...props}
				/>
			)
		}

		// Interactive selectable toggle → Sable's CategoryPill (its direct analog).
		// Sable carries the unselected/selected (primary fill) styling + motion;
		// size has no Sable token, so the `lg` padding/text is applied via class.
		if (isInteractive) {
			const sizeClass =
				size === "lg" ? "px-3 py-1.5 text-sm" : "px-2 py-0.5 text-xs"
			return (
				<SableCategoryPill
					ref={ref as React.Ref<HTMLButtonElement>}
					data-slot="category-pill"
					selected={selected ?? false}
					disabled={disabled}
					className={cn(
						sizeClass,
						disabled && "opacity-50 cursor-not-allowed",
						className
					)}
					{...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
				/>
			)
		}

		// display / link (non-interactive) — no Sable equivalent, stays on the cva.
		return (
			<span
				ref={ref as React.Ref<HTMLSpanElement>}
				data-slot="category-pill"
				className={cn(
					categoryPillVariants({ variant, size, selected, className }),
					disabled && "opacity-50"
				)}
				{...props}
			/>
		)
	}
)
CategoryPill.displayName = "CategoryPill"

export { CategoryPill, categoryPillVariants }
