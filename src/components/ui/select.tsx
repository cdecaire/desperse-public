import * as React from "react"
import {
	Select as SableSelect,
	SelectContent as SableSelectContent,
	SelectGroup as SableSelectGroup,
	SelectGroupLabel as SableSelectGroupLabel,
	SelectItem as SableSelectItem,
	SelectSeparator as SableSelectSeparator,
	SelectTrigger as SableSelectTrigger,
} from "@cdecaire/sable"
import { cn } from "@/lib/utils"

/**
 * Migration shim (Phase 2 — Sable adoption).
 *
 * The app's <Select*> now render @cdecaire/sable's Select (Base UI
 * `Select.Root` + `Trigger`/`Positioner`/`Popup`/`List`/`Item`/`Group`/
 * `GroupLabel`/`Separator`, motion-pop recipe) while keeping the LEGACY
 * Radix-shaped `Select*` API so existing call sites don't change.
 *
 * Name mapping (Radix Select → Sable Select):
 *   Select                → Select          (Base.Root; value/onValueChange/disabled pass through)
 *   SelectGroup           → SelectGroup     (Base.Group)
 *   SelectValue           → (marker only)   see note below
 *   SelectTrigger         → SelectTrigger   (Base.Trigger + composed Base.Value + chevron)
 *   SelectContent         → SelectContent   (Portal + Positioner + Popup + List, one elem)
 *   SelectLabel           → SelectGroupLabel(Base.GroupLabel)
 *   SelectItem            → SelectItem      (Base.Item + ItemText + ItemIndicator)
 *   SelectSeparator       → SelectSeparator (Base.Separator)
 *   SelectScrollUpButton  → no-op passthrough (Base UI auto-scrolls; unused)
 *   SelectScrollDownButton→ no-op passthrough (Base UI auto-scrolls; unused)
 *
 * KEY ADAPTATION — SelectValue:
 *   In the Radix API, callers render `<SelectTrigger><SelectValue placeholder="…" /></SelectTrigger>`,
 *   i.e. SelectValue is a CHILD of the trigger. Sable's SelectTrigger ALREADY
 *   composes its own `Base.Value` internally and instead takes a `placeholder`
 *   PROP. Passing a React element as Sable's trigger `children` would be wrong
 *   (Base.Value's `children` expects a render fn, not an element) and would
 *   suppress the selected-value label.
 *
 *   So the shim's `SelectValue` is a zero-render MARKER: it carries only the
 *   `placeholder` (and is otherwise inert). The shim's `SelectTrigger` inspects
 *   its children, lifts the `placeholder` off any `SelectValue` child, forwards
 *   it to Sable's trigger `placeholder` prop, and drops the marker from the DOM.
 *   Every current call site uses exactly `<SelectValue />` or
 *   `<SelectValue placeholder="…" />`, so this fully preserves behavior.
 *
 * Positioning: Sable's SelectContent accepts `side`/`align`/`sideOffset` (Base UI
 * positioner props). No call site passes them, so defaults apply.
 */

type SableSelectProps = React.ComponentProps<typeof SableSelect>

/**
 * Legacy callers pass `onValueChange: (value: string) => void`; Base UI's Select
 * fires `(value: string | null, eventDetails)`. Adapt so call sites stay unchanged.
 */
type SelectProps = Omit<SableSelectProps, "onValueChange"> & {
	onValueChange?: (value: string) => void
}
function Select({ onValueChange, ...props }: SelectProps) {
	return (
		<SableSelect
			onValueChange={
				onValueChange
					? (value) => onValueChange((value ?? "") as string)
					: undefined
			}
			{...props}
		/>
	)
}
Select.displayName = "Select"

const SelectGroup = SableSelectGroup

/**
 * Marker component for the legacy `SelectValue` slot. Renders nothing — the
 * selected-value label is rendered by Sable's <SelectTrigger> itself. The only
 * meaningful prop is `placeholder`, which the shim's SelectTrigger lifts off the
 * marker and forwards to Sable. See the file header for the full rationale.
 */
