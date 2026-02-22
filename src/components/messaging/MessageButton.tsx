/**
 * MessageButton Component
 * Button to initiate a DM conversation with a creator from their profile
 * Opens conversation in the FloatingMessageButton popover
 */

import { Button } from '@/components/ui/button'
import { useMessaging } from './MessagingContext'
import { useDmEligibility } from '@/hooks/useDmEligibility'
import { useGetOrCreateThread, type Thread } from '@/hooks/useMessages'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'

interface MessageButtonProps {
  creatorId: string
  creatorName?: string
  creatorSlug?: string
  creatorAvatarUrl?: string | null
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'cta' | 'icon' | 'icon-lg'
  iconOnly?: boolean
}

export function MessageButton({
  creatorId,
  creatorName,
  creatorSlug,
  creatorAvatarUrl,
  className,
  variant = 'outline',
  size = 'default',
  iconOnly = false,
}: MessageButtonProps) {
  const { openMessaging, openMessagingWithUser } = useMessaging()

  const { data: eligibility, isLoading: isCheckingEligibility } = useDmEligibility(creatorId)
  const getOrCreateThread = useGetOrCreateThread()

  const handleClick = async () => {
    if (!eligibility) return

    if (eligibility.allowed) {
      // Create or get existing thread, then open in the messaging popover
      try {
        const result = await getOrCreateThread.mutateAsync({
          otherUserId: creatorId,
          contextCreatorId: creatorId,
        })

        if (result.thread) {
          openMessaging(result.thread as Thread)
        }
      } catch (error) {
        console.error('Failed to create thread:', error)
      }
    } else {
      // Open messaging popover with pre-selected user to show unlock card
      openMessagingWithUser({
        id: creatorId,
        usernameSlug: creatorSlug || creatorName || 'user',
        displayName: creatorName || null,
        avatarUrl: creatorAvatarUrl || null,
      })
    }
  }

  const isLoading = isCheckingEligibility || getOrCreateThread.isPending

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isLoading}
      className={cn('gap-2', className)}
      aria-label={iconOnly ? 'Send message' : undefined}
    >
      {isLoading ? (
        <LoadingSpinner size="sm" />
      ) : (
        <Icon name="paper-plane" variant="regular" className="text-base -translate-x-px translate-y-px" />
      )}
      {!iconOnly && <span>Message</span>}
    </Button>
  )
}
