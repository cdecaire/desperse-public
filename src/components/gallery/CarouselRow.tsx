/**
 * CarouselRow Component
 * Horizontal scroll row with mallow-style manual controls: prev/next arrow
 * buttons in the header (next to an optional "View all" action), a hidden
 * scrollbar, and edge fades. Works for any item width (cards or chips) — pass
 * pre-sized, shrink-0 children. Arrows scroll by ~one viewport; they disable at
 * the ends and the whole control group hides when content doesn't overflow.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'

interface CarouselRowProps {
  /** Section heading (h2) */
  title?: string
  /** Small label above the title, e.g. "Curated" */
  eyebrow?: string
  /** Right-aligned header slot, e.g. a "View all" <Link> */
  actions?: ReactNode
  /** Show prev/next arrow controls (auto-hidden when content fits) */
  arrows?: boolean
  /** Horizontal inset applied to header and scroll track */
  inset?: boolean
  children: ReactNode
  className?: string
}

const INSET = 'px-6 md:px-10'

export function CarouselRow({
  title,
  eyebrow,
  actions,
  arrows = true,
  inset = true,
  children,
  className,
}: CarouselRowProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const sync = useCallback((el: HTMLDivElement) => {
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanLeft(scrollLeft > 1)
    setCanRight(scrollLeft < scrollWidth - clientWidth - 1)
  }, [])

  // Keep arrow/fade state in sync with scroll position, resize, and content
  // changes (images loading in shift the scroll width).
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    sync(el)
    const onScroll = () => sync(el)
    el.addEventListener('scroll', onScroll, { passive: true })
    const ro = new ResizeObserver(() => sync(el))
    ro.observe(el)
    for (const child of Array.from(el.children)) ro.observe(child)
    return () => {
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
    }
  }, [sync])

  const scrollByViewport = (dir: 1 | -1) => {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  const showArrows = arrows && (canLeft || canRight)

  // Edge fades: mask the leading/trailing edge only when there's more to scroll.
  const fade = '2rem'
  const mask =
    canLeft || canRight
      ? `linear-gradient(to right, ${canLeft ? 'transparent' : '#000'}, #000 ${canLeft ? fade : '0'}, #000 ${canRight ? `calc(100% - ${fade})` : '100%'}, ${canRight ? 'transparent' : '#000'})`
      : undefined

  const hasHeader = !!(title || eyebrow || actions || arrows)

  return (
    <section className={className}>
      {hasHeader && (
        <div className={cn('flex items-end justify-between gap-4 mb-6', inset && INSET)}>
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-label-lg text-muted-foreground mb-1">{eyebrow}</p>
            )}
            {title && <h2 className="text-heading-2 truncate">{title}</h2>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {showArrows && (
              // Borderless icon buttons with a circle hover — light-weight so they
              // sit comfortably beside the text "View all" link.
              <div className="hidden sm:flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollByViewport(-1)}
                  disabled={!canLeft}
                  aria-label="Scroll left"
                  className="size-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:pointer-events-none motion-interactive focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
                >
                  <Icon name="arrow-left" variant="regular" className="text-sm" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollByViewport(1)}
                  disabled={!canRight}
                  aria-label="Scroll right"
                  className="size-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:pointer-events-none motion-interactive focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
                >
                  <Icon name="arrow-right" variant="regular" className="text-sm" />
                </button>
              </div>
            )}
            {actions && <div className="ml-1">{actions}</div>}
          </div>
        </div>
      )}

      <div
        ref={trackRef}
        style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
        className={cn(
          'flex gap-4 overflow-x-auto overflow-y-hidden scrollbar-hide scroll-smooth',
          inset && INSET
        )}
      >
        {children}
      </div>
    </section>
  )
}
