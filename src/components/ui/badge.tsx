/**
 * Badge Component
 *
 * Migration shim (Phase 2 — Sable adoption).
 *
 * The app's <Badge> now renders @cdecaire/sable's Badge while keeping the LEGACY
 * shadcn API so existing call sites don't change:
 *   - variant: default | secondary | destructive | success | warning | outline
 *   - size:    default | sm
 *
 * Sable's Badge exposes only a tone `variant` (neutral | outline | standard |
 * collectible | edition | info | warning | destructive) and no `size`. We map
 * the legacy variant strings to Sable tones via a lookup, and reproduce the
 * legacy `size` spacing through `sizeVariants` since Sable has no size axis.
 *
 * `badgeVariants` is preserved unchanged (legacy cva) for backward-compat, even
 * though no current consumer imports it — mirrors how button.tsx keeps
 * buttonVariants.
 */

import * as React from 'react'
import { Badge as SableBadge } from '@cdecaire/sable'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Legacy variant strings → Sable tones.
//   default     → neutral     (filled muted)
//   secondary   → neutral     (filled muted; closest to legacy bg-muted fill)
//   destructive → destructive
//   success     → standard    (caribbean-green tone)
//   warning     → warning
//   outline     → outline
const VARIANT_MAP = {
	default: 'neutral',
	secondary: 'neutral',
	destructive: 'destructive',
	success: 'standard',
	warning: 'warning',
	outline: 'outline',
} as const

// Sable has no size axis; reproduce the legacy `size` spacing/scale on top of
// Sable's own padding via className. (Sable's base padding is overridden here.)
const sizeVariants = cva('', {
	variants: {
		size: {
			default: 'px-2.5 py-0.5 text-xs',
			sm: 'px-2 py-0.5 text-[10px]',
		},
	},
	defaultVariants: {
		size: 'default',
	},
})

// Preserved for backward-compat (legacy shadcn cva). Mirrors the original look.
const badgeVariants = cva(
	'inline-flex items-center rounded-full font-medium',
	{
		variants: {
			variant: {
				default: 'bg-primary/10 text-primary',
				secondary: 'bg-muted text-muted-foreground',
				destructive: 'bg-destructive/10 text-destructive',
				success: 'bg-[var(--tone-standard)]/20 text-[var(--tone-standard)]',
				warning: 'bg-[var(--tone-warning)]/20 text-[var(--tone-warning)]',
				outline: 'bg-transparent border border-border text-foreground',
			},
			size: {
				default: 'px-2.5 py-0.5 text-xs',
				sm: 'px-2 py-0.5 text-[10px]',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	}
)

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
	VariantProps<typeof badgeVariants>

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
	({ className, variant, size, ...props }, ref) => {
		const sableVariant = VARIANT_MAP[variant ?? 'default'] ?? 'neutral'

		return (
			<SableBadge
				ref={ref}
				data-slot="badge"
				variant={sableVariant}
				className={cn(sizeVariants({ size }), className)}
				{...props}
			/>
		)
	}
)
Badge.displayName = 'Badge'

export { Badge, badgeVariants }
