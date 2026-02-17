/**
 * 404 Not Found Page
 * Catch-all route for unmatched URLs
 */

import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'
import { EmptyState } from '@/components/shared/EmptyState'

export const Route = createFileRoute('/$')({
  component: NotFoundPage,
})

export function NotFoundPage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <EmptyState
        icon={<i className="fa-regular fa-compass text-4xl" />}
        title="Page not found"
        description="This page doesn't exist or may have been moved."
        action={{ label: 'Go to Feed', to: '/' }}
        secondaryAction={isAuthenticated ? { label: 'Create Post', to: '/create' } : undefined}
        supportText="If you think this is a mistake, contact support."
      />
    </div>
  )
}
