/**
 * MediaPill Component
 * Overlay pills for media showing price, status, and edition info
 */

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const mediaPillVariants = cva(
  'inline-flex items-center h-6 px-3 rounded-full font-semibold backdrop-blur-sm text-white text-[10px] tracking-[0.2px]',
  {
    variants: {
      variant: {
        dark: 'bg-zinc-950/85',
        muted: 'bg-zinc-700',
        tone: '', // Background set via toneColor prop
      },
    },
    defaultVariants: {
      variant: 'dark',
    },
  }
)

interface MediaPillProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof mediaPillVariants> {
  /** CSS color value for 'tone' variant (e.g., 'var(--tone-edition)' or '#10b981') */
  toneColor?: string
}

function MediaPill({
  className,
  variant,
  toneColor,
  style,
  ...props
}: MediaPillProps) {
  // Merge toneColor into style when using 'tone' variant
  const mergedStyle: React.CSSProperties = {
    ...style,
    ...(variant === 'tone' && toneColor ? { backgroundColor: toneColor } : {}),
  }

  return (
    <div
      data-slot="media-pill"
      className={cn(mediaPillVariants({ variant, className }))}
      style={mergedStyle}
      {...props}
    />
  )
}

export { MediaPill, mediaPillVariants }
