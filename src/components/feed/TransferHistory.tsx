/**
 * Transfer History Component
 * Shows provenance summary and recent transfer activity for minted posts
 */

import { useQuery } from '@tanstack/react-query'
import { getPostTransferHistory } from '@/server/functions/assetHistory'
import { Icon } from '@/components/ui/icon'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Link } from '@tanstack/react-router'
import { usePreferences } from '@/hooks/usePreferences'
import { getExplorerUrl } from '@/server/functions/preferences'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface TransferHistoryProps {
	postId: string
	postType: 'edition' | 'collectible'
}

export function TransferHistory({ postId, postType }: TransferHistoryProps) {
	const { preferences } = usePreferences()
	const { getAuthHeaders, isAuthenticated } = useAuth()
	const { user: currentUser } = useCurrentUser()

	const { data, isLoading } = useQuery({
		// Viewer included so a blocked-state result never leaks across viewers within staleTime.
		queryKey: ['post-transfer-history', postId, currentUser?.id ?? 'anon'],
		queryFn: async () => {
			const authHeaders = isAuthenticated ? await getAuthHeaders().catch(() => null) : null
			const result = await getPostTransferHistory({
				data: {
					postId,
					...(authHeaders ? { _authorization: authHeaders.Authorization } : {}),
				},
			} as any)

			if (!result.success) throw new Error(result.error)
			return result
		},
		staleTime: 2 * 60 * 1000,
		retry: false,
	})

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-6">
				<LoadingSpinner size="sm" />
			</div>
		)
	}

	if (!data?.summary) return null

	const { summary, transfers } = data

	const getTxUrl = (sig: string) => {
		const explorer = preferences?.explorer || 'solana-explorer'
		return getExplorerUrl('tx', sig, explorer)
	}

	return (
		<div>
			<div className="py-3 border-b border-border mb-1">
				<span className="text-sm font-medium text-foreground">
					Provenance
				</span>
			</div>

			{/* Summary stats */}
			<div className="grid grid-cols-3 gap-3 py-3">
				<div className="text-center">
					<div className="text-lg font-semibold text-foreground">
						{summary.totalMinted}
					</div>
					<div className="text-xs text-muted-foreground">
						{postType === 'edition' ? 'Editions' : 'Collected'}
					</div>
				</div>
				<div className="text-center">
					<div className="text-lg font-semibold text-foreground">
						{summary.collectorCount}
					</div>
					<div className="text-xs text-muted-foreground">Collectors</div>
				</div>
				<div className="text-center">
					<div className="text-sm font-medium text-foreground">
						{summary.latestActivity
							? formatDate(summary.latestActivity)
							: '-'}
					</div>
					<div className="text-xs text-muted-foreground">Latest</div>
				</div>
			</div>

			{/* Recent transfers */}
			{transfers && transfers.length > 0 && (
				<div className="border-t border-border pt-2">
					<div className="text-xs font-medium text-muted-foreground mb-2 pt-1">
						Recent activity
					</div>
					<div className="space-y-0">
						{transfers.map((transfer, i) => (
							<div
								key={`${transfer.txSignature}-${i}`}
								className="flex items-center justify-between py-2 text-sm"
							>
								<div className="flex items-center gap-2 min-w-0 flex-1">
									<Link
										to="/profile/$slug"
										params={{ slug: transfer.user.usernameSlug }}
										className="font-medium truncate hover:underline"
									>
										{transfer.user.displayName ||
											`@${transfer.user.usernameSlug}`}
									</Link>
									<span className="text-muted-foreground text-xs shrink-0">
										collected
									</span>
								</div>
								<div className="flex items-center gap-2 shrink-0 ml-2">
									<span className="text-xs text-muted-foreground">
										{formatDate(transfer.timestamp)}
									</span>
									{transfer.txSignature && (
										<a
											href={getTxUrl(transfer.txSignature)}
											target="_blank"
											rel="noopener noreferrer"
											className="text-muted-foreground hover:text-foreground"
											title="View transaction"
										>
											<Icon
												name="arrow-up-right-from-square"
												variant="regular"
												className="text-[10px]"
											/>
										</a>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}

function formatDate(dateStr: string): string {
	const date = new Date(dateStr)
	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

	if (diffDays === 0) return 'Today'
	if (diffDays === 1) return 'Yesterday'
	if (diffDays < 7) return `${diffDays}d ago`

	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
