import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  className?: string
  /** Preferred position of the tooltip relative to the trigger (will auto-adjust if not enough space) */
  position?: 'top' | 'bottom'
}

const TOOLTIP_GAP = 8
const VIEWPORT_PADDING = 12

export function Tooltip({ children, content, className, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const tooltipRef = React.useRef<HTMLDivElement>(null)
  const [tooltipStyle, setTooltipStyle] = React.useState<React.CSSProperties>({})

  // Ensure we only render portal on client
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Update tooltip position when visible
  React.useEffect(() => {
    if (!isVisible || !triggerRef.current) return

    const updatePosition = () => {
      if (!triggerRef.current) return
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const tooltipEl = tooltipRef.current

      // Get viewport dimensions
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      // Get tooltip dimensions (use estimated size if not yet rendered)
      const tooltipWidth = tooltipEl?.offsetWidth || 200
      const tooltipHeight = tooltipEl?.offsetHeight || 100

      // Determine vertical position (prefer the specified position, but flip if needed)
      let actualPosition = position
      const spaceAbove = triggerRect.top - TOOLTIP_GAP
      const spaceBelow = viewportHeight - triggerRect.bottom - TOOLTIP_GAP

      if (position === 'bottom' && spaceBelow < tooltipHeight && spaceAbove > tooltipHeight) {
        actualPosition = 'top'
      } else if (position === 'top' && spaceAbove < tooltipHeight && spaceBelow > tooltipHeight) {
        actualPosition = 'bottom'
      }

      // Calculate vertical position
      const top = actualPosition === 'top'
        ? triggerRect.top - TOOLTIP_GAP
        : triggerRect.bottom + TOOLTIP_GAP

      // Calculate horizontal position (centered on trigger)
      let left = triggerRect.left + triggerRect.width / 2
      let transformX = '-50%'

      // Check horizontal overflow and adjust
      const tooltipLeft = left - tooltipWidth / 2
      const tooltipRight = left + tooltipWidth / 2

      if (tooltipLeft < VIEWPORT_PADDING) {
        // Would overflow left - align to left edge with padding
        left = VIEWPORT_PADDING
        transformX = '0%'
      } else if (tooltipRight > viewportWidth - VIEWPORT_PADDING) {
        // Would overflow right - align to right edge with padding
        left = viewportWidth - VIEWPORT_PADDING
        transformX = '-100%'
      }

      setTooltipStyle({
        position: 'fixed',
        top,
        left,
        transform: actualPosition === 'top'
          ? `translate(${transformX}, -100%)`
          : `translateX(${transformX})`,
      })
    }

    // Initial position calculation
    updatePosition()

    // Recalculate after tooltip renders to get accurate dimensions
    const rafId = requestAnimationFrame(updatePosition)

    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isVisible, position])

  const tooltipContent = (
    <div
      ref={tooltipRef}
      className={cn(
        "z-9999 p-4 text-xs text-popover-foreground bg-popover border border-border rounded-xl shadow-lg w-max max-w-[calc(100vw-24px)]",
        className
      )}
      style={tooltipStyle}
      role="tooltip"
    >
      {content}
    </div>
  )

  return (
    <div className="relative inline-flex items-center">
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="inline-flex items-center"
      >
        {children}
      </div>
      {isVisible && mounted && createPortal(tooltipContent, document.body)}
    </div>
  )
}

