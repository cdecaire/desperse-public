import * as React from "react"
import {
  Label as SableLabel,
  type LabelProps as SableLabelProps,
} from "@cdecaire/sable"

/**
 * Migration shim (Phase 2 — Sable adoption).
 *
 * The app's <Label> now renders @cdecaire/sable's Label (a styled native
 * `<label>`) while keeping the LEGACY shadcn API so existing call sites don't
 * change. The original was a `React.forwardRef<HTMLLabelElement, ComponentProps<"label">>`,
 * so we preserve a forwardRef wrapper that forwards to Sable's ref-aware `<label>`.
 *
 * Sable owns the styling now: it applies `text-label-lg text-foreground select-none`
 * plus the `peer-disabled` dimming, replacing the legacy
 * `text-sm font-medium leading-none peer-disabled:*` classes.
 */

// Widened (Sable 0.6.0) to forward Sable's paired `size` (xs | sm | md | lg) and
// `hint` (dotted-underline tooltip affordance) on top of the native `<label>` API.
// Backward-compatible: both are optional, so existing call sites are unaffected.
type LabelProps = React.ComponentProps<"label"> &
  Pick<SableLabelProps, "size" | "hint">

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <SableLabel
      ref={ref as SableLabelProps["ref"]}
      className={className}
      {...props}
    />
  )
)
Label.displayName = "Label"

export { Label }
