/**
 * Liked Posts Modal
 * Shows a list of posts liked by a user, with search functionality
 */

import { useState, useMemo } from 'react'
import { Icon } from '@/components/ui/icon'
import { Link } from '@tanstack/react-router'
import { SearchIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useUserLikes } from '@/hooks/useProfileQuery'
import { type PostCardData } from '@/components/feed/PostCard'
import { type MediaType } from '@/components/feed/PostMedia'

type LikedPostsModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
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

export function LikedPostsModal({
  open,
  onOpenChange,
  userId,
}: LikedPostsModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  
  const { data: posts, isLoading } = useUserLikes(userId)

  // Filter posts based on search query
  const filteredPosts = useMemo(() => {
    if (!posts) return []
    if (!searchQuery.trim()) return posts

    const query = searchQuery.toLowerCase()
    return posts.filter(
      (post) =>
        post.caption?.toLowerCase().includes(query) ||
        post.user?.usernameSlug.toLowerCase().includes(query) ||
        post.user?.displayName?.toLowerCase().includes(query)
    )
  }, [posts, searchQuery])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Liked Posts</h2>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Posts List */}
        <div className="flex-1 overflow-y-auto min-h-0 mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery 
                ? 'No posts found' 
                : 'No liked posts yet'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredPosts.map((post) => (
                <LikedPostItem
                  key={post.id}
                  post={post}
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

type LikedPostItemProps = {
  post: PostCardData
  onNavigate?: () => void
}

function LikedPostItem({
  post,
  onNavigate,
}: LikedPostItemProps) {
  const mediaType = detectMediaType(post.mediaUrl)
  const user = post.user
  const thumbnailUrl = post.coverUrl || post.mediaUrl

  return (
    <Link
      to="/post/$postId"
      params={{ postId: post.id }}
      onClick={() => {
        // Close modal when navigating to post
        onNavigate?.()
      }}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
    >
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center relative">
        {mediaType === 'image' || mediaType === 'video' ? (
          <img
            src={thumbnailUrl}
            alt={post.caption || 'Post'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : mediaType === 'audio' ? (
          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-muted to-muted/50">
            <Icon name="music" variant="regular" className="text-2xl text-muted-foreground/50" />
          </div>
        ) : mediaType === 'document' ? (
          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-muted to-muted/50">
            <Icon name="file-pdf" variant="regular" className="text-2xl text-muted-foreground/50" />
          </div>
        ) : mediaType === '3d' ? (
          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-muted to-muted/50">
            <Icon name="cube" variant="regular" className="text-2xl text-muted-foreground/50" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-muted to-muted/50">
            <Icon name="file" variant="regular" className="text-2xl text-muted-foreground/50" />
          </div>
        )}
        {/* Media type indicator */}
        {mediaType === 'video' && (
          <div className="absolute top-1 right-1">
            <div className="w-4 h-4 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <Icon name="play" className="text-[8px] text-white" />
            </div>
          </div>
        )}
        {mediaType === 'audio' && (
          <div className="absolute top-1 right-1">
            <div className="w-4 h-4 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <Icon name="music" className="text-[8px] text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Post Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {user && (
            <>
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName || user.usernameSlug}
                  className="w-4 h-4 rounded-full"
                />
              ) : (
                <Icon name="user" variant="regular" className="text-[10px] text-muted-foreground" />
              )}
              <p className="text-sm font-semibold truncate">
                {user.displayName || user.usernameSlug}
              </p>
            </>
          )}
        </div>
        {post.caption && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {post.caption}
          </p>
        )}
      </div>
    </Link>
  )
}

