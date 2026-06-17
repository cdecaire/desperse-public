/**
 * CategorySelector Component
 * Multi-select for preset categories (up to MAX_CATEGORIES), shown as removable
 * chips with a type-to-filter dropdown.
 *
 * Migration shim (Phase 2 — Sable adoption): rebuilt on @cdecaire/sable's
 * <MultiSelect> (Base UI Combobox, multiple mode). Base UI now owns the chips,
 * dropdown, type-to-filter, roving focus, ARIA combobox/listbox wiring, and
 * Esc/outside dismissal — replacing the hand-rolled listbox + manual
 * click-outside/Escape/arrow-key effects and the raw lucide icons.
 *
 * The selector's public value stays Category[] ({ display, key }); we map to/from
 * the category display strings for the MultiSelect, and enforce MAX_CATEGORIES by
 * disabling unselected items once the cap is reached.
 */

import {
	MultiSelect,
	MultiSelectContent,
	MultiSelectEmpty,
	MultiSelectInput,
	MultiSelectItem,
	MultiSelectList,
} from "@cdecaire/sable"
import { cn } from "@/lib/utils"
import {
	PRESET_CATEGORIES,
	MAX_CATEGORIES,
	type Category,
	normalizeCategoryKey,
} from "@/constants/categories"
import { Tooltip } from "@/components/ui/tooltip"

interface CategorySelectorProps {
	value: Category[]
	onChange: (categories: Category[]) => void
	disabled?: boolean
	className?: string
}

export function CategorySelector({
	value,
	onChange,
	disabled = false,
	className,
}: CategorySelectorProps) {
	const selectedDisplays = value.map((cat) => cat.display)
	const atMax = value.length >= MAX_CATEGORIES

	const handleValueChange = (displays: string[]) => {
		if (disabled) return
		// Allow any removal; block additions past the cap.
		if (displays.length <= MAX_CATEGORIES || displays.length < value.length) {
			onChange(
				displays.map((display) => ({
					display,
					key: normalizeCategoryKey(display),
				})),
			)
		}
	}

	return (
		<div className={cn("space-y-2", className)}>
			<div className="flex items-center justify-between">
				<Tooltip content={`Select up to ${MAX_CATEGORIES} categories.`}>
					<label className="text-sm font-medium cursor-help border-b border-dotted border-muted-foreground/40">
						Categories (optional)
					</label>
				</Tooltip>
				<span className="text-xs text-muted-foreground">
					{value.length}/{MAX_CATEGORIES} selected
				</span>
			</div>

			<MultiSelect
				items={PRESET_CATEGORIES}
				value={selectedDisplays}
				onValueChange={handleValueChange}
				disabled={disabled}
			>
				<MultiSelectInput placeholder="Select categories..." />
				<MultiSelectContent>
					<MultiSelectEmpty>No categories found.</MultiSelectEmpty>
					<MultiSelectList>
						{(item: string) => (
							<MultiSelectItem
								key={item}
								value={item}
								disabled={atMax && !selectedDisplays.includes(item)}
							>
								{item}
							</MultiSelectItem>
						)}
					</MultiSelectList>
				</MultiSelectContent>
			</MultiSelect>
		</div>
	)
}

export default CategorySelector
