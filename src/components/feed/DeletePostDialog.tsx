/**
 * DeletePostDialog Component
 * Confirmation dialog for deleting posts with warnings if collects/purchases exist
 */

import { DestructiveActionModal, Note } from '@cdecaire/sable'
import { useRef } from 'react'

interface DeletePostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postType: 'post' | 'collectible' | 'edition'
  hasCollects: boolean
  hasPurchases: boolean
  onConfirm: () => void
  onCancel?: () => void
}

export function DeletePostDialog({
  open,
  onOpenChange,
  postType: _postType,
  hasCollects,
  hasPurchases,
  onConfirm,
  onCancel,
}: DeletePostDialogProps) {
  // The modal funnels every close (Cancel, Esc, backdrop, AND a successful
  // sync confirm) through onOpenChange(false). Mark a confirm so onCancel only
  // fires on a real dismissal — not after the delete — and let the modal own
  // the close (no manual onOpenChange in handleConfirm → no double-close).
  const confirmed = useRef(false)

  const handleConfirm = () => {
    confirmed.current = true
    onConfirm()
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      if (!confirmed.current) {
        onCancel?.()
      }
      confirmed.current = false
    }
    onOpenChange(next)
  }

  const hasExistingItems = hasCollects || hasPurchases

  return (
    <DestructiveActionModal
      open={open}
      onOpenChange={handleOpenChange}
      title="Delete Post"
      description="Are you sure you want to delete this post? This action cannot be undone."
      confirmLabel="Delete Post"
      onConfirm={handleConfirm}
    >
      {hasExistingItems && (
        <Note
          variant="warning"
          title={
            hasPurchases
              ? 'Editions already exist on-chain'
              : 'Collectibles already exist on-chain'
          }
        >
          Deleting only hides the post in Desperse. The NFTs already minted will remain on-chain.
        </Note>
      )}
    </DestructiveActionModal>
  )
}

