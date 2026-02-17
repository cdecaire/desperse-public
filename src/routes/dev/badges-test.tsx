/**
 * Development route to test badge/pill UI components
 * Route: /dev/badges-test
 *
 * Showcases the consolidated badge and pill components used across the app.
 */

import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { NotificationBadge } from '@/components/ui/notification-badge'
import { MediaPill } from '@/components/ui/media-pill'
import { CategoryPill } from '@/components/ui/category-pill'

export const Route = createFileRoute('/dev/badges-test')({
  component: BadgesTestPage,
})

// Demo component for CategoryPill with interactive state
function CategoryPillDemo() {
  const [selected, setSelected] = useState<string[]>(['Photography'])
  const categories = ['Photography', 'Digital Art', 'Music', 'Video', '3D']

  const toggleCategory = (cat: string) => {
    setSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        CategoryPill
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-normal">src/components/ui/category-pill.tsx</code>
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Used in: PostCard categories, Post detail categories, CategorySelector form
      </p>
      <div className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground mb-2">Display variant (read-only)</p>
          <div className="flex flex-wrap gap-1.5">
            <CategoryPill>Photography</CategoryPill>
            <CategoryPill>Digital Art</CategoryPill>
            <CategoryPill>Music</CategoryPill>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">Link variant (with asChild + Link)</p>
          <div className="flex flex-wrap gap-1.5">
            <CategoryPill variant="link" asChild>
              <Link to="/tag/photography">Photography</Link>
            </CategoryPill>
            <CategoryPill variant="link" asChild>
              <Link to="/tag/digital-art">Digital Art</Link>
            </CategoryPill>
            <CategoryPill variant="link" asChild>
              <Link to="/tag/music">Music</Link>
            </CategoryPill>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">Interactive variant (selectable, size=lg)</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <CategoryPill
                key={cat}
                variant="interactive"
                size="lg"
                selected={selected.includes(cat)}
                onClick={() => toggleCategory(cat)}
              >
                {cat}
              </CategoryPill>
            ))}
            <CategoryPill variant="interactive" size="lg" disabled>
              Disabled
            </CategoryPill>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Selected: {selected.length > 0 ? selected.join(', ') : 'none'}
          </p>
        </div>
      </div>
    </div>
  )
}

