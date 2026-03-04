/**
 * CategorySelector Component
 * Multi-select dropdown with chips for preset categories
 * Users can select up to MAX_CATEGORIES from the preset list
 */

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import {
	PRESET_CATEGORIES,
	MAX_CATEGORIES,
	type Category,
	normalizeCategoryKey,
} from "@/constants/categories"
import { Tooltip } from "@/components/ui/tooltip"
import { Check, ChevronDown, X } from "lucide-react"

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
	const [open, setOpen] = useState(false)
	const containerRef = useRef<HTMLDivElement>(null)

	const canAddMore = value.length < MAX_CATEGORIES

	// Close on outside click
	useEffect(() => {
		if (!open) return
		function handleClick(e: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setOpen(false)
			}
		}
		document.addEventListener("mousedown", handleClick)
		return () => document.removeEventListener("mousedown", handleClick)
	}, [open])

	// Close on Escape
	useEffect(() => {
		if (!open) return
		function handleKey(e: KeyboardEvent) {
			if (e.key === "Escape") setOpen(false)
		}
		document.addEventListener("keydown", handleKey)
		return () => document.removeEventListener("keydown", handleKey)
	}, [open])

	const isSelected = (preset: string): boolean => {
		const presetKey = normalizeCategoryKey(preset)
		return value.some((cat) => cat.key === presetKey)
	}

	const toggleCategory = (preset: string) => {
		if (disabled) return

		const presetKey = normalizeCategoryKey(preset)
		const isCurrentlySelected = value.some((cat) => cat.key === presetKey)

		if (isCurrentlySelected) {
			onChange(value.filter((cat) => cat.key !== presetKey))
		} else if (canAddMore) {
			onChange([...value, { display: preset, key: presetKey }])
		}
	}

	const removeCategory = (key: string) => {
		if (disabled) return
		onChange(value.filter((cat) => cat.key !== key))
	}

	return (
		<div className={cn("space-y-2", className)} ref={containerRef}>
			<div className="flex items-center justify-between">
				<Tooltip
					content={`Select up to ${MAX_CATEGORIES} categories.`}
				>
					<label className="text-sm font-medium cursor-help border-b border-dotted border-muted-foreground/40">
						Categories (optional)
					</label>
				</Tooltip>
				<span className="text-xs text-muted-foreground">
					{value.length}/{MAX_CATEGORIES} selected
				</span>
			</div>

			{/* Trigger / chip area */}
			<div className="relative">
				<button
					type="button"
					disabled={disabled}
					onClick={() => setOpen((prev) => !prev)}
					className={cn(
						"flex w-full min-h-[42px] items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors",
						"hover:border-muted-foreground/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
						open && "border-muted-foreground/50 ring-1 ring-ring/20",
						disabled && "opacity-50 cursor-not-allowed",
					)}
				>
					<div className="flex flex-1 flex-wrap items-center gap-1.5">
						{value.length === 0 && (
							<span className="text-muted-foreground">
								Select categories...
							</span>
						)}
						{value.map((cat) => (
							<span
								key={cat.key}
								className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium"
							>
								{cat.display}
								<span
									role="button"
									tabIndex={0}
									onClick={(e) => {
										e.stopPropagation()
										removeCategory(cat.key)
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.stopPropagation()
											removeCategory(cat.key)
										}
									}}
									className="ml-0.5 rounded-full hover:bg-primary/20 p-0.5 cursor-pointer"
								>
									<X className="h-3 w-3" />
								</span>
							</span>
						))}
					</div>
					<ChevronDown
						className={cn(
							"h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
							open && "rotate-180",
						)}
					/>
				</button>

				{/* Dropdown list */}
				{open && (
					<div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-md overflow-hidden">
						<div className="max-h-[240px] overflow-y-auto py-1">
							{PRESET_CATEGORIES.map((preset) => {
								const selected = isSelected(preset)
								const canSelect = selected || canAddMore

								return (
									<button
										key={preset}
										type="button"
										disabled={disabled || !canSelect}
										onClick={() => toggleCategory(preset)}
										className={cn(
											"flex w-full items-center justify-between px-3 py-2.5 text-sm transition-colors",
											"hover:bg-accent/50",
											selected && "font-medium",
											!canSelect &&
												"opacity-40 cursor-not-allowed",
										)}
									>
										<span>{preset}</span>
										{selected && (
											<Check className="h-4 w-4 text-primary shrink-0" />
										)}
									</button>
								)
							})}
						</div>
					</div>
				)}
			</div>

			</div>
	)
}

export default CategorySelector