interface SelectValueProps {
	placeholder?: React.ReactNode
	className?: string
	children?: React.ReactNode
}
function SelectValue(_props: SelectValueProps) {
	return null
}
SelectValue.displayName = "SelectValue"

type SableSelectTriggerProps = React.ComponentProps<typeof SableSelectTrigger>

type SelectTriggerProps = Omit<SableSelectTriggerProps, "placeholder"> & {
	/** Optional explicit placeholder (also lifted from a <SelectValue> child). */
	placeholder?: React.ReactNode
}

const SelectTrigger = React.forwardRef<
	React.ComponentRef<typeof SableSelectTrigger>,
	SelectTriggerProps
>(({ className, children, placeholder, ...props }, ref) => {
	// Lift `placeholder` off a <SelectValue> child (legacy Radix composition).
	// Base UI allows a render-function child; only iterate the element form.
	let resolvedPlaceholder = placeholder
	if (typeof children !== "function") {
		React.Children.forEach(children, (child) => {
			if (
				React.isValidElement(child) &&
				(child.type as { displayName?: string })?.displayName === "SelectValue"
			) {
				const childPlaceholder = (child.props as SelectValueProps).placeholder
				if (childPlaceholder !== undefined) {
					resolvedPlaceholder = childPlaceholder
				}
			}
		})
	}

	return (
		<SableSelectTrigger
			ref={ref as SableSelectTriggerProps["ref"]}
			placeholder={resolvedPlaceholder}
			className={className}
			{...props}
		/>
	)
})
SelectTrigger.displayName = "SelectTrigger"

type SelectContentProps = React.ComponentProps<typeof SableSelectContent>

const SelectContent = React.forwardRef<
	React.ComponentRef<typeof SableSelectContent>,
	SelectContentProps
>(({ className, ...props }, ref) => (
	<SableSelectContent
		ref={ref as SelectContentProps["ref"]}
		className={cn(className)}
		{...props}
	/>
))
SelectContent.displayName = "SelectContent"

type SelectLabelProps = React.ComponentProps<typeof SableSelectGroupLabel>

const SelectLabel = React.forwardRef<
	React.ComponentRef<typeof SableSelectGroupLabel>,
	SelectLabelProps
>(({ className, ...props }, ref) => (
	<SableSelectGroupLabel
		ref={ref as SelectLabelProps["ref"]}
		className={className}
		{...props}
	/>
))
SelectLabel.displayName = "SelectLabel"

type SelectItemProps = React.ComponentProps<typeof SableSelectItem>

const SelectItem = React.forwardRef<
	React.ComponentRef<typeof SableSelectItem>,
	SelectItemProps
>(({ className, children, ...props }, ref) => (
	<SableSelectItem
		ref={ref as SelectItemProps["ref"]}
		className={className}
		{...props}
	>
		{children}
	</SableSelectItem>
))
SelectItem.displayName = "SelectItem"

type SelectSeparatorProps = React.ComponentProps<typeof SableSelectSeparator>

const SelectSeparator = React.forwardRef<
	React.ComponentRef<typeof SableSelectSeparator>,
	SelectSeparatorProps
>(({ className, ...props }, ref) => (
	<SableSelectSeparator
		ref={ref as SelectSeparatorProps["ref"]}
		className={className}
		{...props}
	/>
))
SelectSeparator.displayName = "SelectSeparator"

/**
 * No-op passthroughs for the legacy scroll-button names. Base UI's Select
 * auto-handles overflow scrolling inside the popup, so these have no Sable
 * equivalent. Kept only so the exports resolve. No current call site uses them.
 */
function SelectScrollUpButton(_props: { className?: string }) {
	return null
}
SelectScrollUpButton.displayName = "SelectScrollUpButton"

function SelectScrollDownButton(_props: { className?: string }) {
	return null
}
SelectScrollDownButton.displayName = "SelectScrollDownButton"

export {
	Select,
	SelectGroup,
	SelectValue,
	SelectTrigger,
	SelectContent,
	SelectLabel,
	SelectItem,
	SelectSeparator,
	SelectScrollUpButton,
	SelectScrollDownButton,
}
