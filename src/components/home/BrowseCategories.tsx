/**
 * BrowseCategories Component
 * Discover section — an icon tile per preset category, linking into the
 * existing /category/$slug pages. Static navigation, never empty.
 */

import { Link } from '@tanstack/react-router'
import { Icon } from '@/components/ui/icon'
import { PRESET_CATEGORIES, categoryToSlug, type CategoryPreset } from '@/constants/categories'

// Category → icon, using only names in Desperse's registered set (@/lib/icons).
const CATEGORY_ICONS: Record<CategoryPreset, string> = {
  Comics: 'book',
  Illustration: 'image',
  'Digital Art': 'palette',
  Photography: 'camera',
  '3D / CG': 'cube',
  'Animation / Motion': 'sparkles',
  Design: 'compass',
  Video: 'video',
  Music: 'music',
  Writing: 'pencil',
  Education: 'bookmark',
  Memes: 'fire',
}

export function BrowseCategories() {
  return (
    <section className="px-6 md:px-10">
      <h2 className="text-heading-2 mb-6">Discover</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {PRESET_CATEGORIES.map((category) => (
          <Link
            key={category}
            to="/category/$categorySlug"
            params={{ categorySlug: categoryToSlug(category) }}
            className="group flex flex-col items-start gap-3 p-5 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
          >
            <span className="w-10 h-10 grid place-items-center rounded-full bg-muted text-foreground group-hover:bg-background transition-colors">
              <Icon name={CATEGORY_ICONS[category]} variant="regular" className="text-lg" />
            </span>
            <span className="text-title-sm">{category}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
