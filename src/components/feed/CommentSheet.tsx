/**
 * CommentSheet Component
 * Bottom sheet wrapper for comments on mobile devices.
 * Uses the existing Sheet (Radix Dialog) with side="bottom".
 * Tracks visualViewport to stay above the mobile keyboard.
 */

import { useState, useEffect, useRef } from 'react'
import {
	Sheet,
	SheetContent,
	SheetClose,
	SheetHeader,
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
				// Distance from bottom of layout viewport to bottom of visual viewport
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

	// Always compute height from visual viewport — no threshold switching.
	// Sheet = 85% of visible area + keyboard offset (hidden behind keyboard).
	// When keyboard is closed, keyboardOffset ≈ 0 and visibleHeight ≈ window.innerHeight,
	// so this naturally equals ~85% of the full viewport.
	const sheetHeight = visibleHeight > 0
		? `${visibleHeight * 0.85 + keyboardOffset}px`
		: '85dvh'

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="bottom"
				showClose={false}
				className="flex flex-col rounded-t-2xl px-0"
				style={{ height: sheetHeight }}
			>
				<SheetHeader className="px-4 pb-2 pt-2 shrink-0 flex flex-row items-center justify-between">
					<SheetTitle className="text-sm font-semibold">Comments</SheetTitle>
					<SheetClose className="rounded-full p-1 hover:bg-muted transition-colors">
						<XIcon className="size-4 text-muted-foreground" />
						<span className="sr-only">Close</span>
					</SheetClose>
				</SheetHeader>

				{/* Scrollable comments list */}
				<div className="flex-1 overflow-y-auto px-4 min-h-0">
					<CommentSection
						postId={postId}
						userId={userId}
						isAuthenticated={isAuthenticated}
						variant="inline"
					/>
				</div>

				{/* Input at bottom — padded above keyboard when open */}
				{isAuthenticated && (
					<div
						className="shrink-0 border-t border-border px-4 pt-3"
						style={{
							paddingBottom: keyboardOffset > 0
								? `${keyboardOffset + 12}px`
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
			</SheetContent>
		</Sheet>
	)
}
