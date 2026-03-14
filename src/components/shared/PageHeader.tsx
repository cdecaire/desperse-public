import type { ReactNode } from 'react'

interface PageHeaderProps {
	/** Page title — hidden on mobile by default (mobile uses MobileHeader) */
	title: string
	/** Optional description below the title */
	description?: ReactNode
	/** Show the title on mobile too (e.g. create page). Default: false */
	showOnMobile?: boolean
}

export function PageHeader({ title, description, showOnMobile = false }: PageHeaderProps) {
	return (
		<div className="space-y-2 mb-6">
			<h1 className={`text-xl font-bold ${showOnMobile ? '' : 'hidden md:block'}`}>
				{title}
			</h1>
			{description && (
				<p className="text-sm text-muted-foreground">{description}</p>
			)}
		</div>
	)
}
