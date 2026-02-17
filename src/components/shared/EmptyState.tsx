import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'

interface EmptyStateProps {
  title: string
  description?: string
  /** Primary action - either a link config object or a custom ReactNode */
  action?:
    | {
        label: string
        to: string
      }
    | ReactNode
  /** Secondary action - optional, only when helpful */
  secondaryAction?: {
    label: string
    to: string
  }
  /** Support text - smaller, muted, shown below actions */
  supportText?: string
  icon?: ReactNode
}

export function EmptyState({
  title,
  description,
  action,
  secondaryAction,
  supportText,
  icon,
}: EmptyStateProps) {
  // Check if action is a link config object or a ReactNode
  const isLinkAction = action && typeof action === 'object' && 'label' in action && 'to' in action

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-[360px] mx-auto">
      {/* Icon - 12px gap to title */}
      {icon && <div className="mb-3 text-muted-foreground">{icon}</div>}

      {/* Title - 8px gap to description */}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>

      {/* Description - 16px gap to actions */}
      {description && (
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {action && (
            isLinkAction ? (
              <Button asChild className="w-full sm:w-auto">
                <Link to={action.to}>{action.label}</Link>
              </Button>
            ) : (
              action
            )
          )}
          {secondaryAction && (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to={secondaryAction.to}>{secondaryAction.label}</Link>
            </Button>
          )}
        </div>
      )}

      {/* Support text */}
      {supportText && (
        <p className="text-xs text-muted-foreground mt-6">
          {supportText}
        </p>
      )}
    </div>
  )
}

export default EmptyState
