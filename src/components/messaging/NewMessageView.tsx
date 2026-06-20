/**
 * NewMessageView Component
 * Inline user search for starting a new conversation
 */

import { useState, useCallback, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Entity } from '@cdecaire/sable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { useGetOrCreateThread, type Thread } from '@/hooks/useMessages'
import { useDmEligibility } from '@/hooks/useDmEligibility'
import { useMentionSearch, type MentionUser } from '@/hooks/useMentionSearch'
import { UnlockMessagingCard } from './UnlockMessagingCard'
import { useDebounce } from '@/hooks/useDebounce'
import { Icon } from '@/components/ui/icon'
import { UserAvatar } from '@/components/shared/UserAvatar'
import type { PendingMessageUser } from './MessagingContext'

interface NewMessageViewProps {
  onBack: () => void
  onClose: () => void
  onThreadCreated: (thread: Thread) => void
  initialUser?: PendingMessageUser | null
}

export function NewMessageView({ onBack, onClose, onThreadCreated, initialUser }: NewMessageViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<MentionUser | null>(null)

  // Set initial user when provided (e.g., from MessageButton unlock flow)
  useEffect(() => {
    if (initialUser) {
      setSelectedUser({
        id: initialUser.id,
        usernameSlug: initialUser.usernameSlug,
        displayName: initialUser.displayName,
        avatarUrl: initialUser.avatarUrl,
      })
    }
  }, [initialUser])
  const debouncedQuery = useDebounce(searchQuery, 300)

  const getOrCreateThread = useGetOrCreateThread()

  // Search users
  const { data: searchResults, isLoading: isSearching } = useMentionSearch(
    debouncedQuery.length >= 2 ? debouncedQuery : undefined,
    debouncedQuery.length >= 2
  )

  // Check eligibility for selected user
  const { data: eligibility, isLoading: isCheckingEligibility } = useDmEligibility(
    selectedUser?.id || null
  )

  const handleSelectUser = useCallback((user: MentionUser) => {
    setSelectedUser(user)
    setSearchQuery('')
  }, [])

  const handleStartConversation = useCallback(async () => {
    if (!selectedUser || !eligibility?.allowed) return

    try {
      const result = await getOrCreateThread.mutateAsync({
        otherUserId: selectedUser.id,
        contextCreatorId: selectedUser.id,
      })

      if (result.thread) {
        onThreadCreated(result.thread as Thread)
      }
    } catch (error) {
      console.error('Failed to create thread:', error)
    }
  }, [selectedUser, eligibility, getOrCreateThread, onThreadCreated])

  const handleBack = () => {
    if (selectedUser) {
      setSelectedUser(null)
    } else {
      onBack()
    }
  }

  const displayName = selectedUser?.displayName || selectedUser?.usernameSlug || ''
  const profilePath = selectedUser?.usernameSlug ? `/profile/${selectedUser.usernameSlug}` : null

  return (
    <div className="flex flex-col h-full">
      {/* Header - changes based on whether user is selected */}
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0 bg-background">
        <Button variant="ghost" size="icon" onClick={handleBack} className="flex-shrink-0">
          <Icon name="arrow-left" className="text-sm" />
        </Button>

        {selectedUser ? (
          // User info in header (like ConversationView)
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <UserAvatar src={selectedUser.avatarUrl} alt={displayName} size="md" />
            <div className="min-w-0">
              {profilePath ? (
                <Link
                  to={profilePath}
                  className="text-sm font-semibold hover:underline truncate block"
                  onClick={onClose}
                >
                  {displayName}
                </Link>
              ) : (
                <span className="text-sm font-semibold truncate block">{displayName}</span>
              )}
            </div>
          </div>
        ) : (
          <h2 className="text-base font-semibold flex-1">New Message</h2>
        )}

        <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0">
          <Icon name="xmark" className="text-sm" />
        </Button>
      </div>

      {selectedUser ? (
        // Selected user content area
        <>
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            {isCheckingEligibility ? (
              <LoadingSpinner />
            ) : eligibility?.allowed ? (
              <Button
                onClick={handleStartConversation}
                disabled={getOrCreateThread.isPending}
                className="w-full max-w-xs"
              >
                {getOrCreateThread.isPending ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Icon name="paper-plane" variant="regular" className="mr-2" />
                    Start Conversation
                  </>
                )}
              </Button>
            ) : eligibility ? (
              <UnlockMessagingCard
                eligibility={eligibility}
                creatorName={displayName}
                creatorSlug={selectedUser.usernameSlug}
                creatorAvatarUrl={selectedUser.avatarUrl}
                className="w-full max-w-xs"
              />
            ) : null}
          </div>

          {/* Bottom action bar - like message input area */}
          {eligibility && !eligibility.allowed && profilePath && (
            <div className="p-4 border-t bg-background">
              <Button asChild className="w-full" onClick={onClose}>
                <Link to={profilePath}>
                  View {displayName}'s profile
                </Link>
              </Button>
            </div>
          )}
        </>
      ) : (
        // Search view
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-3">
            <div className="relative">
              <Icon
                name="search"
                variant="regular"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"
              />
              <Input
                type="text"
                placeholder="Search for a user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            )}

            {searchResults && searchResults.length > 0 && (
              <div className="px-2">
                {searchResults.map((user) => (
                  <Entity
                    key={user.id}
                    interactive
                    onSelect={() => handleSelectUser(user)}
                    leading={
                      <UserAvatar src={user.avatarUrl} alt={user.displayName || user.usernameSlug} size="sm" className="w-9 h-9" />
                    }
                    title={user.displayName || user.usernameSlug}
                    subtitle={`@${user.usernameSlug}`}
                  />
                ))}
              </div>
            )}

            {debouncedQuery.length >= 2 && !isSearching && searchResults?.length === 0 && (
              <EmptyState
                icon={<Icon name="user-slash" variant="regular" />}
                title="No users found"
              />
            )}

            {debouncedQuery.length < 2 && (
              <EmptyState
                icon={<Icon name="search" variant="regular" />}
                title="Search for a user to message"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
