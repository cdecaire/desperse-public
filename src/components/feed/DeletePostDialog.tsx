/**
 * DeletePostDialog Component
 * Confirmation dialog for deleting posts with warnings if collects/purchases exist
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
  postType,
  hasCollects,
  hasPurchases,
  onConfirm,
  onCancel,
}: DeletePostDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  const hasExistingItems = hasCollects || hasPurchases

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Post</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this post? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {hasExistingItems && (
          <div className="p-4 bg-(--flush-orange-500)/10 dark:bg-(--flush-orange-500)/20 border border-(--flush-orange-500)/20 dark:border-(--flush-orange-500)/30 rounded-lg">
            <div className="flex items-start gap-3">
              <i className="fa-regular fa-triangle-exclamation text-(--tone-warning) mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-(--flush-orange-900) dark:text-(--flush-orange-100)">
                  {hasPurchases
                    ? 'Editions already exist on-chain'
                    : 'Collectibles already exist on-chain'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Deleting only hides the post in Desperse. The NFTs already minted will remain on-chain.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
          >
            Delete Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

