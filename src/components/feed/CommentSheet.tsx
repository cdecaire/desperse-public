/**
 * CommentSheet Component
 * Full-page comment view for mobile, matching the messaging UI pattern.
 *
 * - Backdrop: fixed inset-0, separate from the sheet
 * - Sheet: fixed full-screen, height tracks visualViewport
 * - Body scroll lock while open
 * - Flex column: header → scrollable comments (flex-1) → sticky input
 * - Input stays above keyboard naturally via viewport tracking
 */

import { useState, useEffect, useRef } from 'react'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CommentSection } from './CommentSection'

interface CommentSheetProps {
	postId: string
	userId?: string | null
	isAuthenticated?: boolean
	open?: boolean
	onOpenChange?: (open: boolean) => void
}

export function CommentSheet({
	postId,
	userId,
	isAuthenticated = false,
	open,
	onOpenChange,
}: CommentSheetProps) {
	const [viewportHeight, setViewportHeight] = useState<number | null>(null)
	const [isClosing, setIsClosing] = useState(false)
	const inputRef = useRef<HTMLDivElement>(null)

	// Lock body scroll while open (same as messaging UI)
	useEffect(() => {
		if (!open) return

		const scrollY = window.scrollY
		document.body.style.position = 'fixed'
		document.body.style.top = `-${scrollY}px`
		document.body.style.left = '0'
		document.body.style.right = '0'
		document.body.style.overflow = 'hidden'

		return () => {
			document.body.style.position = ''
			document.body.style.top = ''
			document.body.style.left = ''
			document.body.style.right = ''
			document.body.style.overflow = ''
			window.scrollTo(0, scrollY)
		}
	}, [open])

	// Track visual viewport height (same as messaging UI)
	useEffect(() => {
		if (!open) {
			setViewportHeight(null)
			return
		}

		const vv = window.visualViewport
		if (!vv) return

		const handleResize = () => {
			setViewportHeight(vv.height)
		}

		setViewportHeight(vv.height)
		vv.addEventListener('resize', handleResize)
		return () => vv.removeEventListener('resize', handleResize)
	}, [open])

	// Auto-focus the textarea when sheet opens
	useEffect(() => {
		if (!open || !isAuthenticated) return
		const timer = setTimeout(() => {
			const textarea = inputRef.current?.querySelector('textarea')
			textarea?.focus()
		}, 300)
		return () => clearTimeout(timer)
	}, [open, isAuthenticated])

	const handleClose = () => {
		setIsClosing(true)
		setTimeout(() => {
			setIsClosing(false)
			onOpenChange?.(false)
		}, 200)
	}

	if (!open && !isClosing) return null

	// Detect if keyboard is likely open (viewport significantly smaller than window)
	const keyboardOpen = viewportHeight != null && window.innerHeight - viewportHeight > 100

	return (
		<>
			{/* Backdrop */}
			<div
				className={cn(
					'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-200',
					isClosing ? 'opacity-0' : 'opacity-100'
				)}
				onClick={handleClose}
			/>

			{/* Full-screen sheet */}
			<div
				className={cn(
					'fixed inset-x-0 bottom-0 z-50 flex flex-col bg-background rounded-t-xl shadow-lg',
					isClosing
						? 'animate-out slide-out-to-bottom duration-200'
						: 'animate-in slide-in-from-bottom duration-200'
				)}
				style={{
					height: viewportHeight ? `${viewportHeight}px` : '100dvh',
					maxHeight: '100dvh',
					paddingTop: 'env(safe-area-inset-top, 0px)',
				}}
				role="dialog"
				aria-label="Comments"
			>
				{/* Header */}
				<div className="px-4 py-3 shrink-0 flex items-center justify-between border-b border-border">
					<span className="text-sm font-semibold text-foreground">Comments</span>
					<button
						onClick={handleClose}
						className="rounded-full p-1.5 hover:bg-muted active:bg-muted transition-colors -mr-1"
					>
						<XIcon className="size-4 text-muted-foreground" />
						<span className="sr-only">Close</span>
					</button>
				</div>

				{/* Scrollable comments list */}
				<div className="flex-1 overflow-y-auto px-4 min-h-0">
					<CommentSection
						postId={postId}
						userId={userId}
						isAuthenticated={isAuthenticated}
						variant="inline"
					/>
				</div>

				{/* Input — sticks above keyboard via flex layout.
				    Only add safe-area bottom padding when keyboard is closed
				    (home bar visible). When keyboard is open, no extra padding. */}
				{isAuthenticated && (
					<div
						ref={inputRef}
						className="shrink-0 border-t border-border px-4 py-3"
						style={{
							paddingBottom: keyboardOpen
								? '0.75rem'
								: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
						}}
					>
						<CommentSection
							postId={postId}
							userId={userId}
							isAuthenticated={isAuthenticated}
							variant="input-only"
						/>
					</div>
				)}
			</div>
		</>
	)
}
