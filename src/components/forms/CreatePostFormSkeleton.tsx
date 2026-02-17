/**
 * CreatePostFormSkeleton Component
 * Loading skeleton for the Create Post form
 */

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface CreatePostFormSkeletonProps {
  className?: string
}

export function CreatePostFormSkeleton({ className }: CreatePostFormSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Media Upload Section */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
      
      {/* Caption Section */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-24 w-full rounded-md" />
        <div className="flex justify-end">
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      
      {/* Post Type Selector Section */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
      
      {/* Action Buttons Section */}
      <div className="pt-4 border-t border-border space-y-3">
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    </div>
  )
}

