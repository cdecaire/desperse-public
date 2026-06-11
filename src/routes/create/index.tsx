/**
 * Create Post Page
 * Form for creating new posts (Standard, Collectible, or Edition)
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { z } from 'zod'
import { AuthGuard } from '@/components/shared/AuthGuard'
import { CreatePostForm } from '@/components/forms/CreatePostForm'
import { CreatePostFormSkeleton } from '@/components/forms/CreatePostFormSkeleton'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useOnboardingState } from '@/hooks/useOnboardingState'
import { PageHeader } from '@/components/shared/PageHeader'
import { clearCreateIntent, readCreateIntent } from '@/lib/createIntent'

const createSearchSchema = z.object({
  // Optional on input so `<Link to="/create">` doesn't require a search param;
  // coerces the string query value to a boolean, defaulting to false when absent.
  firstPost: z
    .preprocess(
      (value) => value === true || value === 'true' || value === '1',
      z.boolean(),
    )
    .optional()
    .default(false),
})

export const Route = createFileRoute('/create/')({
  validateSearch: createSearchSchema,
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
  const navigate = useNavigate()
  const { firstPost } = Route.useSearch()
  const { isLoading } = useCurrentUser()
  const { shouldShowOnboarding, isAuthInitializing } = useOnboardingState()

  useEffect(() => {
    if (shouldShowOnboarding) {
      navigate({ to: '/onboarding', replace: true })
    }
  }, [navigate, shouldShowOnboarding])

  useEffect(() => {
    if (isLoading || isAuthInitializing || shouldShowOnboarding) {
      return
    }

    const createIntent = readCreateIntent()
    if (!createIntent) {
      return
    }

    if (createIntent.firstPost && !firstPost) {
      navigate({
        to: '/create',
        search: { firstPost: true },
        replace: true,
      })
      return
    }

    clearCreateIntent()
  }, [firstPost, isAuthInitializing, isLoading, navigate, shouldShowOnboarding])

  const title = firstPost ? 'Create your first post' : 'Create Post'
  const description = firstPost
    ? 'Start with one simple Standard post. You can come back for collectibles or editions later.'
    : 'Share your work with the world.'

  return (
    <div className="pt-4 pb-8 px-4 md:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <PageHeader
          title={title}
          description={description}
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
