import { createContext } from 'react'

/**
 * Whether the dev grid overlay is toggled on (⌘/Ctrl+Shift+G, handled in AppShell).
 *
 * AppShell's own `GridOverlay` only covers the main content area — it can't
 * represent the narrower grid inside a chrome-railed layout (settings/admin place
 * a fixed-width rail outside the grid, so their content pane is its own column
 * grid). Layouts like `SettingsLayout` read this to render a GridOverlay aligned
 * to their *local* pane grid instead.
 */
export const GridOverlayContext = createContext(false)
