/**
 * Edit Post Route
 * Allows post owners to edit their posts
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { usePostQuery } from '@/hooks/usePostQuery'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { AuthGuard } from '@/components/shared/AuthGuard'
import { CreatePostForm } from '@/components/forms/CreatePostForm'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { DeletePostDialog } from '@/components/feed/DeletePostDialog'
import { useDeletePost } from '@/hooks/usePostMutations'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/post/$postId/edit')({
  component: EditPostPage,
})

function EditPostPage() {
  const { postId } = Route.useParams()
  const navigate = useNavigate()
  const { user: currentUser, isLoading: isUserLoading } = useCurrentUser()
  const { data, isLoading, isError } = usePostQuery({ postId })
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const deletePostMutation = useDeletePost()

  // Note: Ownership check happens server-side in updatePost
  // For better UX, we check client-side too
  
  // Show loading state while either post or user is loading
  // This prevents the edit form from flashing before ownership check completes
  if (isLoading || isUserLoading) {
    return (
      <div className="pb-20 md:pb-10 pt-4 md:pt-6">
        <div className="max-w-2xl mx-auto px-4">
          <Skeleton className="h-10 w-32 mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={<i className="fa-regular fa-circle-exclamation text-4xl" />}
        title="Post not found"
        description="This post doesn't exist or was removed."
        action={{ label: 'Go to Feed', to: '/' }}
      />
    )
  }

  // Client-side ownership check (server-side check happens in updatePost)
  // If currentUser is null after loading completes, user isn't authenticated - AuthGuard handles that
  // If currentUser exists but doesn't own the post, show access denied
  if (currentUser && data.user.id !== currentUser.id) {
    return (
      <EmptyState
        icon={<i className="fa-regular fa-lock text-4xl" />}
        title="Access Denied"
        description="You don't have permission to edit this post."
        action={{ label: 'Go to Post', to: '/post/$postId', params: { postId } }}
      />
    )
  }

  // Ensure we have all required post data
  if (!data.post) {
    return (
      <EmptyState
        icon={<i className="fa-regular fa-circle-exclamation text-4xl" />}
        title="Post not found"
        description="This post doesn't exist or was removed."
        action={{ label: 'Go to Feed', to: '/' }}
      />
    )
  }

  const handleDeleteConfirm = () => {
    if (!currentUser) {
      return
    }
    deletePostMutation.mutate(
      {
        postId,
      },
      {
        onSuccess: () => {
          // Navigate to profile page after successful deletion
          navigate({ to: '/profile/$slug', params: { slug: data.user.usernameSlug } })
        },
      }
    )
  }

  const hasCollects = data.post.type === 'collectible' && (data.post.collectCount ?? 0) > 0
  const hasPurchases = data.post.type === 'edition' && (data.post.currentSupply ?? 0) > 0

  return (
    <AuthGuard>
      <div className="pb-20 md:pb-10 pt-4 md:pt-6">
        <div className="max-w-2xl mx-auto px-4">
          <h1 className="text-2xl font-semibold mb-6">Edit Post</h1>
          <CreatePostForm
            mode="edit"
            initialPost={{
              id: data.post.id,
              type: data.post.type,
              mediaUrl: data.post.mediaUrl,
              coverUrl: data.post.coverUrl || null,
              caption: data.post.caption || null,
              categories: data.post.categories || null,
              price: data.post.price || null,
              currency: data.post.currency || null,
              maxSupply: data.post.maxSupply || null,
              nftName: data.post.nftName || null,
              nftSymbol: data.post.nftSymbol || null,
              nftDescription: data.post.nftDescription || null,
              sellerFeeBasisPoints: data.post.sellerFeeBasisPoints || null,
              isMutable: data.post.isMutable ?? true,
              creatorWallet: data.post.creatorWallet || null,
              assets: data.post.assets || undefined,
            }}
          />
          <div className="mt-6">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              className="w-full"
            >
              Delete
            </Button>
          </div>
        </div>
      </div>

      <DeletePostDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        postType={data.post.type}
        hasCollects={hasCollects}
        hasPurchases={hasPurchases}
        onConfirm={handleDeleteConfirm}
      />
    </AuthGuard>
  )
}
