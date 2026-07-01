import {
	Tabs as SableTabs,
	TabsList as SableTabsList,
	TabsPanel as SableTabsPanel,
	TabsTrigger as SableTabsTrigger,
} from "@cdecaire/sable"

/**
 * Migration shim (Phase 2 — Sable adoption).
 *
 * <Tabs> and friends now render @cdecaire/sable's Tabs (Base UI Tabs: roving
 * focus, arrow-key nav, ARIA tablist/tab/tabpanel wiring) while keeping the
 * LEGACY shadcn export surface so existing call sites don't change.
 *
 * Name/state adaptations (Radix → Base UI):
 *   - Radix `TabsPrimitive.Content` → Sable `TabsPanel`. Sable does NOT export
 *     `TabsContent`, so it's aliased below to preserve the legacy name.
 *   - Active-tab selector `data-[state=active]` is no longer needed here: Sable
 *     owns the active styling internally via Base UI's `data-active` attribute.
 *
 * Styling is adopted wholesale from Sable (the legacy shadcn classes are
 * intentionally dropped). Zero external call sites today — effectively dead —
 * but shimmed for consistency with the rest of the migration.
 */

const Tabs = SableTabs
const TabsList = SableTabsList
const TabsTrigger = SableTabsTrigger
// Legacy name preserved: Radix `TabsContent` → Sable `TabsPanel`.
const TabsContent = SableTabsPanel

export { Tabs, TabsList, TabsTrigger, TabsContent }
