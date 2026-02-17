/**
 * CategorySelector Component
 * Pill-based selector for preset categories only
 * Users can select up to MAX_CATEGORIES from the preset list
 */

import { cn } from '@/lib/utils'
import {
  PRESET_CATEGORIES,
  MAX_CATEGORIES,
  type Category,
  normalizeCategoryKey,
} from '@/constants/categories'
import { Tooltip } from '@/components/ui/tooltip'
import { CategoryPill } from '@/components/ui/category-pill'

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
  const canAddMore = value.length < MAX_CATEGORIES

  // Check if a preset is currently selected
  const isSelected = (preset: string): boolean => {
    const presetKey = normalizeCategoryKey(preset)
    return value.some(cat => cat.key === presetKey)
  }

  // Toggle a category selection
  const toggleCategory = (preset: string) => {
    if (disabled) return

    const presetKey = normalizeCategoryKey(preset)
    const isCurrentlySelected = value.some(cat => cat.key === presetKey)

    if (isCurrentlySelected) {
      // Remove it
      onChange(value.filter(cat => cat.key !== presetKey))
    } else if (canAddMore) {
      // Add it
      onChange([...value, { display: preset, key: presetKey }])
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <Tooltip content={`Select up to ${MAX_CATEGORIES} categories. Use #hashtags for custom topics.`}>
          <label className="text-sm font-medium cursor-help border-b border-dotted border-muted-foreground/40">
            Categories (optional)
          </label>
        </Tooltip>
        <span className="text-xs text-muted-foreground">
          {value.length}/{MAX_CATEGORIES} selected
        </span>
      </div>

      {/* Preset category pills */}
      <div className="flex flex-wrap gap-2">
        {PRESET_CATEGORIES.map((preset) => {
          const selected = isSelected(preset)
          const canSelect = selected || canAddMore

          return (
            <CategoryPill
              key={preset}
              variant="interactive"
              size="lg"
              selected={selected}
              disabled={disabled || !canSelect}
              onClick={() => toggleCategory(preset)}
            >
              {preset}
            </CategoryPill>
          )
        })}
      </div>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground">
        Use <span className="font-medium">#hashtags</span> in your caption for custom topics
      </p>
    </div>
  )
}

export default CategorySelector
