import { type ReactNode, useContext } from 'react'
import { Col, Columns, GridOverlay } from '@cdecaire/sable/layout'
import { GridOverlayContext } from './GridOverlayContext'

interface SettingsLayoutProps {
	/** Desktop sub-nav rail (a Sable `SideNav`). Hidden below md. */
	nav: ReactNode
	/** Page content (settings forms, plus the mobile header/menu). */
	children: ReactNode
	/**
	 * Wide content — data tables / dashboards (e.g. admin/moderation): the pane caps
	 * at `wide` (1280px) and content fills all 12 columns. Default false: the pane
	 * caps at `content` (896px) and content narrows to 8 columns at xl+ (forms).
	 */
	wide?: boolean
}

/**
 * Desperse-owned two-rail settings/admin shell.
 *
 * Composes a sticky, fixed-width chrome rail (the `nav` — a Sable `SideNav`) flush
 * against the app `Sidebar`, i.e. OUTSIDE the 12-column content grid, plus a capped
 * content pane that is ITS OWN 12-column grid. The app Sidebar lives in `AppShell`'s
 * slot and this rail sits at the start of `<main>`, so the two read as one continuous
 * left chrome region rather than a sub-nav floating inside the centered content grid.
 *
 * The pane width is purpose-driven: forms (settings) cap at `content` (896) and use 8
 * columns; tables/dashboards (admin, `wide`) cap at `wide` (1280) and fill 12 columns.
 *
 * Toggling the dev overlay (⌘/Ctrl+Shift+G) renders a `GridOverlay` over THIS pane
 * (via `GridOverlayContext`), since AppShell's overlay only covers the full content
 * area. Used by both settings (`/settings/account/*`) and admin (`/admin/*`).
 */
export function SettingsLayout({ nav, children, wide = false }: SettingsLayoutProps) {
	const showGrid = useContext(GridOverlayContext)
	return (
		<div className="flex w-full min-h-screen items-start">
			{/* Chrome rail — desktop only, flush to the app Sidebar, full-height divider.
			    No top padding: the rail's first header sits in its own h-16 zone (see
			    SettingsNav) so it lines up with the Sidebar's h-16 logo header. */}
			<aside
				className="hidden md:flex shrink-0 self-stretch border-r border-border/80"
				style={{ width: 'var(--sidebar-width)' }}
			>
				<div className="sticky top-4 w-full px-3 pb-4">{nav}</div>
			</aside>

			{/* Content pane — caps at `content` (896, forms) or `wide` (1280, tables) and
			    places content on its own 12-col grid: forms narrow to 8 cols at xl+ (empty
			    cols form the right margin), tables fill all 12. max-width is an inline
			    style so it never depends on a JIT-scanned arbitrary class. Sub-sections
			    place their own Cols (e.g. profile-info's paired fields); the pane
			    GridOverlay matches this grid. */}
			<div
				className="relative min-w-0 flex-1"
				style={{
					maxWidth: wide ? 'var(--region-wide)' : 'var(--region-content)',
				}}
			>
				{showGrid && <GridOverlay />}
				<Columns count={12} style={{ paddingInline: 'var(--page-inset)' }}>
					<Col span={wide ? 12 : { base: 12, xl: 8 }}>{children}</Col>
				</Columns>
			</div>
		</div>
	)
}

export default SettingsLayout
