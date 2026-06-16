import * as React from "react"
import { Input as SableInput, type InputProps as SableInputProps } from "@cdecaire/sable"

/**
 * Migration shim (Phase 2 — Sable adoption).
 *
 * The app's <Input> now renders @cdecaire/sable's Input (a styled native
 * `<input>`: rounded-sm, 8px, card surface, 2px focus ring, aria-invalid →
 * destructive treatment) while keeping the LEGACY shadcn API so existing call
 * sites (~18 files) don't change:
 *   - Props are the full native `<input>` set (React.ComponentProps<"input">),
 *     forwarded to the underlying element exactly as before.
 *   - `data-slot="input"` is preserved (legacy callers/styles keyed on it).
 *
 * Sable adopts its own styling — every prop passes through to the host input,
 * so `type`, `placeholder`, `value`/`onChange`, `disabled`, `readOnly`,
 * `aria-invalid`, `inputMode`, `step`/`min`/`max`, `accept`, `id`, etc. work
 * unchanged. Known visual deltas to audit when fanning out: Sable uses
 * `bg-card`/`border-input` (vs legacy `bg-zinc-50 dark:bg-zinc-800` +
 * border-border), a non-responsive `h-[40px]` (legacy was also h-10 ≈ 40px),
 * `ring-ring/40` focus ring (legacy `ring-ring/30`), and drops the legacy
 * `file:` button styling. The aria-invalid error treatment is preserved.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<SableInput
			data-slot="input"
			type={type}
			className={className}
			{...(props as SableInputProps)}
		/>
	)
}

export { Input }
