/**
 * MobileHeader Component
 * Reusable mobile header with PWA safe-area support
 * Used by pages that hide TopNav and provide their own header
 */

import { useRouter } from "@tanstack/react-router"

interface MobileHeaderProps {
	/** Page title to display in center */
	title: string
	/** Show back button (default: true) */
	showBackButton?: boolean
	/** Custom back path (default: uses router history) */
	backTo?: string
	/** Right side content */
	rightContent?: React.ReactNode
	/** Additional className for the header */
	className?: string
}

export function MobileHeader({
	title,
	showBackButton = true,
	backTo,
	rightContent,
	className = "",
}: MobileHeaderProps) {
	const router = useRouter()

	const handleBack = () => {
		if (backTo) {
			router.navigate({ to: backTo })
		} else if (window.history.length > 1) {
			router.history.back()
		} else {
			router.navigate({ to: "/" })
		}
	}

	return (
		<header
			className={`md:hidden fixed top-0 left-0 right-0 z-40 w-full border-b bg-background ${className}`}
			style={{ paddingTop: "env(safe-area-inset-top)" }}
		>
			<div className="grid grid-cols-3 items-center h-14 px-4">
				{/* Left: Back button or spacer */}
				<div className="flex items-center">
					{showBackButton && (
						<button
							type="button"
							onClick={handleBack}
							className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-accent transition-colors"
							aria-label="Go back"
						>
							<i className="fa-solid fa-arrow-left" aria-hidden="true" />
						</button>
					)}
				</div>

				{/* Center: Title */}
				<div className="flex justify-center min-w-0 flex-1">
					<h1 className="text-base font-semibold whitespace-nowrap truncate">
						{title}
					</h1>
				</div>

				{/* Right: Custom content or spacer */}
				<div className="flex justify-end">{rightContent}</div>
			</div>
		</header>
	)
}

/**
 * MobileHeaderSpacer Component
 * Provides the correct spacing below MobileHeader to account for safe-area
 * Use this as the first element in content after MobileHeader
 */
export function MobileHeaderSpacer() {
	return (
		<div
			className="md:hidden"
			style={{ paddingTop: "calc(3.5rem + env(safe-area-inset-top))" }}
		/>
	)
}

export default MobileHeader
