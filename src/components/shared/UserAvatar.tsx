import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'

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

interface UserAvatarProps {
	src?: string | null
	alt?: string
	size?: keyof typeof sizeClasses
	className?: string
}

export function UserAvatar({ src, alt = '', size = 'md', className }: UserAvatarProps) {
	return (
		<div className={cn('rounded-full bg-muted overflow-hidden flex-shrink-0', sizeClasses[size], className)}>
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
	)
}
