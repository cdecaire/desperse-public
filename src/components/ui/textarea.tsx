import * as React from "react"
import {
	Textarea as SableTextarea,
	type TextareaProps as SableTextareaProps,
} from "@cdecaire/sable"

/**
 * Migration shim (Phase 2 — Sable adoption).
 *
 * The app's <Textarea> now renders @cdecaire/sable's Textarea (a styled native
 * multi-line `<textarea>`: rounded-sm, card surface, 2px focus ring,
 * aria-invalid → destructive border) while keeping the LEGACY shadcn API so
 * existing call sites (~11 files) don't change:
 *   - Props are the full native `<textarea>` set
 *     (React.ComponentProps<"textarea">), forwarded to the underlying element.
 *   - `data-slot="textarea"` is preserved (legacy callers/styles keyed on it).
 *
 * Sable adopts its own styling — every prop passes through to the host textarea,
 * so `placeholder`, `value`/`onChange`, `disabled`, `aria-invalid`, `maxLength`,
 * `id`, etc. work unchanged. Known visual deltas to audit when fanning out:
 * Sable uses `bg-card`/`border-input` (vs legacy `bg-zinc-50 dark:bg-zinc-800` +
 * border-border), `min-h-[80px]` (legacy `min-h-16` ≈ 64px), `ring-ring/40`
 * focus ring (legacy `ring-ring/30`), and drops the legacy
 * `field-sizing-content` auto-grow. The aria-invalid error treatment is
 * preserved (border only; legacy also tinted the ring).
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<SableTextarea
			data-slot="textarea"
			className={className}
			{...(props as SableTextareaProps)}
		/>
	)
}

export { Textarea }
