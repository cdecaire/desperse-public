import { createFileRoute, redirect } from '@tanstack/react-router'

/** The weekly referral board now lives as the "Referrals" tab on /leaderboard.
 * Keep this path as a permanent redirect so existing links (and the
 * Settings → Invites CTA) continue to work. */
export const Route = createFileRoute('/top-connectors')({
  beforeLoad: () => {
    throw redirect({ to: '/leaderboard', search: { view: 'referrals' }, replace: true })
  },
})
