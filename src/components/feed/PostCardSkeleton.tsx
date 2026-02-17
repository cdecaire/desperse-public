/**
 * PostCardSkeleton Component
 * Loading skeleton for PostCard
 */

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface PostCardSkeletonProps {
  showHeader?: boolean
  className?: string
}

export function PostCardSkeleton({ 
  showHeader = true,
  className 
}: PostCardSkeletonProps) {
  return (
    <div className={cn('', className)}>
      {/* Header skeleton */}
      {showHeader && (
        <div className="flex items-center gap-3 px-2 py-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      )}
      
      {/* Media skeleton */}
      <Skeleton className="w-full aspect-square" />
      
      {/* Content skeleton */}
      <div className="px-2 py-3 space-y-3">
        {/* Action button skeleton */}
        <Skeleton className="h-8 w-24" />
        
        {/* Caption skeleton */}
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  )
}

/**
 * Multiple skeletons for feed loading
 */
interface FeedSkeletonProps {
  count?: number
}

export function FeedSkeleton({ count = 3 }: FeedSkeletonProps) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  )
}

export default PostCardSkeleton

