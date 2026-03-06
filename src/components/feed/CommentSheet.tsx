/**
 * CommentSheet Component
 * Bottom sheet wrapper for comments on mobile devices.
 * Uses the existing Sheet (Radix Dialog) with side="bottom".
 */

import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'
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
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="bottom"
				showClose={false}
				className="h-[85vh] flex flex-col rounded-t-2xl px-0"
			>
				<SheetHeader className="px-4 pb-2 pt-1 shrink-0">
					{/* Drag handle */}
					<div className="mx-auto w-10 h-1 rounded-full bg-muted-foreground/30 mb-1" />
					<SheetTitle className="sr-only">Comments</SheetTitle>
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

				{/* Fixed input at bottom */}
				{isAuthenticated && (
					<div className="shrink-0 border-t border-border px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
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
