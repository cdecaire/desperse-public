/**
 * BlockConfirmDialog
 * Destructive-action confirmation for blocking another user. Mirrors the
 * iOS confirm alert wording so the platform-store review surface stays
 * consistent across platforms.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

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

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Block @{username}?</DialogTitle>
          <DialogDescription>
            They won't see your posts or profile, and you won't see theirs.
            Neither of you will be notified. You can unblock them anytime from
            Settings.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Blocking…' : `Block @${username}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
