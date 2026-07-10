import { createFileRoute } from '@tanstack/react-router'
import { InviteLandingPage } from '@/components/referrals/InviteLandingPage'

export const Route = createFileRoute('/i/$code')({
  component: InviteRoute,
})

function InviteRoute() {
  const { code } = Route.useParams()
  return <InviteLandingPage code={code} />
}
