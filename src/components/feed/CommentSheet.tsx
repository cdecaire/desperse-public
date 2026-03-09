/**
 * CommentSheet Component
 * Full-page comment view for mobile, matching the messaging UI pattern.
 *
 * - Backdrop: fixed inset-0, separate from the sheet
 * - Sheet: fixed top-0, height tracks visualViewport so input stays above keyboard
 * - Body scroll lock while open
 * - Flex column: header → scrollable comments (flex-1) → sticky input
 * - Uses top-0 positioning so the sheet shrinks upward from the keyboard, not downward from the top
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
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
	const [viewportOffsetTop, setViewportOffsetTop] = useState(0)
	const [isClosing, setIsClosing] = useState(false)
	const inputRef = useRef<HTMLDivElement>(null)
	const commentsScrollRef = useRef<HTMLDivElement>(null)

	// Lock body scroll while open
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

	// Track visual viewport height AND offsetTop (keyboard open/close)
	// Listen to both resize and scroll events — iOS may scroll the visual viewport
	// without resizing it when an input is focused.
	const handleViewportChange = useCallback(() => {
		const vv = window.visualViewport
		if (!vv) return
		requestAnimationFrame(() => {
			setViewportHeight(vv.height)
			setViewportOffsetTop(vv.offsetTop)
		})
	}, [])

	useEffect(() => {
		if (!open) {
			setViewportHeight(null)
			setViewportOffsetTop(0)
			return
		}

		const vv = window.visualViewport
		if (!vv) return

		setViewportHeight(vv.height)
		setViewportOffsetTop(vv.offsetTop)
		vv.addEventListener('resize', handleViewportChange)
		vv.addEventListener('scroll', handleViewportChange)
		return () => {
			vv.removeEventListener('resize', handleViewportChange)
			vv.removeEventListener('scroll', handleViewportChange)
		}
	}, [open, handleViewportChange])

	// Auto-focus the textarea when sheet opens
	useEffect(() => {
		if (!open || !isAuthenticated) return
		const timer = setTimeout(() => {
			const textarea = inputRef.current?.querySelector('textarea')
			textarea?.focus()
		}, 300)
		return () => clearTimeout(timer)
	}, [open, isAuthenticated])

	// Scroll comments to bottom when keyboard opens so user sees latest + input
	const prevHeightRef = useRef<number | null>(null)
	useEffect(() => {
		if (viewportHeight == null) return
		const prev = prevHeightRef.current
		prevHeightRef.current = viewportHeight
		// Keyboard opened — viewport got significantly smaller
		if (prev != null && prev - viewportHeight > 100) {
			requestAnimationFrame(() => {
				const el = commentsScrollRef.current
				if (el) el.scrollTop = el.scrollHeight
			})
		}
	}, [viewportHeight])

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

	// In PWA standalone mode, the sheet covers the full screen including the home
	// indicator area — no need for extra safe-area padding which creates dead space.
	const isStandalone = typeof window !== 'undefined' && (
		window.matchMedia('(display-mode: standalone)').matches ||
		(navigator as any).standalone === true
	)

	// Portal to document.body so the sheet escapes any ancestor stacking contexts
	// (e.g. transforms on PostCard or article wrappers) and reliably covers nav bars
	return createPortal(
		<>
			{/* Backdrop */}
			<div
				className={cn(
					'fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-200',
					isClosing ? 'opacity-0' : 'opacity-100'
				)}
				onClick={handleClose}
			/>

			{/* Full-screen sheet — anchored to top so it shrinks above keyboard */}
			<div
				className={cn(
					'fixed inset-x-0 top-0 z-[60] flex flex-col bg-background shadow-lg',
					isClosing
						? 'animate-out slide-out-to-bottom duration-200'
						: 'animate-in slide-in-from-bottom duration-200'
				)}
				style={{
					top: viewportOffsetTop,
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
				<div
					ref={commentsScrollRef}
					className="flex-1 overflow-y-auto px-4 min-h-0"
					style={{ overscrollBehavior: 'contain' }}
				>
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
							paddingBottom: keyboardOpen || isStandalone
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
		</>,
		document.body
	)
}
