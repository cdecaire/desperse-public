import { Checkbox as SableCheckbox } from "@cdecaire/sable"

/**
 * Migration shim (Phase 2 — Sable adoption).
 *
 * The app's <Checkbox> now renders @cdecaire/sable's Checkbox (Base UI
 * `Checkbox.Root` + `Checkbox.Indicator`, with the motion-interactive recipe)
 * while keeping the LEGACY (Radix-era) API so existing call sites don't change.
 *
 * API preserved:
 *   - checked?: boolean
 *   - defaultChecked?: boolean
 *   - onCheckedChange?: (checked: boolean) => void   ← single-arg (see adapter)
 *   - disabled?: boolean
 *   - id?: string
 *   - name?: string
 *   - className?: string
 *   - aria-label?: string
 *
 * Callback adaptation: Radix's onCheckedChange was
 * `(checked: boolean | "indeterminate") => void`; Base UI / Sable is
 * `(checked: boolean, eventDetails) => void`. Every Desperse call site already
 * treats the argument as a plain boolean (the one that wrote
 * `onCheckedChange={(checked) => set(checked === true)}` still type-checks and
 * behaves correctly against a boolean). We narrow the public type to
 * `(checked: boolean) => void` and drop the extra Base UI event arg internally.
 *
 * VISUAL / BEHAVIOR DELTAS (flagged — see report):
 *   - Indicator: the legacy checkbox drew a custom FA `circle` (unchecked) +
 *     `circle-check` (checked) using Desperse's own <Icon>. Sable instead draws a
 *     soft-square box surface (border-input/bg-card → primary when checked) and a
 *     `check` glyph rendered via Sable's INJECTED icon set. This is a deliberate
 *     adoption of Sable's surface — the round look is gone.
 *   - Sable's checkmark renders through Sable's <Icon name="check">, which needs a
 *     Sable <IconProvider> mounted in the app tree. Until that provider is wired,
 *     the box state colors still show but the check glyph will be blank.
 *   - `indeterminate` is now genuinely supported by Sable (renders a dash); the
 *     legacy component had no indeterminate state. Forwarded through `...props`.
 */

interface CheckboxProps {
	id?: string
	name?: string
	checked?: boolean
	defaultChecked?: boolean
	onCheckedChange?: (checked: boolean) => void
	disabled?: boolean
	indeterminate?: boolean
	className?: string
	"aria-label"?: string
}

function Checkbox({ checked, onCheckedChange, ...props }: CheckboxProps) {
	return (
		<SableCheckbox
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
Checkbox.displayName = "Checkbox"

export { Checkbox }
