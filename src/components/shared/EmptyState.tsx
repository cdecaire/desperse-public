import type { ReactNode } from 'react'
import { EmptyState as SableEmptyState } from '@cdecaire/sable'
import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'

/**
 * Migration shim (Phase 2 — Sable adoption).
 *
 * Renders @cdecaire/sable's <EmptyState> (centered icon-disc + title +
 * description + action) while preserving this app's richer API so all call
 * sites stay unchanged:
 *   - `action` may be a { label, to } link-config OR a raw ReactNode.
 *   - `secondaryAction` ({ label, to }) and `supportText` have no Sable
 *     equivalent, so they're composed into Sable's single `action` slot.
 *
 * Visual note: Sable wraps the icon in a soft muted disc (the old component
 * rendered a bare muted glyph), and title/description styling comes from the
 * design system now. Worth an eyeball across the ~16 empty states.
 */

type LinkAction = { label: string; to: string }

interface EmptyStateProps {
	title: string
	description?: string
	/** Primary action - either a link config object or a custom ReactNode */
	action?: LinkAction | ReactNode
	/** Secondary action - optional, only when helpful */
	secondaryAction?: LinkAction
	/** Support text - smaller, muted, shown below actions */
	supportText?: string
	icon?: ReactNode
}

function isLinkAction(value: unknown): value is LinkAction {
	return (
		!!value &&
		typeof value === 'object' &&
		'label' in value &&
		'to' in value
	)
}

export function EmptyState({
	title,
	description,
	action,
	secondaryAction,
	supportText,
	icon,
}: EmptyStateProps) {
	const hasActions = action != null || secondaryAction != null

	// Sable exposes one `action` slot; fold the primary/secondary buttons and the
	// support line into it so the whole block stays inside Sable's centered layout.
	const actionSlot =
		hasActions || supportText ? (
			<div className="flex flex-col items-center gap-6">
				{hasActions && (
					<div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
						{action != null &&
							(isLinkAction(action) ? (
								<Button asChild className="w-full sm:w-auto">
									<Link to={action.to}>{action.label}</Link>
								</Button>
							) : (
								action
							))}
						{secondaryAction && (
							<Button asChild variant="outline" className="w-full sm:w-auto">
								<Link to={secondaryAction.to}>{secondaryAction.label}</Link>
							</Button>
						)}
					</div>
				)}
				{supportText && (
					<p className="text-caption text-muted-foreground">{supportText}</p>
				)}
			</div>
		) : undefined

	return (
		<SableEmptyState
			icon={icon}
			title={title}
			description={description}
			action={actionSlot}
		/>
	)
}

export default EmptyState
