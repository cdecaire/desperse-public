import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { InviteLandingPage } from '@/components/referrals/InviteLandingPage'

const searchSchema = z.object({
  ref: z.string().optional(),
  invalid: z.union([z.literal('1'), z.literal(1)]).optional(),
})

export const Route = createFileRoute('/i/$code/welcome')({
  component: InviteWelcomeRoute,
  validateSearch: searchSchema,
})

function InviteWelcomeRoute() {
  const { code } = Route.useParams()
  const { ref, invalid } = Route.useSearch()
  return <InviteLandingPage code={code} referrerSlug={ref ?? null} invalid={Boolean(invalid)} />
}
