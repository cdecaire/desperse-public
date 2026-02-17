/**
 * Activity Modal
 * Shows a chronological feed of user's activity: posts created, likes, collected items, and purchases
 * Only visible to the user themselves (privacy)
 */

import { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { SearchIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useUserPosts, useUserLikes, useUserComments, useUserCollections } from '@/hooks/useProfileQuery'
import { type PostCardData } from '@/components/feed/PostCard'
import { type MediaType } from '@/components/feed/PostMedia'

type ActivityModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
}

type ActivityItem = {
  id: string
  type: 'post' | 'like' | 'commented' | 'collected' | 'bought'
  timestamp: Date
  post: PostCardData
}

// Detect media type from URL
function detectMediaType(url: string): MediaType {
  const extension = url.split('.').pop()?.toLowerCase()?.split('?')[0]
  
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(extension || '')) {
    return 'image'
  }
  if (['mp4', 'webm', 'mov'].includes(extension || '')) {
    return 'video'
  }
  if (['mp3', 'wav', 'ogg', 'aac'].includes(extension || '')) {
    return 'audio'
  }
  if (['pdf', 'zip'].includes(extension || '')) {
    return 'document'
  }
  if (['glb', 'gltf'].includes(extension || '')) {
    return '3d'
  }
  
  return 'image' // Default fallback
}

export function ActivityModal({
  open,
  onOpenChange,
  userId,
}: ActivityModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  
  const { data: postsData, isLoading: isLoadingPosts } = useUserPosts(userId)
  const { data: likes, isLoading: isLoadingLikes } = useUserLikes(userId)
  const { data: comments, isLoading: isLoadingComments } = useUserComments(userId)
  const { data: collectedData, isLoading: isLoadingCollected } = useUserCollections(userId)

  // Flatten infinite query pages
  const posts = postsData?.pages.flatMap((page) => page.posts) ?? []
  const collected = collectedData?.pages.flatMap((page) => page.posts) ?? []

  const isLoading = isLoadingPosts || isLoadingLikes || isLoadingComments || isLoadingCollected

  // Combine all activities into a single chronological list
  const activities = useMemo(() => {
    const items: ActivityItem[] = []

    // Add posts (created by user)
    posts.forEach((post) => {
      items.push({
        id: `post-${post.id}`,
        type: 'post',
        timestamp: new Date(post.createdAt),
        post,
      })
    })

    // Add likes (user liked these posts)
    if (likes) {
      likes.forEach((post) => {
        items.push({
          id: `like-${post.id}`,
          type: 'like',
          timestamp: new Date(post.createdAt), // Use post creation date as proxy for like time
          post,
        })
      })
    }

    // Add comments (user commented on these posts)
    if (comments) {
      comments.forEach((post) => {
        items.push({
          id: `comment-${post.id}`,
          type: 'commented',
          timestamp: new Date(post.createdAt), // Use post creation date as proxy for comment time
          post,
        })
      })
    }

    // Add collected items (free collectibles)
    collected.forEach((post) => {
      // Only include collectibles (not editions, which are "bought")
      if (post.type === 'collectible') {
        items.push({
          id: `collected-${post.id}`,
          type: 'collected',
          timestamp: new Date(post.createdAt),
          post,
        })
      }
    })

    // Add bought items (paid editions)
    // Editions in collected array are purchases (bought items)
    collected.forEach((post) => {
      if (post.type === 'edition') {
        items.push({
          id: `bought-${post.id}`,
          type: 'bought',
          timestamp: new Date(post.createdAt),
          post,
        })
      }
    })

    // Sort by timestamp (newest first)
    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }, [posts, likes, comments, collected])

  // Filter activities based on search query
  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return activities

    const query = searchQuery.toLowerCase()
    return activities.filter(
      (activity) =>
        activity.post.caption?.toLowerCase().includes(query) ||
        activity.post.user?.usernameSlug.toLowerCase().includes(query) ||
        activity.post.user?.displayName?.toLowerCase().includes(query)
    )
  }, [activities, searchQuery])


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Activity</h2>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search activity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Activities List */}
        <div className="flex-1 overflow-y-auto min-h-0 mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery 
                ? 'No activity found' 
                : 'No activity yet'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredActivities.map((activity) => (
                <ActivityItem
                  key={activity.id}
                  activity={activity}
                  onNavigate={() => onOpenChange(false)}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

type ActivityItemProps = {
  activity: ActivityItem
  onNavigate?: () => void
}

function ActivityItem({
  activity,
  onNavigate,
}: ActivityItemProps) {
  const mediaType = detectMediaType(activity.post.mediaUrl)
  const user = activity.post.user
  const thumbnailUrl = activity.post.coverUrl || activity.post.mediaUrl

  return (
    <Link
      to="/post/$postId"
      params={{ postId: activity.post.id }}
      onClick={() => {
        // Close modal when navigating to post
        onNavigate?.()
      }}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors relative"
    >
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-md overflow-hidden bg-muted shrink-0">
        {mediaType === 'image' || mediaType === 'video' ? (
          <img
            src={thumbnailUrl}
            alt={activity.post.caption || 'Post'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : activity.post.coverUrl ? (
          // Use cover image if available for non-displayable media types
          <img
            src={activity.post.coverUrl}
            alt={activity.post.caption || 'Post'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : mediaType === 'audio' ? (
          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-muted to-muted/50">
            <i className="fa-regular fa-music text-2xl text-muted-foreground/50" />
          </div>
        ) : mediaType === 'document' ? (
          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-muted to-muted/50">
            <i className="fa-regular fa-file-pdf text-2xl text-muted-foreground/50" />
          </div>
        ) : mediaType === '3d' ? (
          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-muted to-muted/50">
            <i className="fa-regular fa-cube text-2xl text-muted-foreground/50" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-muted to-muted/50">
            <i className="fa-regular fa-file text-2xl text-muted-foreground/50" />
          </div>
        )}
      </div>

      {/* Activity Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {user && (
            <>
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName || user.usernameSlug}
                  className="w-3 h-3 rounded-full"
                />
              ) : (
                <i className="fa-regular fa-user text-[8px] text-muted-foreground" />
              )}
              <p className="text-sm font-semibold truncate">
                {user.displayName || user.usernameSlug}
              </p>
              <span className="text-xs text-muted-foreground">•</span>
            </>
          )}
          <span className="text-xs font-medium text-muted-foreground">
            {getActivityLabel(activity.type)}
          </span>
        </div>
        {activity.post.caption && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {activity.post.caption}
          </p>
        )}
      </div>
      
      {/* Activity type icon - top right of row */}
      <i className={`${getActivityIcon(activity.type)} absolute top-3 right-3 text-base text-foreground`} />
    </Link>
  )
}

function getActivityLabel(type: ActivityItem['type']): string {
  switch (type) {
    case 'post':
      return 'Posted'
    case 'like':
      return 'Liked'
    case 'commented':
      return 'Commented'
    case 'collected':
      return 'Collected'
    case 'bought':
      return 'Bought'
  }
}

function getActivityIcon(type: ActivityItem['type']): string {
  switch (type) {
    case 'post':
      return 'fa-regular fa-circle-plus'
    case 'like':
      return 'fa-regular fa-heart'
    case 'commented':
      return 'fa-regular fa-comment'
    case 'collected':
      return 'fa-regular fa-gem'
    case 'bought':
      return 'fa-regular fa-wallet'
  }
}

