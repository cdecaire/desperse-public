/**
 * Dev preview of the public gallery homepage (HomeGallery).
 * The real thing renders at "/" for unauthenticated visitors only; this
 * route lets logged-in sessions iterate on it without signing out.
 */

import { createFileRoute } from '@tanstack/react-router'
import { HomeGallery } from '@/components/home/HomeGallery'

export const Route = createFileRoute('/dev/home-preview')({
  component: HomeGallery,
})
