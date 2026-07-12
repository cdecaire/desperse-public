import { cn } from '@/lib/utils'
import { getAvatarPatternClass } from '@/lib/avatarPattern'
import { AvatarFallback, AvatarImage, AvatarRoot } from '@cdecaire/sable'
import { Icon } from '@/components/ui/icon'
import { Tooltip } from '@/components/ui/tooltip'
import type { UserRole } from '@/components/shared/VerifiedBadge'

/**
 * Migration shim (Phase 2 — Sable adoption).
 *
 * The avatar circle (image + deterministic color-field fallback) uses Sable's
 * low-level AvatarRoot/Image/Fallback parts so the fallback can own its circular
 * clipping frame. Base UI still tracks load/error and swaps to the fallback automatically.
 * We keep Desperse's own concerns on the wrapper:
 *   - `data-avatar` — the dark-mode hover CSS in styles.css excludes avatars via
 *     `:not(:has([data-avatar]))`; must stay.
 *   - the admin/moderator badge overlay (Tooltip + verified.svg / shield glyph).
 *   - the xs/sm/md/lg size scale (wrapper sizes the box; Sable's Avatar fills it
 *     with `size-full`, so we don't depend on Sable's own size variant).
 *
 * Public API (src/alt/seed/size/className/role) is unchanged.
 */

const sizeClasses = {
	xs: 'w-6 h-6',
	sm: 'w-8 h-8',
	md: 'w-10 h-10',
	lg: 'w-12 h-12',
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
	/** A stable identifier such as a user ID, wallet address, or username. */
	seed?: string | null
	size?: keyof typeof sizeClasses
	className?: string
	role?: UserRole | null
}

interface UserAvatarFallbackProps {
	seed?: string | null
	contained?: boolean
}

/** Reusable visual for legacy avatar slots that still render their own image element. */
export function UserAvatarFallback({ seed, contained = false }: UserAvatarFallbackProps) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				'avatar-fallback-pattern',
				contained && 'avatar-fallback-pattern--contained',
				getAvatarPatternClass(seed),
			)}
		/>
	)
}

export function UserAvatar({ src, alt = '', seed, size = 'md', className, role }: UserAvatarProps) {
	const showBadge = role === 'admin' || role === 'moderator'
	const isAdmin = role === 'admin'
	const badgeLabel = isAdmin ? 'Official Desperse account' : 'Desperse moderator'

	return (
		<div data-avatar className={cn('relative flex-shrink-0', sizeClasses[size], className)}>
			<AvatarRoot className="block size-full align-top leading-none">
				{src ? <AvatarImage src={src} alt={alt} /> : null}
				<AvatarFallback className="absolute inset-0 overflow-hidden rounded-full p-0 leading-none">
					<UserAvatarFallback seed={seed ?? alt} />
				</AvatarFallback>
			</AvatarRoot>
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
