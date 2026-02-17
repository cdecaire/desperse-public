/**
 * Post category constants and validation
 * Categories are content-based (not mime-type based)
 */

export const PRESET_CATEGORIES = [
  'Comics',
  'Illustration',
  'Digital Art',
  'Photography',
  '3D / CG',
  'Animation / Motion',
  'Design',
  'Video',
  'Music',
  'Writing',
  'Education',
  'Memes',
] as const

export type CategoryPreset = typeof PRESET_CATEGORIES[number]

export interface Category {
  display: string  // User-provided display (preserves casing)
  key: string     // Normalized key for matching (lowercase, trimmed, spaces collapsed)
}

export const MAX_CATEGORIES = 3

// Character whitelist for categories (letters, numbers, spaces, dashes, ampersand, slash)
export const CATEGORY_CHAR_REGEX = /^[A-Za-z0-9 &\-\/]+$/

/**
 * Normalize a category string for comparison/matching
 */
export function normalizeCategoryKey(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, ' ')  // Collapse multiple spaces to single
    .toLowerCase()
}

/**
 * Convert a category to a URL-safe slug
 * "3D / CG" → "3d-cg", "Animation / Motion" → "animation-motion"
 */
export function categoryToSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, '-')  // Replace " / " with "-"
    .replace(/\s+/g, '-')       // Replace spaces with "-"
    .replace(/-+/g, '-')        // Collapse multiple dashes
}

/**
 * Find a preset category by its URL slug
 * Returns the display name if found, null otherwise
 */
export function getPresetBySlug(slug: string): CategoryPreset | null {
  return PRESET_CATEGORIES.find(
    preset => categoryToSlug(preset) === slug.toLowerCase()
  ) || null
}

/**
 * Validate and normalize categories
 * @param categories - Array of category objects or strings (for backward compatibility)
 * @returns Array of valid Category objects
 */
export function validateCategories(
  categories: Array<Category | string> | null | undefined
): Category[] {
  if (!categories || categories.length === 0) {
    return []
  }

  const validated: Category[] = []
  const seenKeys = new Set<string>()

  for (const cat of categories) {
    let display: string
    let key: string

    if (typeof cat === 'string') {
      // Backward compatibility: handle string inputs
      display = cat.trim()
      key = normalizeCategoryKey(display)
    } else {
      display = cat.display
      key = cat.key
    }

    // Skip if already seen this key
    if (seenKeys.has(key)) continue

    // Validate length (max 24 chars)
    if (display.length === 0 || display.length > 24) continue

    // Validate characters
    if (!CATEGORY_CHAR_REGEX.test(display)) continue

    // Check if it matches a preset (for canonical display)
    const matchingPreset = PRESET_CATEGORIES.find(
      preset => normalizeCategoryKey(preset) === key
    )

    // Use canonical preset display if available, otherwise keep user display
    const finalDisplay = matchingPreset || display

    validated.push({
      display: finalDisplay,
      key
    })

    seenKeys.add(key)

    // Enforce max limit
    if (validated.length >= MAX_CATEGORIES) break
  }

  return validated
}

/**
 * Convert categories to strings for backward compatibility
 */
export function categoriesToStrings(categories: Category[]): string[] {
  return categories.map(cat => cat.display)
}

/**
 * Convert strings to categories (for migration)
 */
export function stringsToCategories(categories: string[]): Category[] {
  return categories.map(display => ({
    display,
    key: normalizeCategoryKey(display)
  }))
}

/**
 * Get preset suggestions for autocomplete
 */
export function getPresetSuggestions(input: string): CategoryPreset[] {
  if (!input.trim()) return [...PRESET_CATEGORIES]

  const inputKey = normalizeCategoryKey(input)
  return PRESET_CATEGORIES.filter(preset =>
    normalizeCategoryKey(preset).includes(inputKey)
  )
}

/**
 * Check if a category string matches a preset category
 * Works with both display names ("3D / CG") and URL slugs ("3d-cg")
 */
export function isPresetCategory(category: string): boolean {
  const key = normalizeCategoryKey(category)
  const slug = category.toLowerCase()
  return PRESET_CATEGORIES.some(
    preset => normalizeCategoryKey(preset) === key || categoryToSlug(preset) === slug
  )
}

/**
 * Get the canonical preset display name for a category
 * Works with both display names ("3D / CG") and URL slugs ("3d-cg")
 * Returns null if not a preset category
 */
export function getPresetDisplay(category: string): CategoryPreset | null {
  const key = normalizeCategoryKey(category)
  const slug = category.toLowerCase()
  return PRESET_CATEGORIES.find(
    preset => normalizeCategoryKey(preset) === key || categoryToSlug(preset) === slug
  ) || null
}

