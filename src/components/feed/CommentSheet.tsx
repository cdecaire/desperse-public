/**
 * CommentSheet Component
 * Bottom sheet modal for comments on mobile devices.
 * Tracks visualViewport to stay above the mobile keyboard.
 * Auto-focuses input on open to trigger keyboard.
 *
 * Layout strategy:
 * - Sheet is anchored at bottom:0, height covers visible area + keyboard
 * - A spacer div at the bottom pushes content above the keyboard
 * - The sheet's own background fills behind the keyboard (no gaps)
 * - Inset margins + rounded corners create a floating card look
 */

import { useState, useEffect, useRef } from 'react'
import {
	Sheet,
	SheetContent,
	SheetClose,
	SheetTitle,
} from '@/components/ui/sheet'
import { XIcon } from 'lucide-react'
import { CommentSection } from './CommentSection'

interface CommentSheetProps {
	postId: string
	userId?: string | null
	isAuthenticated?: boolean
	/** Controlled open state */
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
	const [keyboardOffset, setKeyboardOffset] = useState(0)
	const [visibleHeight, setVisibleHeight] = useState(0)
	const rafRef = useRef(0)
	const inputRef = useRef<HTMLDivElement>(null)

	// Track visual viewport to detect mobile keyboard height
	useEffect(() => {
		if (!open) {
			setKeyboardOffset(0)
			setVisibleHeight(0)
			return
		}

		const vv = window.visualViewport
		if (!vv) return

		const handleResize = () => {
			cancelAnimationFrame(rafRef.current)
			rafRef.current = requestAnimationFrame(() => {
				const offset = window.innerHeight - (vv.height + vv.offsetTop)
				setKeyboardOffset(Math.max(0, offset))
				setVisibleHeight(vv.height)
			})
		}

		handleResize()
		vv.addEventListener('resize', handleResize)
		vv.addEventListener('scroll', handleResize)
		return () => {
			cancelAnimationFrame(rafRef.current)
			vv.removeEventListener('resize', handleResize)
			vv.removeEventListener('scroll', handleResize)
		}
	}, [open])

	// Auto-focus the textarea when sheet opens to trigger keyboard.
	// Longer delay to let the sheet animation fully settle on iOS PWA
	// before focusing — prevents caret from rendering at stale position.
	useEffect(() => {
		if (!open || !isAuthenticated) return
		const timer = setTimeout(() => {
			const textarea = inputRef.current?.querySelector('textarea')
			textarea?.focus()
		}, 400)
		return () => clearTimeout(timer)
	}, [open, isAuthenticated])

	// Sheet = 85% of visible area + keyboard spacer behind keyboard.
	// When keyboard closed: keyboardOffset ≈ 0, so ≈ 85% of viewport.
	const sheetHeight = visibleHeight > 0
		? `${visibleHeight * 0.85 + keyboardOffset}px`
		: '85dvh'

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="bottom"
				showClose={false}
				className="!inset-x-1 !bottom-1 !rounded-2xl !border-0 flex flex-col px-0 !gap-0 overflow-hidden"
				style={{ height: sheetHeight }}
			>
				{/* Header */}
				<div className="px-4 py-3 shrink-0 flex items-center justify-between border-b border-border">
					<SheetTitle className="text-sm font-semibold">Comments</SheetTitle>
					<SheetClose className="rounded-full p-1.5 hover:bg-muted active:bg-muted transition-colors -mr-1">
						<XIcon className="size-4 text-muted-foreground" />
						<span className="sr-only">Close</span>
					</SheetClose>
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

				{/* Input area */}
				{isAuthenticated && (
					<div ref={inputRef} className="shrink-0 border-t border-border px-4 py-3">
						<CommentSection
							postId={postId}
							userId={userId}
							isAuthenticated={isAuthenticated}
							variant="input-only"
						/>
					</div>
				)}

				{/* Keyboard spacer — pushes content above keyboard, background fills the gap */}
				{keyboardOffset > 0 && (
					<div className="shrink-0" style={{ height: `${keyboardOffset}px` }} />
				)}
			</SheetContent>
		</Sheet>
	)
}
