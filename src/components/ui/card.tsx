import * as React from "react"
import {
	Card as SableCard,
	CardContent as SableCardContent,
	CardDescription as SableCardDescription,
	CardFooter as SableCardFooter,
	CardHeader as SableCardHeader,
	CardTitle as SableCardTitle,
	type CardProps as SableCardProps,
} from "@cdecaire/sable"

import { cn } from "@/lib/utils"

/**
 * Migration shim (Phase 2 — Sable adoption).
 *
 * The app's <Card> family now renders @cdecaire/sable's Card parts (adopting
 * Sable styling: rounded-lg surface, text-title-lg title, padded sections)
 * while keeping the LEGACY shadcn API so existing call sites don't change.
 *
 * Sable exports: Card, CardHeader, CardTitle, CardDescription, CardContent,
 * CardFooter. Sable has NO `CardAction` — it is shimmed below as a minimal
 * styled <div> that preserves the legacy slot/positioning behavior.
 *
 * Notes for auditing:
 *   - Sable's <Card> adds an optional `variant` ("default" | "flat") prop —
 *     additive, so legacy callers are unaffected.
 *   - Legacy `data-slot` attributes are preserved on each part so existing
 *     `has-data-[slot=card-action]` selectors keep working.
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

// No Sable equivalent — shimmed as a styled <div> matching the legacy behavior
// (top-right action slot within the card header grid).
function CardAction({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-action"
			className={cn(
				"col-start-2 row-span-2 row-start-1 self-start justify-self-end",
				className
			)}
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
