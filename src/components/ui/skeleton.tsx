import { Skeleton as SableSkeleton } from "@cdecaire/sable"

/**
 * Migration shim (Phase 2 — Sable adoption).
 *
 * The app's <Skeleton> now renders @cdecaire/sable's Skeleton (a muted,
 * pulsing placeholder block) while keeping the LEGACY shadcn API so existing
 * call sites don't change: still a plain function component taking
 * `ComponentProps<"div">` (className + any div attrs), shape styled by callers.
 *
 * Sable owns the styling now: `motion-shimmer rounded-md bg-muted` replaces the
 * legacy `bg-accent animate-pulse rounded-md`. The legacy `data-slot="skeleton"`
 * attribute is preserved so any CSS/selectors keyed on it keep matching.
 */

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <SableSkeleton data-slot="skeleton" className={className} {...props} />
  )
}

export { Skeleton }
