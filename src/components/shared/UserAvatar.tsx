import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'
import { Tooltip } from '@/components/ui/tooltip'
import type { UserRole } from '@/components/shared/VerifiedBadge'

const sizeClasses = {
	xs: 'w-6 h-6',
	sm: 'w-8 h-8',
	md: 'w-10 h-10',
	lg: 'w-12 h-12',
} as const

const iconSizes = {
	xs: 'text-[10px]',
	sm: 'text-xs',
	md: 'text-sm',
	lg: 'text-lg',
} as const

const badgeSize = {
	xs: 'w-3 h-3 -right-1 -bottom-0.5',
	sm: 'w-3.5 h-3.5 -right-1 -bottom-0.5',
	md: 'w-4 h-4 -right-1.5 -bottom-0.5',
	lg: 'w-5 h-5 -right-2 -bottom-1',
} as const

interface UserAvatarProps {
	src?: string | null
	alt?: string
	size?: keyof typeof sizeClasses
	className?: string
	role?: UserRole | null
}

export function UserAvatar({ src, alt = '', size = 'md', className, role }: UserAvatarProps) {
	const showBadge = role === 'admin' || role === 'moderator'
	const isAdmin = role === 'admin'
	const badgeLabel = isAdmin ? 'Official Desperse account' : 'Desperse moderator'

	return (
		<div className={cn('relative flex-shrink-0', sizeClasses[size], className)}>
			<div className="rounded-full bg-muted overflow-hidden w-full h-full">
				{src ? (
					<img
						src={src}
						alt={alt}
						className="w-full h-full object-cover"
						loading="lazy"
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center text-muted-foreground">
						<Icon name="user" variant="regular" className={iconSizes[size]} />
					</div>
				)}
			</div>
			{showBadge && (
				<span className={cn('absolute', badgeSize[size])}>
					<Tooltip content={badgeLabel}>
						{isAdmin ? (
							<img
								src="/verified.svg"
								alt=""
								aria-label={badgeLabel}
								className="w-full h-full drop-shadow-sm dark:invert"
							/>
						) : (
							<span
								aria-label={badgeLabel}
								className="leading-none drop-shadow-sm flex items-center justify-center text-foreground w-full h-full"
							>
								<Icon name="shield-halved" variant="solid" />
							</span>
						)}
					</Tooltip>
				</span>
			)}
		</div>
	)
}
