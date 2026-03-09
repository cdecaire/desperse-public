/**
 * CommentSheet Component
 * Floating modal for comments on mobile devices.
 * Built on Radix Dialog for independent overlay + panel control.
 *
 * Keyboard detection inspired by react-modal-sheet:
 * - Captures initial viewport height on open (before keyboard)
 * - Compares against current height to detect keyboard
 * - Uses navigator.virtualKeyboard.overlaysContent when available
 * - Tracks focus state to avoid false positives from URL bar changes
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

// Minimum height diff to consider keyboard visible (filters URL bar changes)
const KEYBOARD_THRESHOLD = 100

export function CommentSheet({
	postId,
	userId,
	isAuthenticated = false,
	open,
	onOpenChange,
}: CommentSheetProps) {
	const [keyboardHeight, setKeyboardHeight] = useState(0)
	const initialHeightRef = useRef(0)
	const inputFocusedRef = useRef(false)
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const inputRef = useRef<HTMLDivElement>(null)

	// Keyboard detection: capture initial height, track focus + viewport changes
	useEffect(() => {
		if (!open) {
			setKeyboardHeight(0)
			initialHeightRef.current = 0
			inputFocusedRef.current = false
			return
		}

		// Capture the "no keyboard" height immediately on open
		initialHeightRef.current = window.innerHeight

		// Enable overlaysContent if VirtualKeyboard API available (Chrome)
		const vk = (navigator as any).virtualKeyboard
		let prevOverlaysContent = false
		if (vk) {
			prevOverlaysContent = vk.overlaysContent
			vk.overlaysContent = true
		}

		const vv = window.visualViewport

		function isTextInput(el: Element | null) {
			return el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' ||
				(el instanceof HTMLElement && el.isContentEditable)
		}

		function handleFocusIn(e: FocusEvent) {
			if (e.target instanceof HTMLElement && isTextInput(e.target)) {
				inputFocusedRef.current = true
				updateKeyboardState()
			}
		}

		function handleFocusOut() {
			inputFocusedRef.current = false
			updateKeyboardState()
		}

		function updateKeyboardState() {
			if (debounceRef.current) clearTimeout(debounceRef.current)
			debounceRef.current = setTimeout(() => {
				if (!inputFocusedRef.current) {
					setKeyboardHeight(0)
					return
				}

				// Use the smaller of visualViewport.height and window.innerHeight
				// to handle both "viewport resizes" and "viewport overlays" modes
				const currentHeight = vv
					? Math.min(vv.height, window.innerHeight)
					: window.innerHeight

				const diff = initialHeightRef.current - currentHeight

				if (diff > KEYBOARD_THRESHOLD) {
					setKeyboardHeight(diff)
				} else {
					setKeyboardHeight(0)
				}
			}, 100)
		}

		window.addEventListener('focusin', handleFocusIn)
		window.addEventListener('focusout', handleFocusOut)

		if (vv) {
			vv.addEventListener('resize', updateKeyboardState)
			vv.addEventListener('scroll', updateKeyboardState)
		}

		// Also listen for window resize (covers iOS PWA viewport resizing)
		window.addEventListener('resize', updateKeyboardState)

		return () => {
			window.removeEventListener('focusin', handleFocusIn)
			window.removeEventListener('focusout', handleFocusOut)
			window.removeEventListener('resize', updateKeyboardState)

			if (vv) {
				vv.removeEventListener('resize', updateKeyboardState)
				vv.removeEventListener('scroll', updateKeyboardState)
			}

			if (vk) {
				vk.overlaysContent = prevOverlaysContent
			}

			if (debounceRef.current) clearTimeout(debounceRef.current)
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

	const keyboardOpen = keyboardHeight > 0

	// When keyboard open: panel extends behind keyboard, spacer pushes input up
	// When keyboard closed: floating card with margins
	const panelHeight = keyboardOpen
		? `calc(${initialHeightRef.current - keyboardHeight}px * 0.85 + ${keyboardHeight}px)`
		: '85dvh'

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				{/* Overlay */}
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

					{/* Spacer behind keyboard — modal bg covers the accessory bar gap */}
					{keyboardOpen && (
						<div className="shrink-0" style={{ height: `${keyboardHeight}px` }} />
					)}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