function BadgesTestPage() {
  return (
    <div className="py-6 max-w-5xl mx-auto px-4">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Badge & Pill Components</h1>
          <p className="text-muted-foreground">
            Consolidated badge and pill components used throughout the application.
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            BADGE COMPONENT
        ═══════════════════════════════════════════════════════════════════════ */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-1">Badge</h2>
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">src/components/ui/badge.tsx</code>
          <p className="text-sm text-muted-foreground mt-2 mb-4">
            General-purpose status badges for labels, tags, and state indicators.
            Used in: Admin report status, report reason tags.
          </p>

          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Default size</p>
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Small size</p>
              <div className="flex flex-wrap gap-2">
                <Badge size="sm">Default</Badge>
                <Badge size="sm" variant="secondary">Secondary</Badge>
                <Badge size="sm" variant="destructive">Destructive</Badge>
                <Badge size="sm" variant="success">Success</Badge>
                <Badge size="sm" variant="warning">Warning</Badge>
                <Badge size="sm" variant="outline">Outline</Badge>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Use case: Report status</p>
              <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg">
                <Badge variant="warning">open</Badge>
                <Badge variant="success">resolved</Badge>
                <Badge variant="secondary">rejected</Badge>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Use case: Report reasons</p>
              <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg">
                <Badge variant="destructive">spam</Badge>
                <Badge variant="destructive">harassment</Badge>
                <Badge variant="destructive">copyright</Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* ═══════════════════════════════════════════════════════════════════════
            NOTIFICATION BADGE COMPONENT
        ═══════════════════════════════════════════════════════════════════════ */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-1">NotificationBadge</h2>
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">src/components/ui/notification-badge.tsx</code>
          <p className="text-sm text-muted-foreground mt-2 mb-4">
            Notification count badges and alert indicators.
            Used in: FeedTabs, Sidebar nav, BottomNav.
          </p>

          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Default variant (sizes)</p>
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-2">
                  <span className="text-sm">Default:</span>
                  <NotificationBadge count={5} />
                  <NotificationBadge count={42} />
                  <NotificationBadge count={100} />
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-sm">Small:</span>
                  <NotificationBadge size="sm" count={5} />
                  <NotificationBadge size="sm" count={100} />
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-sm">Dot:</span>
                  <NotificationBadge size="dot" />
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Destructive variant</p>
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-2">
                  <span className="text-sm">Default:</span>
                  <NotificationBadge variant="destructive" count={5} />
                  <NotificationBadge variant="destructive" count={42} />
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-sm">Small:</span>
                  <NotificationBadge variant="destructive" size="sm" count={5} />
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-sm">Dot:</span>
                  <NotificationBadge variant="destructive" size="dot" />
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Use case: Navigation items</p>
              <div className="flex items-center gap-6 p-3 bg-muted/30 rounded-lg">
                <span className="relative inline-flex items-center gap-2">
                  <i className="fa-regular fa-bell text-xl" />
                  Notifications
                  <NotificationBadge count={3} className="ml-1" />
                </span>
                <span className="relative">
                  <i className="fa-regular fa-bell text-xl" />
                  <NotificationBadge variant="destructive" size="dot" className="absolute -top-0.5 -right-0.5" />
                </span>
                <span className="relative">
                  <i className="fa-regular fa-shield-halved text-xl" />
                  <NotificationBadge variant="destructive" size="sm" count={12} className="absolute -top-1 -right-2" />
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* ═══════════════════════════════════════════════════════════════════════
            MEDIA PILL COMPONENT
        ═══════════════════════════════════════════════════════════════════════ */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-1">MediaPill</h2>
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">src/components/ui/media-pill.tsx</code>
          <p className="text-sm text-muted-foreground mt-2 mb-4">
            Overlay pills on media showing price, status, and edition info.
            Used in: PostCard media overlay, Post detail media overlay.
          </p>

          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Variants</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <div className="relative bg-zinc-800 rounded-lg p-6">
                  <div className="absolute right-3 top-3">
                    <MediaPill variant="dark">0.5 SOL</MediaPill>
                  </div>
                  <div className="h-8" />
                  <span className="text-xs text-zinc-400">dark (editions)</span>
                </div>
                <div className="relative bg-zinc-800 rounded-lg p-6">
                  <div className="absolute right-3 top-3">
                    <MediaPill variant="muted">SOLD OUT</MediaPill>
                  </div>
                  <div className="h-8" />
                  <span className="text-xs text-zinc-400">muted (sold out)</span>
                </div>
                <div className="relative bg-zinc-800 rounded-lg p-6">
                  <div className="absolute right-3 top-3">
                    <MediaPill variant="tone" toneColor="var(--tone-collectible)">FREE</MediaPill>
                  </div>
                  <div className="h-8" />
                  <span className="text-xs text-zinc-400">tone (collectible)</span>
                </div>
                <div className="relative bg-zinc-800 rounded-lg p-6">
                  <div className="absolute right-3 top-3">
                    <MediaPill variant="tone" toneColor="var(--tone-edition)">SOLD</MediaPill>
                  </div>
                  <div className="h-8" />
                  <span className="text-xs text-zinc-400">tone (edition)</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Use case: Combined status + price</p>
              <div className="relative bg-zinc-800 rounded-lg p-8 max-w-sm">
                <div className="absolute right-3 top-3 flex gap-1.5">
                  <MediaPill variant="tone" toneColor="var(--tone-edition)">SOLD</MediaPill>
                  <MediaPill variant="dark">1.0 SOL</MediaPill>
                </div>
                <div className="h-16" />
              </div>
            </div>
          </div>
        </Card>

        {/* ═══════════════════════════════════════════════════════════════════════
            CATEGORY PILL COMPONENT
        ═══════════════════════════════════════════════════════════════════════ */}
        <Card className="p-6">
          <CategoryPillDemo />
        </Card>

        {/* ═══════════════════════════════════════════════════════════════════════
            OTHER UI ELEMENTS
        ═══════════════════════════════════════════════════════════════════════ */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Other UI Elements</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Additional pill/badge-like elements that use inline styles.
          </p>

          <div className="space-y-6">
            {/* Post Type Inline */}
            <div>
              <h3 className="text-sm font-medium mb-2">Post Type Indicators (inline)</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Inline text indicators for post types in PostCard header. Uses tone CSS variables.
              </p>
              <div className="flex flex-wrap gap-6 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>@artist</span>
                  <span>·</span>
                  <span>2h</span>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-[var(--tone-collectible)]">
                    <i className="fa-regular fa-gem text-[10px]" />
                    Collectible
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>@creator</span>
                  <span>·</span>
                  <span>5h</span>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-[var(--tone-edition)]">
                    <i className="fa-regular fa-layer-group text-[10px]" />
                    Edition of 10
                  </span>
                </div>
              </div>
            </div>

            {/* Hidden Badge */}
            <div>
              <h3 className="text-sm font-medium mb-2">Hidden Content Indicator (inline)</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Inline indicator for hidden/moderated content in PostCard header.
              </p>
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>@username</span>
                  <span>·</span>
                  <span>2h</span>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-destructive">
                    <i className="fa-regular fa-eye-slash text-[10px]" />
                    Hidden
                  </span>
                </div>
              </div>
            </div>

            {/* New Posts Toast */}
            <div>
              <h3 className="text-sm font-medium mb-2">New Posts Toast (floating)</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Floating button that appears when new posts are available.
              </p>
              <div className="flex justify-center p-8 bg-muted/30 rounded-lg">
                <button className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/10 hover:scale-105 transition-transform">
                  <i className="fa-solid fa-arrow-up text-sm" />
                  <div className="flex -space-x-2">
                    <div className="w-7 h-7 rounded-full bg-muted ring-2 ring-primary flex items-center justify-center text-xs font-medium">A</div>
                    <div className="w-7 h-7 rounded-full bg-muted ring-2 ring-primary flex items-center justify-center text-xs font-medium" style={{ zIndex: 1 }}>B</div>
                    <div className="w-7 h-7 rounded-full bg-muted ring-2 ring-primary flex items-center justify-center text-xs font-medium" style={{ zIndex: 0 }}>C</div>
                  </div>
                  <span className="text-sm font-semibold pr-2">Posted</span>
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* ═══════════════════════════════════════════════════════════════════════
            COMPONENT SUMMARY
        ═══════════════════════════════════════════════════════════════════════ */}
        <Card className="p-6 bg-muted/30">
          <h2 className="text-lg font-semibold mb-4">Component Summary</h2>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div>
                <h3 className="font-medium">Badge</h3>
                <p className="text-muted-foreground text-xs">
                  6 variants (default, secondary, destructive, success, warning, outline) × 2 sizes
                </p>
              </div>
              <div>
                <h3 className="font-medium">NotificationBadge</h3>
                <p className="text-muted-foreground text-xs">
                  2 variants (default, destructive) × 3 sizes (default, sm, dot)
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <h3 className="font-medium">MediaPill</h3>
                <p className="text-muted-foreground text-xs">
                  3 variants (dark, muted, tone with custom color)
                </p>
              </div>
              <div>
                <h3 className="font-medium">CategoryPill</h3>
                <p className="text-muted-foreground text-xs">
                  3 variants (display, link, interactive) × 2 sizes + selected state
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border/50">
            <h3 className="font-medium mb-2">Design Standards</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• All badges/pills use <code>rounded-full</code> for consistency</li>
              <li>• Default font size is <code>text-xs</code> (12px), compact uses <code>text-[10px]</code></li>
              <li>• Colors use semantic tokens (--tone-*, bg-primary, bg-destructive)</li>
              <li>• CategoryPill uses polymorphic <code>asChild</code> pattern for router Links</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  )
}
