import { cn } from '@/lib/utils'
import { Tooltip } from '@/components/ui/tooltip'
import type { UserRole } from '@/components/shared/VerifiedBadge'

interface RoleBadgeProps {
	role: UserRole | null | undefined
	className?: string
}

/**
 * Text pill shown next to display names to clearly identify Admin / Moderator
 * accounts. Theme-adaptive: dark in light mode, light in dark mode.
 */
export function RoleBadge({ role, className }: RoleBadgeProps) {
	if (role !== 'admin' && role !== 'moderator') return null

	const isAdmin = role === 'admin'
	const label = isAdmin ? 'Admin' : 'Moderator'
	const fullLabel = isAdmin ? 'Official Desperse account' : 'Desperse moderator'

	return (
		<Tooltip content={fullLabel}>
			<span
				aria-label={fullLabel}
				className={cn(
					'inline-flex items-center rounded-full text-[10px] font-semibold leading-none px-2 py-1',
					'bg-foreground text-background',
					className,
				)}
			>
				{label}
			</span>
		</Tooltip>
	)
}
