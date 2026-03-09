/**
 * CommentSheet Component
 * Bottom sheet modal for comments on mobile devices.
 * Tracks visualViewport to stay above the mobile keyboard.
 * Auto-focuses input on open to trigger keyboard.
 *
 * Layout strategy:
 * - Sheet is sized to 85% of visible area (above keyboard)
 * - Positioned with bottom offset: flush at keyboard top when open,
 *   4px margin when closed
 * - No extending behind keyboard — the body bg fills that area naturally
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
	// Delay lets the sheet animation settle on iOS PWA before focusing.
	useEffect(() => {
		if (!open || !isAuthenticated) return
		const timer = setTimeout(() => {
			const textarea = inputRef.current?.querySelector('textarea')
			textarea?.focus()
		}, 400)
		return () => clearTimeout(timer)
	}, [open, isAuthenticated])

	const keyboardOpen = keyboardOffset > 50

	// Sheet = 85% of visible area, positioned above the keyboard
	const sheetHeight = visibleHeight > 0
		? `${visibleHeight * 0.85}px`
		: '85dvh'

	// Flush at keyboard when open, 4px margin when closed
	const bottomOffset = keyboardOpen ? keyboardOffset : 4

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="bottom"
				showClose={false}
				className="!inset-x-1 !rounded-2xl !border-0 flex flex-col px-0 !gap-0 overflow-hidden"
				style={{ height: sheetHeight, bottom: `${bottomOffset}px` }}
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
			</SheetContent>
		</Sheet>
	)
}
