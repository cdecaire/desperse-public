import * as React from "react"
import {
	Sheet as SableSheet,
	SheetClose as SableSheetClose,
	SheetContent as SableSheetContent,
	SheetDescription as SableSheetDescription,
	SheetFooter as SableSheetFooter,
	SheetHeader as SableSheetHeader,
	SheetTitle as SableSheetTitle,
	SheetTrigger as SableSheetTrigger,
} from "@cdecaire/sable"

/**
 * Migration shim (Phase 2 — Sable adoption).
 *
 * The app's <Sheet> family now renders @cdecaire/sable's Sheet (Base UI Dialog
 * popup + the `sheetVariants` recipe) while keeping the LEGACY shadcn/Radix API
 * so existing call sites don't change:
 *   - <Sheet open onOpenChange> — Base UI Dialog accepts these directly.
 *   - <SheetTrigger asChild> — Radix Slot semantics → converted to Base UI's
 *     `render` prop below.
 *   - <SheetContent side="top|right|bottom|left" showClose className>.
 *
 * Adaptations / what was DROPPED:
 *   - Removed the bespoke MutationObserver scrollbar-compensation effect
 *     (manual `document.body.style.paddingRight`). Base UI's Dialog owns scroll
 *     lock + scrollbar-width compensation, so the hack is redundant and was a
 *     source of layout jank. No call site depended on it directly.
 *   - `showClose` is preserved: when true (default) we render an absolutely-
 *     positioned <SheetClose> with an X, matching the legacy close affordance.
 *     All three live call sites pass `showClose={false}`, so this only affects
 *     future callers, but the prop + behavior are intact.
 *   - Sable's SheetContent owns the portal + backdrop internally, so the legacy
 *     SheetPortal / SheetOverlay wrappers are no longer needed. SheetPortal is
 *     still exported (mapped through) for any stray import; SheetOverlay is not
 *     re-exported (it was never imported by app code).
 *
 * Side mapping: Desperse and Sable both use the literal "top" | "right" |
 * "bottom" | "left" — Sable feeds it straight into `sheetVariants({ side })`,
 * so the prop passes through unchanged.
 */

function Sheet({
	...props
}: React.ComponentProps<typeof SableSheet>) {
	return <SableSheet {...props} />
}

// Base UI replaces Radix `asChild` with a `render` prop. Convert when asChild is
// set so the trigger renders the provided child element as the host node.
function SheetTrigger({
	asChild = false,
	children,
	...props
}: Omit<React.ComponentProps<typeof SableSheetTrigger>, "render"> & {
	asChild?: boolean
}) {
	if (asChild && React.isValidElement(children)) {
		return (
			<SableSheetTrigger
				data-slot="sheet-trigger"
				render={children as React.ReactElement<Record<string, unknown>>}
				{...props}
			/>
		)
	}
	return (
		<SableSheetTrigger data-slot="sheet-trigger" {...props}>
			{children}
		</SableSheetTrigger>
	)
}

function SheetClose({
	asChild = false,
	children,
	...props
}: Omit<React.ComponentProps<typeof SableSheetClose>, "render"> & {
	asChild?: boolean
}) {
	if (asChild && React.isValidElement(children)) {
		return (
			<SableSheetClose
				data-slot="sheet-close"
				render={children as React.ReactElement<Record<string, unknown>>}
				{...props}
			/>
		)
	}
	return (
		<SableSheetClose data-slot="sheet-close" {...props}>
			{children}
		</SableSheetClose>
	)
}

function SheetContent({
	className,
	children,
	side = "right",
	showClose = true,
	...props
}: Omit<React.ComponentProps<typeof SableSheetContent>, "side"> & {
	side?: "top" | "right" | "bottom" | "left"
	showClose?: boolean
}) {
	return (
		<SableSheetContent
			data-slot="sheet-content"
			side={side}
			className={className}
			{...props}
		>
			{children}
			{showClose && (
				<SableSheetClose
					data-slot="sheet-close"
					className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none"
				>
					<i className="fa-regular fa-xmark text-sm" />
					<span className="sr-only">Close</span>
				</SableSheetClose>
			)}
		</SableSheetContent>
	)
}

// Sable's SheetContent owns the portal/backdrop. SheetPortal is kept as a
// passthrough alias for backward-compat with any stray imports.
const SheetPortal = SableSheet

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<SableSheetHeader
			data-slot="sheet-header"
			className={className}
			{...props}
		/>
	)
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<SableSheetFooter
			data-slot="sheet-footer"
			className={className}
			{...props}
		/>
	)
}

function SheetTitle({
	className,
	...props
}: React.ComponentProps<typeof SableSheetTitle>) {
	return (
		<SableSheetTitle
			data-slot="sheet-title"
			className={className}
			{...props}
		/>
	)
}

function SheetDescription({
	className,
	...props
}: React.ComponentProps<typeof SableSheetDescription>) {
	return (
		<SableSheetDescription
			data-slot="sheet-description"
			className={className}
			{...props}
		/>
	)
}

export {
	Sheet,
	SheetTrigger,
	SheetClose,
	SheetPortal,
	SheetContent,
	SheetHeader,
	SheetFooter,
	SheetTitle,
	SheetDescription,
}
