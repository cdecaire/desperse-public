/**
 * Followers/Following Modal
 * Shows a list of users following a profile or users the profile follows, with search functionality
 */

import { useState, useMemo, useEffect } from 'react'
import { Icon } from '@/components/ui/icon'
import { Link } from '@tanstack/react-router'
import { SearchIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useFollowersList, useFollowingList, useCollectorsList, useFollowMutation } from '@/hooks/useProfileQuery'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'

type FollowersModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  currentUserId?: string
  initialTab?: 'followers' | 'following' | 'collectors'
}

type TabType = 'followers' | 'following' | 'collectors'

export function FollowersModal({
  open,
  onOpenChange,
  userId,
  currentUserId,
  initialTab = 'followers',
}: FollowersModalProps) {
  const { isAuthenticated } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)

  // Sync activeTab with initialTab when modal opens
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab)
      setSearchQuery('')
    }
  }, [open, initialTab])

  const { data: followers, isLoading: isLoadingFollowers } = useFollowersList(
    activeTab === 'followers' ? userId : undefined,
    currentUserId
  )
  const { data: following, isLoading: isLoadingFollowing } = useFollowingList(
    activeTab === 'following' ? userId : undefined,
    currentUserId
  )
  const { data: collectors, isLoading: isLoadingCollectors } = useCollectorsList(
    activeTab === 'collectors' ? userId : undefined,
    currentUserId
  )

  const isLoading =
    activeTab === 'followers' ? isLoadingFollowers :
    activeTab === 'following' ? isLoadingFollowing :
    isLoadingCollectors
  const users =
    activeTab === 'followers' ? followers :
    activeTab === 'following' ? following :
    collectors

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!users) return []
    if (!searchQuery.trim()) return users

    const query = searchQuery.toLowerCase()
    return users.filter(
      (user) =>
        user.usernameSlug.toLowerCase().includes(query) ||
        user.displayName?.toLowerCase().includes(query)
    )
  }, [users, searchQuery])

  // Reset search when switching tabs
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    setSearchQuery('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => handleTabChange('followers')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'followers'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground/80'
            }`}
          >
            Followers
            {activeTab === 'followers' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-foreground rounded-full" />
            )}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('following')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'following'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground/80'
            }`}
          >
            Following
            {activeTab === 'following' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-foreground rounded-full" />
            )}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('collectors')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'collectors'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground/80'
            }`}
          >
            Collectors
            {activeTab === 'collectors' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-foreground rounded-full" />
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto min-h-0 mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? `No ${activeTab} found`
                : activeTab === 'followers'
                  ? 'No followers yet'
                  : activeTab === 'following'
                    ? 'Not following anyone yet'
                    : 'No collectors yet'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredUsers.map((user) => (
                <FollowerItem
                  key={user.id}
                  follower={user}
                  currentUserId={currentUserId}
                  isAuthenticated={isAuthenticated}
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

type FollowerItemProps = {
  follower: {
    id: string
    usernameSlug: string
    displayName: string | null
    avatarUrl: string | null
    isFollowingBack: boolean
  }
  currentUserId?: string
  isAuthenticated: boolean
  onNavigate?: () => void
}

function FollowerItem({
  follower,
  currentUserId,
  isAuthenticated,
  onNavigate,
}: FollowerItemProps) {
  const isOwnProfile = currentUserId === follower.id
  const [isFollowing, setIsFollowing] = useState(follower.isFollowingBack)
  const followMutation = useFollowMutation(
    follower.id,
    currentUserId || ''
  )

  // Sync with prop when it changes (e.g., query refetch)
  useEffect(() => {
    setIsFollowing(follower.isFollowingBack)
  }, [follower.isFollowingBack])

  const handleFollowToggle = async () => {
    if (!isAuthenticated || !currentUserId) return

    const newFollowState = !isFollowing
    setIsFollowing(newFollowState) // Optimistic update

    try {
      await followMutation.mutateAsync({
        action: newFollowState ? 'follow' : 'unfollow',
      })
      toast.success(newFollowState ? 'Following' : 'Unfollowed')
    } catch (error) {
      setIsFollowing(!newFollowState) // Revert on error
      toast.error(error instanceof Error ? error.message : 'Action failed')
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
      <Link
        to="/profile/$slug"
        params={{ slug: follower.usernameSlug }}
        onClick={() => {
          // Close modal when navigating to profile
          onNavigate?.()
        }}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        {/* Avatar */}
        <div className="size-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
          {follower.avatarUrl ? (
            <img
              src={follower.avatarUrl}
              alt={follower.displayName || follower.usernameSlug}
              className="w-full h-full object-cover"
            />
          ) : (
            <Icon name="user" variant="regular" className="text-lg text-muted-foreground" />
          )}
        </div>

        {/* Name and Username */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">
            {follower.displayName || follower.usernameSlug}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            @{follower.usernameSlug}
          </p>
        </div>
      </Link>

      {/* Action Buttons */}
      {isAuthenticated && currentUserId && !isOwnProfile && (
        <Button
          variant={isFollowing ? 'outline' : 'default'}
          onClick={(e) => {
            e.preventDefault()
            handleFollowToggle()
          }}
          disabled={followMutation.isPending}
        >
          {followMutation.isPending ? (
            <LoadingSpinner size="sm" />
          ) : isFollowing ? (
            'Unfollow'
          ) : (
            'Follow'
          )}
        </Button>
      )}
    </div>
  )
}

