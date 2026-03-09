/**
 * CommentSheet Component
 * Bottom sheet modal for comments on mobile devices.
 * Tracks visualViewport to stay above the mobile keyboard.
 * Auto-focuses input on open to trigger keyboard.
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

	// Auto-focus the textarea when sheet opens to trigger keyboard
	useEffect(() => {
		if (!open || !isAuthenticated) return
		// Small delay to let the sheet animation start before focusing
		const timer = setTimeout(() => {
			const textarea = inputRef.current?.querySelector('textarea')
			textarea?.focus()
		}, 100)
		return () => clearTimeout(timer)
	}, [open, isAuthenticated])

	// Sheet height: 85% of visible area + keyboard offset (hidden behind keyboard).
	// When keyboard is closed, keyboardOffset ≈ 0, so this ≈ 85% of full viewport.
	const sheetHeight = visibleHeight > 0
		? `${visibleHeight * 0.85 + keyboardOffset}px`
		: '85dvh'

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="bottom"
				showClose={false}
				className="flex flex-col px-0 !border-0 !shadow-2xl !bg-transparent !gap-0"
				style={{ height: sheetHeight, bottom: '4px' }}
			>
				{/* Modal card with inset margin and fully rounded corners */}
				<div className="flex flex-col flex-1 min-h-0 mx-1 bg-background rounded-2xl overflow-hidden shadow-2xl">
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

					{/* Input area — padded above keyboard when open */}
					{isAuthenticated && (
						<div
							ref={inputRef}
							className="shrink-0 border-t border-border px-4 py-3"
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
				</div>
			</SheetContent>
		</Sheet>
	)
}
