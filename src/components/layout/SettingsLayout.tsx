import { type ReactNode, useContext } from 'react'
import { Col, Columns, GridOverlay } from '@cdecaire/sable/layout'
import { GridOverlayContext } from './GridOverlayContext'

interface SettingsLayoutProps {
	/** Desktop sub-nav rail (a Sable `SideNav`). Hidden below md. */
	nav: ReactNode
	/** Page content (settings forms, plus the mobile header/menu). */
	children: ReactNode
	/**
	 * Wide content - data tables / dashboards (e.g. admin/moderation): content fills
	 * all 12 columns. Default false: forms use 9 columns and keep a right margin.
	 */
	wide?: boolean
}

/**
 * Desperse-owned two-rail settings/admin shell.
 *
 * Composes a sticky, fixed-width chrome rail (the `nav` - a Sable `SideNav`) flush
 * against the app `Sidebar`, i.e. outside the 12-column content grid, plus a capped
 * content pane that is its own 12-column grid. The app Sidebar lives in `AppShell`'s
 * slot and this rail sits at the start of `<main>`, so the two read as one continuous
 * left chrome region rather than a sub-nav floating inside the centered content grid.
 *
 * The pane uses the wide region so Sable fieldsets and media controls have enough
 * room to breathe. Form pages use 9 columns; tables/dashboards (`wide`) fill all 12.
 *
 * Toggling the dev overlay (Cmd/Ctrl+Shift+G) renders a `GridOverlay` over this pane
 * (via `GridOverlayContext`), since AppShell's overlay only covers the full content
 * area. Used by settings (`/settings/account/*`, `/settings/help`) and admin (`/admin/*`).
 */
export function SettingsLayout({ nav, children, wide = false }: SettingsLayoutProps) {
	const showGrid = useContext(GridOverlayContext)
	return (
		<div className="flex w-full min-h-screen items-start">
			{/* Chrome rail - desktop only, flush to the app Sidebar, full-height divider.
			    No top padding: the rail's first header sits in its own h-16 zone (see
			    SettingsNav) so it lines up with the Sidebar's h-16 logo header. */}
			<aside
				className="hidden md:flex shrink-0 self-stretch border-r border-border/80"
				style={{ width: 'var(--sidebar-width)' }}
			>
				<div className="sticky top-4 w-full px-3 pb-4">{nav}</div>
			</aside>

			{/* Content pane - places content on its own 12-col grid. Form pages keep a
			    deliberate right margin at xl+; tables fill all 12. max-width is an inline
			    style so it never depends on a JIT-scanned arbitrary class. */}
			<div
				className="relative min-w-0 flex-1"
				style={{
					maxWidth: 'var(--region-wide)',
				}}
			>
				{showGrid && <GridOverlay />}
				<Columns count={12} style={{ paddingInline: 'var(--page-inset)' }}>
					<Col span={wide ? 12 : { base: 12, xl: 9 }}>{children}</Col>
				</Columns>
			</div>
		</div>
	)
}

export default SettingsLayout
