/** Format a date as a compact relative time string (e.g. "now", "2m", "1h", "3d", "2w", "Jan 15") */
export function formatRelativeTime(date: Date | string): string {
	const now = new Date()
	const then = new Date(date)
	const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

	if (seconds < 60) return 'now'
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
	if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
	if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w`

	return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
