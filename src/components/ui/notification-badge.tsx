/**
 * NotificationBadge Component
 * Display notification counts and alert indicators
 */

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const notificationBadgeVariants = cva(
  'flex items-center justify-center rounded-full font-semibold',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
      },
      size: {
        default: 'min-w-[20px] h-5 px-1.5 text-xs',
        sm: 'min-w-[16px] h-4 px-1 text-[10px]',
        dot: 'w-2.5 h-2.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

interface NotificationBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof notificationBadgeVariants> {
  /** The count to display. Not used for 'dot' size. */
  count?: number
  /** Maximum count before showing "99+". Defaults to 99. */
  max?: number
}

function NotificationBadge({
  className,
  variant,
  size,
  count,
  max = 99,
  ...props
}: NotificationBadgeProps) {
  // For dot size, don't render any content
  if (size === 'dot') {
    return (
      <span
        data-slot="notification-badge"
        className={cn(notificationBadgeVariants({ variant, size, className }))}
        {...props}
      />
    )
  }

  // Format the count
  const displayCount = count !== undefined
    ? count > max
      ? `${max}+`
      : count.toString()
    : undefined

  return (
    <span
      data-slot="notification-badge"
      className={cn(notificationBadgeVariants({ variant, size, className }))}
      {...props}
    >
      {displayCount}
    </span>
  )
}

export { NotificationBadge, notificationBadgeVariants }
