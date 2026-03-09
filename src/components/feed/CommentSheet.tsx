/**
 * CommentSheet Component
 * Floating modal for comments on mobile devices.
 * Built on Radix Dialog for independent overlay + panel control.
 *
 * Sizing: tracks window.innerHeight and sizes to 85% of it.
 * On iOS PWA the viewport resizes when the keyboard opens,
 * so the modal naturally shrinks to fit above the keyboard.
 * No keyboard detection or spacer tricks needed.
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
	const [windowHeight, setWindowHeight] = useState(0)
	const inputRef = useRef<HTMLDivElement>(null)

	// Track actual window height — reacts to iOS PWA viewport resizing
	useEffect(() => {
		if (!open) {
			setWindowHeight(0)
			return
		}

		const update = () => {
			// Use the smaller of window.innerHeight and visualViewport.height
			// to handle all browser modes correctly
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

	// 85% of current viewport — shrinks/grows with keyboard automatically
	const panelHeight = windowHeight > 0
		? `${windowHeight * 0.85}px`
		: '85dvh'

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				{/* Overlay */}
				<Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

				{/* Modal panel — always 85% of viewport, 4px inset */}
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
	)
}
