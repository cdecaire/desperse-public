/**
 * CategoryPill Component
 * Display and interact with post categories
 *
 * Usage examples:
 *
 * Display (read-only):
 *   <CategoryPill>Photography</CategoryPill>
 *
 * Link (with router Link):
 *   <CategoryPill variant="link" asChild>
 *     <Link to="/category/photography">Photography</Link>
 *   </CategoryPill>
 *
 * Interactive (selectable):
 *   <CategoryPill variant="interactive" selected={isSelected} onClick={toggle}>
 *     Photography
 *   </CategoryPill>
 */

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const categoryPillVariants = cva(
  'inline-flex items-center rounded-full font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
  {
    variants: {
      variant: {
        display: 'bg-muted/30 text-muted-foreground/70',
        link: 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer',
        interactive: 'border bg-muted/50 text-foreground border-border hover:bg-muted hover:border-muted-foreground/30',
      },
      size: {
        default: 'px-2 py-0.5 text-xs',
        lg: 'px-3 py-1.5 text-sm',
      },
      selected: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      // Interactive + selected state
      {
        variant: 'interactive',
        selected: true,
        className: 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:border-primary',
      },
    ],
    defaultVariants: {
      variant: 'display',
      size: 'default',
      selected: false,
    },
  }
)

type CategoryPillProps = React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof categoryPillVariants> & {
    /** Render as a custom element using Slot (e.g., wrap a Link component) */
    asChild?: boolean
    /** Disabled state (only applies to interactive variant) */
    disabled?: boolean
  }

const CategoryPill = React.forwardRef<HTMLElement, CategoryPillProps>(
  (
    {
      className,
      variant,
      size,
      selected,
      asChild = false,
      disabled = false,
      ...props
    },
    ref
  ) => {
    // Determine the base element
    // - asChild: use Slot for composition
    // - interactive: use button
    // - otherwise: use span
    const isInteractive = variant === 'interactive'

    if (asChild) {
      return (
        <Slot
          ref={ref as React.Ref<HTMLElement>}
          data-slot="category-pill"
          className={cn(
            categoryPillVariants({ variant, size, selected, className }),
            disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
          )}
          {...props}
        />
      )
    }

    if (isInteractive) {
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          type="button"
          data-slot="category-pill"
          disabled={disabled}
          className={cn(
            categoryPillVariants({ variant, size, selected, className }),
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        />
      )
    }

    return (
      <span
        ref={ref as React.Ref<HTMLSpanElement>}
        data-slot="category-pill"
        className={cn(
          categoryPillVariants({ variant, size, selected, className }),
          disabled && 'opacity-50'
        )}
        {...props}
      />
    )
  }
)
CategoryPill.displayName = 'CategoryPill'

export { CategoryPill, categoryPillVariants }
