import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type ContentLoadingSkeletonVariant = "list" | "detail" | "form" | "compact"

interface ContentLoadingSkeletonProps {
	className?: string
	label?: string
	rows?: number
	variant?: ContentLoadingSkeletonVariant
}

/** Shared, layout-reserving placeholder for cold page and content-region loads. */
export function ContentLoadingSkeleton({
	className,
	label = "Loading content",
	rows = 4,
	variant = "list",
}: ContentLoadingSkeletonProps) {
	return (
		<div
			aria-busy="true"
			aria-label={label}
			className={cn("w-full", variant === "compact" ? "py-3" : "py-6", className)}
			role="status"
		>
			<span className="sr-only">{label}</span>
			{variant === "detail" ? (
				<div className="space-y-6">
					<div className="space-y-2">
						<Skeleton className="h-8 w-2/5 max-w-72" />
						<Skeleton className="h-4 w-3/5 max-w-md" />
					</div>
					<Skeleton className="aspect-[16/9] w-full rounded-lg" />
					<div className="space-y-3">
						<Skeleton className="h-5 w-4/5" />
						<Skeleton className="h-5 w-3/5" />
					</div>
				</div>
			) : variant === "form" ? (
				<div className="space-y-6">
					{Array.from({ length: rows }, (_, index) => (
						<div className="space-y-2" key={index}>
							<Skeleton className="h-4 w-28" />
							<Skeleton className="h-10 w-full" />
						</div>
					))}
				</div>
			) : (
				<div className={cn("space-y-3", variant === "compact" && "space-y-2")}>
					{Array.from({ length: rows }, (_, index) => (
						<div
							className={cn(
								"flex items-center gap-3",
								variant === "compact" ? "min-h-10" : "min-h-16",
							)}
							data-testid="loading-row"
							key={index}
						>
							<Skeleton className={cn("shrink-0 rounded-md", variant === "compact" ? "size-8" : "size-12")} />
							<div className="min-w-0 flex-1 space-y-2">
								<Skeleton className="h-4 w-2/5" />
								<Skeleton className="h-3 w-3/5" />
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}
