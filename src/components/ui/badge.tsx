import * as React from "react"
import { Badge as SableBadge } from "@cdecaire/sable"
import { cva, type VariantProps } from "class-variance-authority"

const VARIANT_MAP = {
	default: "neutral",
	secondary: "neutral",
	destructive: "destructive",
	success: "success",
	warning: "warning",
	outline: "outline",
} as const

const SIZE_MAP = {
	default: "md",
	sm: "sm",
} as const

// Preserved for backward compatibility with legacy callers that import the cva.
const badgeVariants = cva("inline-flex items-center rounded-full font-medium", {
	variants: {
		variant: {
			default: "bg-primary/10 text-primary",
			secondary: "bg-muted text-muted-foreground",
			destructive: "bg-destructive/10 text-destructive",
			success: "bg-[var(--tone-standard)]/20 text-[var(--tone-standard)]",
			warning: "bg-[var(--tone-warning)]/20 text-[var(--tone-warning)]",
			outline: "bg-transparent border border-border text-foreground",
		},
		size: {
			default: "px-2.5 py-0.5 text-xs",
			sm: "px-2 py-0.5 text-[10px]",
		},
	},
	defaultVariants: {
		variant: "default",
		size: "default",
	},
})

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
	VariantProps<typeof badgeVariants>

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
	({ className, variant, size, ...props }, ref) => {
		const sableVariant = VARIANT_MAP[variant ?? "default"]
		const sableSize = SIZE_MAP[size ?? "default"]

		return (
			<SableBadge
				ref={ref}
				data-slot="badge"
				variant={sableVariant}
				size={sableSize}
				className={className}
				{...props}
			/>
		)
	},
)
Badge.displayName = "Badge"

export { Badge, badgeVariants }
