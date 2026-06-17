import { Badge } from '@cdecaire/sable'
import { Tooltip } from '@/components/ui/tooltip'
import type { UserRole } from '@/components/shared/VerifiedBadge'

interface RoleBadgeProps {
	role: UserRole | null | undefined
	className?: string
}

/**
 * Text pill shown next to display names to clearly identify Admin / Moderator
 * accounts.
 *
 * Migration shim (Phase 2 — Sable adoption): @cdecaire/sable <Badge> with the
 * `solid` variant (inverted bg-foreground/text-background), which matches the
 * previous high-contrast pill and is theme-adaptive.
 */
export function RoleBadge({ role, className }: RoleBadgeProps) {
	if (role !== 'admin' && role !== 'moderator') return null

	const isAdmin = role === 'admin'
	const label = isAdmin ? 'Admin' : 'Moderator'
	const fullLabel = isAdmin ? 'Official Desperse account' : 'Desperse moderator'

	return (
		<Tooltip content={fullLabel}>
			<Badge variant="solid" size="sm" aria-label={fullLabel} className={className}>
				{label}
			</Badge>
		</Tooltip>
	)
}
