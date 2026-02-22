/**
 * Create Post Page
 * Form for creating new posts (Standard, Collectible, or Edition)
 */

import { createFileRoute } from '@tanstack/react-router'
import { AuthGuard } from '@/components/shared/AuthGuard'
import { CreatePostForm } from '@/components/forms/CreatePostForm'
import { CreatePostFormSkeleton } from '@/components/forms/CreatePostFormSkeleton'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export const Route = createFileRoute('/create/')({
  component: CreatePage,
})

function CreatePage() {
  return (
    <AuthGuard>
      <CreateContent />
    </AuthGuard>
  )
}

function CreateContent() {
  const { isLoading } = useCurrentUser()

  return (
    <div className="pt-4 pb-8 px-4 md:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="space-y-2 mb-6">
          <h1 className="hidden md:block text-xl font-bold">Create Post</h1>
          <p className="text-sm text-muted-foreground">
            Share your work with the world.
          </p>
        </div>

        {isLoading ? (
          <CreatePostFormSkeleton />
        ) : (
          <CreatePostForm />
        )}
      </div>
    </div>
  )
}
