import * as React from "react"
import {
	Dialog as SableDialog,
	DialogClose as SableDialogClose,
	DialogContent as SableDialogContent,
	DialogDescription as SableDialogDescription,
	DialogFooter as SableDialogFooter,
	DialogHeader as SableDialogHeader,
	DialogOverlay as SableDialogOverlay,
	DialogPortal as SableDialogPortal,
	DialogTitle as SableDialogTitle,
	DialogTrigger as SableDialogTrigger,
} from "@cdecaire/sable"

/**
 * Compatibility wrapper over Sable's Dialog family.
 *
 * Keeps Radix-style `asChild` call sites working by translating them to Base UI's
 * `render` prop, and preserves Desperse's default visible close button by
 * passing `showCloseButton` through to Sable 0.24 DialogContent.
 */

const Dialog = SableDialog
const DialogPortal = SableDialogPortal
const DialogOverlay = SableDialogOverlay

const DialogTrigger = React.forwardRef<
	React.ComponentRef<typeof SableDialogTrigger>,
	React.ComponentPropsWithoutRef<typeof SableDialogTrigger> & {
		asChild?: boolean
	}
>(({ asChild = false, children, ...props }, ref) => {
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
	showCloseButton?: boolean
}

const DialogContent = React.forwardRef<
	React.ComponentRef<typeof SableDialogContent>,
	DialogContentProps
>(({ className, children, showCloseButton = true, ...props }, ref) => (
	<SableDialogContent
		ref={ref as React.ComponentProps<typeof SableDialogContent>["ref"]}
		className={className}
		showCloseButton={showCloseButton}
		{...props}
	>
		{children}
	</SableDialogContent>
))
DialogContent.displayName = "DialogContent"

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
