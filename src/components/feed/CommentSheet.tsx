/**
 * CommentSheet Component
 * Floating modal for comments on mobile devices.
 * Built on Radix Dialog for independent overlay + panel control.
 *
 * Keyboard strategy:
 * - Overlay: fixed inset-0, covers the visible viewport
 * - Panel (keyboard closed): floating card with 4px inset + rounded corners
 * - Panel (keyboard open): extends to bottom-0 (behind keyboard) so its
 *   background fills behind the iOS keyboard accessory bar. A spacer div
 *   pushes the input above the keyboard. Top corners stay rounded,
 *   bottom corners go flush.
 */

import { useState, useEffect, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'
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
	const [keyboardOffset, setKeyboardOffset] = useState(0)
	const [visibleHeight, setVisibleHeight] = useState(0)
	const rafRef = useRef(0)
	const inputRef = useRef<HTMLDivElement>(null)

	// Track visual viewport to detect mobile keyboard
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

	// Auto-focus the textarea when sheet opens
	useEffect(() => {
		if (!open || !isAuthenticated) return
		const timer = setTimeout(() => {
			const textarea = inputRef.current?.querySelector('textarea')
			textarea?.focus()
		}, 400)
		return () => clearTimeout(timer)
	}, [open, isAuthenticated])

	const keyboardOpen = keyboardOffset > 50

	// Keyboard open: panel extends behind keyboard, spacer pushes input up
	// Keyboard closed: floating card with margin
	const panelHeight = visibleHeight > 0
		? keyboardOpen
			? `${visibleHeight * 0.85 + keyboardOffset}px`
			: `${visibleHeight * 0.85}px`
		: '85dvh'

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				{/* Overlay — standard full-viewport coverage */}
				<Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

				{/* Modal panel */}
				<Dialog.Content
					className="fixed z-50 flex flex-col bg-background overflow-hidden shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:duration-300 data-[state=closed]:duration-200"
					style={{
						height: panelHeight,
						left: '4px',
						right: '4px',
						bottom: keyboardOpen ? '0px' : '4px',
						borderRadius: keyboardOpen ? '1rem 1rem 0 0' : '1rem',
					}}
				>
					{/* Header */}
					<div className="px-4 py-3 shrink-0 flex items-center justify-between border-b border-border">
						<Dialog.Title className="text-sm font-semibold text-foreground">
							Comments
						</Dialog.Title>
						<Dialog.Close className="rounded-full p-1.5 hover:bg-muted active:bg-muted transition-colors -mr-1">
							<XIcon className="size-4 text-muted-foreground" />
							<span className="sr-only">Close</span>
						</Dialog.Close>
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

					{/* Keyboard spacer — fills behind keyboard so bg covers the accessory bar */}
					{keyboardOpen && (
						<div className="shrink-0" style={{ height: `${keyboardOffset}px` }} />
					)}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
