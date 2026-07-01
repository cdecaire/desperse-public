import { Spinner } from '@cdecaire/sable'
import { cn } from '@/lib/utils'

/**
 * Migration shim (Phase 2 — Sable adoption).
 *
 * Renders @cdecaire/sable's <Spinner> (pure-CSS ring, role="status", color via
 * `border-current` so it follows the surrounding text color) while keeping the
 * legacy LoadingSpinner API (`size` + `className`) so all ~50 call sites stay
 * unchanged.
 *
 * The Sable Spinner is sized with `size-*` on its className; these map 1:1 to
 * the previous h-/w- values:
 *   sm → size-4  (16px)
 *   md → size-8  (32px)
 *   lg → size-12 (48px)
 *
 * Visual note: the old ring was a muted track + foreground arc; Sable's is a
 * single `currentColor` arc (transparent top). On the default foreground text
 * color this reads the same; in tinted contexts it now inherits that color,
 * which is the intended design-system behavior.
 */
interface LoadingSpinnerProps {
	className?: string
	size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
	sm: 'size-4',
	md: 'size-8',
	lg: 'size-12',
} as const

export function LoadingSpinner({ className, size = 'md' }: LoadingSpinnerProps) {
	return <Spinner className={cn(sizeClasses[size], className)} />
}
