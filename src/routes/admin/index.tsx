import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/admin/')({
  component: AdminIndexPage,
})

function AdminIndexPage() {
  const navigate = useNavigate()

  // On desktop, redirect to moderation by default
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)') // md breakpoint
    if (mediaQuery.matches) {
      navigate({ to: '/admin/moderation', replace: true })
    }
  }, [navigate])

  // Mobile view is handled by AdminNav in the layout
  // Desktop redirects to moderation
  return null
}
