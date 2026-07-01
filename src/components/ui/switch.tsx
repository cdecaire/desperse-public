import { Switch as SableSwitch } from "@cdecaire/sable"

/**
 * Migration shim (Phase 2 — Sable adoption).
 *
 * The app's <Switch> now renders @cdecaire/sable's Switch (Base UI `Switch.Root`
 * + `Switch.Thumb`, with the motion-interactive recipe) while keeping the LEGACY
 * bespoke API so existing call sites don't change.
 *
 * API preserved exactly:
 *   - checked?: boolean
 *   - onCheckedChange?: (checked: boolean) => void   ← single-arg (see adapter)
 *   - disabled?: boolean
 *   - id?: string
 *   - className?: string
 *   - aria-label?: string
 *
 * Callback adaptation: Base UI (and therefore Sable) calls
 * `onCheckedChange(checked, eventDetails)`. Every Desperse call site expects the
 * single-argument `(checked: boolean) => void` form, so we narrow the public type
 * and adapt internally — extra args are simply dropped. Existing callers are
 * unchanged.
 *
 * Behavior delta to note: Base UI renders a hidden native `<input>` + a `<span>`
 * host (not a `<button role="switch">`). ARIA / keyboard handling now come from
 * Base UI. State styling moved from the old controlled `checked ? ...` classes to
 * Sable's `data-[checked]` attribute styling — no call site relied on the old
 * classes, so this is transparent.
 */

interface SwitchProps {
	id?: string
	name?: string
	checked?: boolean
	onCheckedChange?: (checked: boolean) => void
	disabled?: boolean
	className?: string
	"aria-label"?: string
}

function Switch({ checked, onCheckedChange, ...props }: SwitchProps) {
	return (
		<SableSwitch
			checked={checked}
			// Adapt Base UI's (checked, eventDetails) → legacy (checked) signature.
			onCheckedChange={
				onCheckedChange
					? (next: boolean) => onCheckedChange(next)
					: undefined
			}
			{...props}
		/>
	)
}
Switch.displayName = "Switch"

export { Switch }
