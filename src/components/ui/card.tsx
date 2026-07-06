import * as React from "react"
import {
	Card as SableCard,
	CardAction as SableCardAction,
	CardContent as SableCardContent,
	CardDescription as SableCardDescription,
	CardFooter as SableCardFooter,
	CardHeader as SableCardHeader,
	CardTitle as SableCardTitle,
	type CardProps as SableCardProps,
} from "@cdecaire/sable"

/**
 * Compatibility wrapper over Sable's Card family.
 *
 * Desperse keeps the legacy shadcn import surface and `data-slot` attributes,
 * while Sable owns the rendered card parts, including CardAction in 0.24.
 */

type CardProps = SableCardProps

function Card({ className, ...props }: CardProps) {
	return <SableCard data-slot="card" className={className} {...props} />
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<SableCardHeader data-slot="card-header" className={className} {...props} />
	)
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<SableCardTitle data-slot="card-title" className={className} {...props} />
	)
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<SableCardDescription
			data-slot="card-description"
			className={className}
			{...props}
		/>
	)
}

function CardAction({
	className,
	...props
}: React.ComponentProps<typeof SableCardAction>) {
	return (
		<SableCardAction
			data-slot="card-action"
			className={className}
			{...props}
		/>
	)
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<SableCardContent
			data-slot="card-content"
			className={className}
			{...props}
		/>
	)
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<SableCardFooter data-slot="card-footer" className={className} {...props} />
	)
}

export {
	Card,
	CardHeader,
	CardFooter,
	CardTitle,
	CardAction,
	CardDescription,
	CardContent,
}
