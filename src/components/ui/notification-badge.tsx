import * as React from "react"
import { NotificationBadge as SableNotificationBadge } from "@cdecaire/sable"
import { cva, type VariantProps } from "class-variance-authority"

const TONE_MAP = {
	default: "primary",
	destructive: "destructive",
} as const

const SIZE_MAP = {
	default: "lg",
	sm: "sm",
	dot: "lg",
} as const

// Preserved for backward compatibility with legacy callers that import the cva.
const notificationBadgeVariants = cva(
	"flex items-center justify-center rounded-full font-semibold",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground",
				destructive: "bg-destructive text-destructive-foreground",
			},
			size: {
				default: "min-w-[20px] h-5 px-1.5 text-xs",
				sm: "min-w-[16px] h-4 px-1 text-[10px]",
				dot: "w-2.5 h-2.5",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
)

interface NotificationBadgeProps
	extends React.HTMLAttributes<HTMLSpanElement>,
		VariantProps<typeof notificationBadgeVariants> {
	count?: number
	max?: number
}

function NotificationBadge({
	className,
	variant,
	size,
	count,
	max = 99,
	...props
}: NotificationBadgeProps) {
	const tone = TONE_MAP[variant ?? "default"]

	if (size === "dot") {
		return (
			<SableNotificationBadge
				data-slot="notification-badge"
				dot
				tone={tone}
				size={SIZE_MAP.dot}
				className={className}
				{...props}
			/>
		)
	}

	return (
		<SableNotificationBadge
			data-slot="notification-badge"
			count={count}
			max={max}
			tone={tone}
			size={SIZE_MAP[size ?? "default"]}
			className={className}
			{...props}
		/>
	)
}

export { NotificationBadge, notificationBadgeVariants }
