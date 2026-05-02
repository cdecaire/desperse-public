import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'
import { Tooltip } from '@/components/ui/tooltip'

export type UserRole = 'user' | 'moderator' | 'admin'

interface VerifiedBadgeProps {
	role: UserRole | null | undefined
	size?: 'xs' | 'sm' | 'md' | 'lg'
	className?: string
}

const sizeClass = {
	xs: 'w-3 h-3',
	sm: 'w-3.5 h-3.5',
	md: 'w-4 h-4',
	lg: 'w-5 h-5',
} as const

/**
 * Inline icon badge for compact contexts (post header, comment author).
 * For profile headers, prefer <RoleBadge /> (text pill).
 */
export function VerifiedBadge({ role, size = 'sm', className }: VerifiedBadgeProps) {
	if (role !== 'admin' && role !== 'moderator') return null

	const isAdmin = role === 'admin'
	const label = isAdmin ? 'Official Desperse account' : 'Desperse moderator'

	return (
		<Tooltip content={label}>
			{isAdmin ? (
				<img
					src="/verified.svg"
					alt=""
					aria-label={label}
					className={cn('inline-block dark:invert', sizeClass[size], className)}
				/>
			) : (
				<span
					aria-label={label}
					className={cn(
						'inline-flex items-center justify-center text-foreground leading-none',
						sizeClass[size],
						className,
					)}
				>
					<Icon name="shield-halved" variant="solid" />
				</span>
			)}
		</Tooltip>
	)
}
