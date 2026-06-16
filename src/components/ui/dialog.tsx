import * as React from "react"
import {
	Dialog as SableDialog,
	DialogClose as SableDialogClose,
	DialogContent as SableDialogContent,
	DialogDescription as SableDialogDescription,
	DialogFooter as SableDialogFooter,
	DialogHeader as SableDialogHeader,
	DialogPortal as SableDialogPortal,
	DialogTitle as SableDialogTitle,
	DialogTrigger as SableDialogTrigger,
} from "@cdecaire/sable"
import { Icon } from "@/components/ui/icon"

/**
 * Migration shim (Phase 2 — Sable adoption).
 *
 * The app's <Dialog*> now render @cdecaire/sable's Dialog (Base UI `Dialog.Root`
 * + `Trigger`/`Portal`/`Backdrop`/`Popup`/`Close`, motion-fade + motion-pop
 * recipes) while keeping the LEGACY Radix-shaped API so existing call sites don't
 * change.
 *
 * Name mapping (Radix Dialog → Sable Dialog):
 *   Dialog            → Dialog            (Base.Root; open / onOpenChange pass through)
 *   DialogTrigger     → DialogTrigger     (Base.Trigger; asChild → render)
 *   DialogClose       → DialogClose       (Base.Close; asChild → render)
 *   DialogPortal      → DialogPortal      (Base.Portal)
 *   DialogContent     → DialogContent     (Backdrop + Popup, single portal'd elem)
 *   DialogTitle       → DialogTitle       (Base.Title)
 *   DialogDescription → DialogDescription (Base.Description)
 *   DialogHeader      → DialogHeader      (styled <div>)
 *   DialogFooter      → DialogFooter      (styled <div>)
 *
 * Adaptations:
 *   - `showCloseButton` (legacy DialogContent prop, default `true`): Sable's
 *     DialogContent renders its OWN backdrop/portal but has NO built-in close
 *     button. We re-create it — a top-right <DialogClose> holding an
 *     <Icon name="xmark" /> — and render it only when `showCloseButton` is true.
 *     (The IconProvider is wired app-wide, so the icon renders.)
 *   - `asChild` (Radix Slot) → Base UI `render` prop on Trigger AND Close, via the
 *     forwardRef + ref-cast pattern (see popover.tsx). TipButton wraps an <a> via
 *     <Button asChild> inside a footer; no call site uses asChild on the Dialog
 *     parts themselves today, but the conversion is preserved for parity.
 *   - `className` on DialogContent is forwarded straight onto Sable's Popup
 *     surface, as are arbitrary DOM props (e.g. ModerationRowMenu passes
 *     `onClick` to stopPropagation).
 *
 * DialogOverlay: Sable/Base UI has NO overlay export — the backdrop is rendered
 * INTERNALLY by DialogContent. No current call site uses <DialogOverlay>
 * explicitly, so it is exported as a minimal no-op passthrough purely so the name
 * still resolves. If a future call site needs a standalone overlay, this must be
 * revisited (Base UI exposes `Dialog.Backdrop`, not re-exported by Sable).
 */

const Dialog = SableDialog

const DialogPortal = SableDialogPortal

const DialogTrigger = React.forwardRef<
	React.ComponentRef<typeof SableDialogTrigger>,
	React.ComponentPropsWithoutRef<typeof SableDialogTrigger> & {
		asChild?: boolean
	}
>(({ asChild = false, children, ...props }, ref) => {
	// asChild (Radix Slot) → Base UI render prop: render the provided child
	// element as the trigger host (Base UI merges trigger props, keeps children).
	if (asChild && React.isValidElement(children)) {
		return (
			<SableDialogTrigger
				ref={ref as React.ComponentProps<typeof SableDialogTrigger>["ref"]}
				render={children}
				{...props}
			/>
		)
	}
	return (
		<SableDialogTrigger
			ref={ref as React.ComponentProps<typeof SableDialogTrigger>["ref"]}
			{...props}
		>
			{children}
		</SableDialogTrigger>
	)
})
DialogTrigger.displayName = "DialogTrigger"

const DialogClose = React.forwardRef<
	React.ComponentRef<typeof SableDialogClose>,
	React.ComponentPropsWithoutRef<typeof SableDialogClose> & {
		asChild?: boolean
	}
>(({ asChild = false, children, ...props }, ref) => {
	// asChild (Radix Slot) → Base UI render prop: render the provided child
	// element as the close host (Base UI merges close props, keeps children).
	if (asChild && React.isValidElement(children)) {
		return (
			<SableDialogClose
				ref={ref as React.ComponentProps<typeof SableDialogClose>["ref"]}
				render={children}
				{...props}
			/>
		)
	}
	return (
		<SableDialogClose
			ref={ref as React.ComponentProps<typeof SableDialogClose>["ref"]}
			{...props}
		>
			{children}
		</SableDialogClose>
	)
})
DialogClose.displayName = "DialogClose"

type DialogContentProps = React.ComponentPropsWithoutRef<
	typeof SableDialogContent
> & {
	/** Legacy shadcn prop: render the built-in top-right close button. */
	showCloseButton?: boolean
}

const DialogContent = React.forwardRef<
	React.ComponentRef<typeof SableDialogContent>,
	DialogContentProps
>(({ className, children, showCloseButton = true, ...props }, ref) => (
	// Sable's DialogContent renders the backdrop + portal + centered popup itself.
	// We forward className (and arbitrary DOM props) onto its Popup surface, then
	// re-create the legacy top-right close button when requested.
	<SableDialogContent
		ref={ref as React.ComponentProps<typeof SableDialogContent>["ref"]}
		className={className}
		{...props}
	>
		{children}
		{showCloseButton && (
			<DialogClose
				className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none"
				aria-label="Close"
			>
				<Icon name="xmark" />
			</DialogClose>
		)}
	</SableDialogContent>
))
DialogContent.displayName = "DialogContent"

/**
 * No-op passthrough for the legacy `DialogOverlay` name. Sable/Base UI has no
 * overlay primitive (the backdrop is rendered inside DialogContent); this exists
 * only so the export resolves. Unused by current call sites — renders nothing.
 */
function DialogOverlay(
	_props: React.ComponentProps<"div">,
): React.ReactElement | null {
	return null
}

const DialogHeader = SableDialogHeader

const DialogFooter = SableDialogFooter

const DialogTitle = SableDialogTitle

const DialogDescription = SableDialogDescription

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
}
