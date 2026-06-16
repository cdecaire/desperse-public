/**
 * NotificationBadge Component
 *
 * Migration shim (Phase 2 — Sable adoption).
 *
 * The app's <NotificationBadge> now renders @cdecaire/sable's NotificationBadge
 * while keeping the LEGACY API so existing call sites don't change:
 *   - variant: default | destructive
 *   - size:    default | sm | dot
 *   - count, max
 *
 * Sable's NotificationBadge has a different shape: `dot?: boolean` instead of a
 * size string, no `variant`/`size` axes, plus `count`/`max`. We translate:
 *   - size="dot" → Sable `dot` (bare indicator)
 *   - count/max  → passed through
 *   - variant/size("default"|"sm") → no Sable equivalent; absorbed by the shim
 *     (Sable always renders the destructive tone + a single pill scale). The
 *     legacy `size` spacing is reapplied via `sizeVariants` className.
 *
 * `notificationBadgeVariants` is preserved unchanged (legacy cva) for
 * backward-compat, even though no current consumer imports it — mirrors how
 * button.tsx keeps buttonVariants.
 */

import * as React from 'react'
import { NotificationBadge as SableNotificationBadge } from '@cdecaire/sable'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Preserved for backward-compat (legacy shadcn cva). Mirrors the original look.
const notificationBadgeVariants = cva(
	'flex items-center justify-center rounded-full font-semibold',
	{
		variants: {
			variant: {
				default: 'bg-primary text-primary-foreground',
				destructive: 'bg-destructive text-destructive-foreground',
			},
			size: {
				default: 'min-w-[20px] h-5 px-1.5 text-xs',
				sm: 'min-w-[16px] h-4 px-1 text-[10px]',
				dot: 'w-2.5 h-2.5',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	}
)

// Sable has no size axis for the count pill; reapply the legacy scale via
// className. (`dot` is handled by Sable's own `dot` mode.)
const sizeVariants = cva('', {
	variants: {
		size: {
			default: 'min-w-[20px] h-5 px-1.5 text-xs',
			sm: 'min-w-[16px] h-4 px-1 text-[10px]',
			dot: '',
		},
	},
	defaultVariants: {
		size: 'default',
	},
})

interface NotificationBadgeProps
	extends React.HTMLAttributes<HTMLSpanElement>,
		VariantProps<typeof notificationBadgeVariants> {
	/** The count to display. Not used for 'dot' size. */
	count?: number
	/** Maximum count before showing "99+". Defaults to 99. */
	max?: number
}

function NotificationBadge({
	className,
	// variant has no Sable equivalent (Sable always uses the destructive tone);
	// absorbed here so it isn't forwarded to the DOM.
	variant: _variant,
	size,
	count,
	max = 99,
	...props
}: NotificationBadgeProps) {
	// For dot size, map to Sable's `dot` mode (no content, no size class).
	if (size === 'dot') {
		return (
			<SableNotificationBadge
				data-slot="notification-badge"
				dot
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
			className={cn(sizeVariants({ size }), className)}
			{...props}
		/>
	)
}

export { NotificationBadge, notificationBadgeVariants }
