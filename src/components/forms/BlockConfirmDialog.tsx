/**
 * BlockConfirmDialog
 * Destructive-action confirmation for blocking another user. Mirrors the
 * iOS confirm alert wording so the platform-store review surface stays
 * consistent across platforms.
 */

import { DestructiveActionModal } from '@cdecaire/sable'

interface BlockConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  username: string
  onConfirm: () => void
  onCancel?: () => void
  isPending?: boolean
}

export function BlockConfirmDialog({
  open,
  onOpenChange,
  username,
  onConfirm,
  onCancel,
  isPending,
}: BlockConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      onCancel?.()
    }
    onOpenChange(next)
  }

  return (
    <DestructiveActionModal
      open={open}
      onOpenChange={handleOpenChange}
      title={`Block @${username}?`}
      description="They won't see your posts or profile, and you won't see theirs. Neither of you will be notified. You can unblock them anytime from Settings."
      confirmLabel={`Block @${username}`}
      confirmingLabel="Blocking…"
      pending={isPending}
      onConfirm={handleConfirm}
    />
  )
}
