/**
 * About Page
 * Direct access to the landing page content
 */

import { createFileRoute } from '@tanstack/react-router'
import { LandingPage } from '@/components/landing/LandingPage'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function AboutPage() {
  return <LandingPage />
}
