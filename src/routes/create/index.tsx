/**
 * Create Post Page
 * Form for creating new posts (Standard, Collectible, or Edition)
 */

import { createFileRoute } from '@tanstack/react-router'
import { AuthGuard } from '@/components/shared/AuthGuard'
import { CreatePostForm } from '@/components/forms/CreatePostForm'
import { CreatePostFormSkeleton } from '@/components/forms/CreatePostFormSkeleton'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PageHeader } from '@/components/shared/PageHeader'

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
      <div className="max-w-2xl mx-auto">
        <PageHeader
          title="Create Post"
          description="Share your work with the world."
          showOnMobile={true}
        />

        {isLoading ? (
          <CreatePostFormSkeleton />
        ) : (
          <CreatePostForm />
        )}
      </div>
    </div>
  )
}
