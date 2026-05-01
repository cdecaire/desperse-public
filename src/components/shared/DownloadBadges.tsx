/**
 * Download Badges
 * Monochrome platform badges (App Store, Solana dApp Store, Android APK).
 * Designed to match Desperse's minimal aesthetic while keeping universally
 * recognizable store-badge language.
 */

const SOLANA_DAPP_STORE_PACKAGE = 'app.desperse.android'

export const DOWNLOAD_LINKS = {
	ios: 'https://testflight.apple.com/join/27uRZQ45',
	solanaDappStore: `solanadappstore://details?id=${SOLANA_DAPP_STORE_PACKAGE}`,
	androidApk: 'https://4swlq9hweqtpslft.public.blob.vercel-storage.com/app-release.apk',
} as const

export const APP_VERSION = {
	ios: 'Public Beta',
	solanaDappStore: 'Saga & Seeker',
	android: 'Direct download',
} as const

/**
 * Smart open for Solana dApp Store deep link.
 * On Saga/Seeker the OS handles the custom scheme and the page blurs.
 * On any other device the scheme silently fails — we redirect to /download
 * after a short delay so the user gets context instead of nothing happening.
 */
export function openSolanaDappStore() {
	if (typeof window === 'undefined') return

	let didNavigate = false
	const onBlur = () => { didNavigate = true }
	window.addEventListener('blur', onBlur, { once: true })
	document.addEventListener('visibilitychange', onBlur, { once: true })

	window.location.href = DOWNLOAD_LINKS.solanaDappStore

	window.setTimeout(() => {
		window.removeEventListener('blur', onBlur)
		document.removeEventListener('visibilitychange', onBlur)
		if (!didNavigate && document.visibilityState === 'visible') {
			window.location.href = '/download'
		}
	}, 1500)
}

type Platform = 'ios' | 'solanaDappStore' | 'androidApk'

interface BadgeProps {
	platform: Platform
	size?: 'sm' | 'md'
	className?: string
}

function AppleMark({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
			<path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
		</svg>
	)
}

function SolanaMark({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
			<path d="M4.4 16.6c.15-.15.36-.24.58-.24h17.4c.36 0 .54.44.29.69l-3.07 3.07a.83.83 0 0 1-.58.24H1.62c-.36 0-.54-.44-.29-.69l3.07-3.07zM4.4 4.7c.15-.15.36-.24.58-.24h17.4c.36 0 .54.44.29.69l-3.07 3.07a.83.83 0 0 1-.58.24H1.62c-.36 0-.54-.44-.29-.69L4.4 4.7zm14.91 5.91a.83.83 0 0 0-.58-.24H1.33c-.36 0-.54.44-.29.69l3.07 3.07c.15.15.36.24.58.24h17.4c.36 0 .54-.44.29-.69l-3.07-3.07z" />
		</svg>
	)
}

function AndroidMark({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
			<path d="M17.6 9.48l1.84-3.18a.4.4 0 0 0-.69-.4l-1.86 3.23A11.4 11.4 0 0 0 12 8a11.4 11.4 0 0 0-4.89 1.13L5.25 5.9a.4.4 0 0 0-.69.4L6.4 9.48A10.81 10.81 0 0 0 1 18h22a10.81 10.81 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 1.25-1.25A1.25 1.25 0 0 1 7 15.25zm10 0a1.25 1.25 0 1 1 1.25-1.25 1.25 1.25 0 0 1-1.25 1.25z" />
		</svg>
	)
}

const BADGE_CONFIG: Record<Platform, {
	href: string
	mark: (props: { className?: string }) => React.ReactNode
	supertext: string
	main: string
	external: boolean
}> = {
	ios: {
		href: DOWNLOAD_LINKS.ios,
		mark: AppleMark,
		supertext: 'Join the beta on',
		main: 'TestFlight',
		external: true,
	},
	solanaDappStore: {
		href: DOWNLOAD_LINKS.solanaDappStore,
		mark: SolanaMark,
		supertext: 'Get it on the',
		main: 'Solana dApp Store',
		external: true,
	},
	androidApk: {
		href: DOWNLOAD_LINKS.androidApk,
		mark: AndroidMark,
		supertext: 'Direct download',
		main: 'Android APK',
		external: true,
	},
}

export function DownloadBadge({ platform, size = 'md', className = '' }: BadgeProps) {
	const config = BADGE_CONFIG[platform]
	const Mark = config.mark
	const isDisabled = config.href === '#'

	const dimensions =
		size === 'sm'
			? 'h-12 px-7 gap-3'
			: 'h-[60px] px-8 gap-3.5'
	const iconSize = size === 'sm' ? 'w-[18px] h-[18px]' : 'w-[22px] h-[22px]'
	const supertextSize = size === 'sm' ? 'text-[10px]' : 'text-[11px]'
	const mainSize = size === 'sm' ? 'text-sm' : 'text-base'

	const baseClasses = `inline-flex items-center justify-center ${dimensions} rounded-full transition-all duration-200 ${
		isDisabled
			? 'border border-zinc-200 dark:border-zinc-800 bg-transparent cursor-not-allowed'
			: 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:scale-105 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-white'
	} ${className}`

	const supertextColor = isDisabled
		? 'text-zinc-400 dark:text-zinc-600'
		: 'text-zinc-400 dark:text-zinc-500'
	const mainColor = isDisabled
		? 'text-zinc-600 dark:text-zinc-400'
		: ''

	const content = (
		<>
			<Mark className={`${iconSize} shrink-0 ${isDisabled ? 'text-zinc-500 dark:text-zinc-500' : ''}`} />
			<span className="flex flex-col items-start leading-[1.05] text-left">
				<span className={`${supertextSize} font-medium uppercase tracking-[0.12em] ${supertextColor}`}>
					{config.supertext}
				</span>
				<span className={`${mainSize} font-bold tracking-[-0.01em] ${mainColor}`}>{config.main}</span>
			</span>
		</>
	)

	if (isDisabled) {
		return (
			<span
				className={baseClasses}
				role="link"
				aria-disabled="true"
				aria-label={`${config.main} — coming soon`}
			>
				{content}
			</span>
		)
	}

	if (platform === 'solanaDappStore') {
		return (
			<a
				href={config.href}
				className={baseClasses}
				aria-label={`${config.supertext} ${config.main}`}
				onClick={(e) => {
					e.preventDefault()
					openSolanaDappStore()
				}}
			>
				{content}
			</a>
		)
	}

	return (
		<a
			href={config.href}
			target={config.external ? '_blank' : undefined}
			rel={config.external ? 'noopener noreferrer' : undefined}
			className={baseClasses}
			aria-label={`${config.supertext} ${config.main}`}
		>
			{content}
		</a>
	)
}

interface DownloadBadgesProps {
	size?: 'sm' | 'md'
	className?: string
	platforms?: Platform[]
}

export function DownloadBadges({
	size = 'md',
	className = '',
	platforms = ['ios', 'solanaDappStore', 'androidApk'],
}: DownloadBadgesProps) {
	return (
		<div className={`flex flex-wrap items-center gap-3 ${className}`}>
			{platforms.map((p) => (
				<DownloadBadge key={p} platform={p} size={size} />
			))}
		</div>
	)
}
