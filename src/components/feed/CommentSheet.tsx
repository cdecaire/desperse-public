/**
 * CommentSheet Component
 * Floating modal for comments on mobile devices.
 *
 * The overlay and modal panel are fully separated:
 * - Overlay: plain div rendered outside Dialog.Portal, sized to the
 *   initial viewport height (captured before keyboard). Stays full-screen
 *   regardless of iOS PWA viewport resizing.
 * - Panel: inside Dialog.Portal, tracks current viewport height so it
 *   shrinks/grows with the keyboard naturally.
 */

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import * as Dialog from '@radix-ui/react-dialog'
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
	const [windowHeight, setWindowHeight] = useState(0)
	const [overlayHeight, setOverlayHeight] = useState(0)
	const [mounted, setMounted] = useState(false)
	const inputRef = useRef<HTMLDivElement>(null)

	// Capture full viewport height on open (before keyboard) for the overlay
	useEffect(() => {
		if (open) {
			setOverlayHeight(window.innerHeight)
			setMounted(true)
		} else {
			// Delay unmount to allow fade-out animation
			const timer = setTimeout(() => setMounted(false), 300)
			setOverlayHeight(0)
			return () => clearTimeout(timer)
		}
	}, [open])

	// Track current window height for the modal panel
	useEffect(() => {
		if (!open) {
			setWindowHeight(0)
			return
		}

		const update = () => {
			const vv = window.visualViewport
			const h = vv ? Math.min(vv.height, window.innerHeight) : window.innerHeight
			setWindowHeight(h)
		}

		update()

		const vv = window.visualViewport
		window.addEventListener('resize', update)
		vv?.addEventListener('resize', update)
		vv?.addEventListener('scroll', update)

		return () => {
			window.removeEventListener('resize', update)
			vv?.removeEventListener('resize', update)
			vv?.removeEventListener('scroll', update)
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

	const panelHeight = windowHeight > 0
		? `${windowHeight * 0.85}px`
		: '85dvh'

	return (
		<>
			{/* Overlay — rendered outside Dialog.Portal via its own portal.
			    Uses the initial (pre-keyboard) height so it never shrinks. */}
			{mounted && createPortal(
				<div
					className={cn(
						'fixed top-0 left-0 w-full z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300',
						open ? 'opacity-100' : 'opacity-0 pointer-events-none'
					)}
					style={{ height: `${overlayHeight || window.innerHeight}px` }}
					onClick={() => onOpenChange?.(false)}
					aria-hidden
				/>,
				document.body
			)}

			{/* Dialog — only the panel, no Radix overlay */}
			<Dialog.Root open={open} onOpenChange={onOpenChange}>
				<Dialog.Portal>
					<Dialog.Content
						className="fixed z-50 left-1 right-1 bottom-1 flex flex-col bg-background rounded-2xl overflow-hidden shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:duration-300 data-[state=closed]:duration-200"
						style={{ height: panelHeight }}
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
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</>
	)
}
