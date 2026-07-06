"use client"

import * as React from "react"
import {
	ToggleGroup as SableToggleGroup,
	ToggleGroupItem as SableToggleGroupItem,
} from "@cdecaire/sable"
import { type VariantProps } from "class-variance-authority"

import { toggleVariants } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

/**
 * Compatibility wrapper over Sable's ToggleGroup family.
 *
 * Sable 0.24 exports ToggleGroupItem as a shadcn/Radix-parity alias, so this
 * file only keeps Desperse's legacy spacing and segmented rounding classes.
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
}: React.ComponentProps<typeof SableToggleGroupItem> &
	VariantProps<typeof toggleVariants>) {
	const context = React.useContext(ToggleGroupContext)

	return (
		<SableToggleGroupItem
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
		</SableToggleGroupItem>
	)
}

export { ToggleGroup, ToggleGroupItem }
