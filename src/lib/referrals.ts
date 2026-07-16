export const REFERRAL_SLOT_LIMIT = 3

export const REFERRAL_MILESTONES = [
  { target: 1, label: 'First Signal badge', confirmation: 'Unlocked: First Signal' },
  { target: 3, label: 'Custom invite code', confirmation: 'Custom invite code unlocked' },
  { target: 5, label: 'Profile accent', confirmation: 'Profile accent unlocked' },
  { target: 10, label: 'Connector badge and Top Connectors eligibility', confirmation: 'You now qualify for Top Connectors' },
] as const

export type ReferralBackendState =
  | 'clicked'
  | 'signup_started'
  | 'account_created'
  | 'pending_activation'
  | 'activated'
  | 'rejected'
  | 'revoked'
  | 'expired'

export type ReferralListState =
  | 'pending_activation'
  | 'activated'
  | 'did_not_qualify'
  | 'removed_after_review'
  | 'expired'

export function buildInviteLink(origin: string, inviteCode: string): string {
  const safeOrigin = origin.replace(/\/$/, '')
  return `${safeOrigin}/i/${inviteCode}`
}

export function buildReferralQrCodeUrl(
  inviteLink: string,
  size = 256,
  opts?: { color?: string; bgColor?: string },
): string {
  const params = new URLSearchParams({ size: `${size}x${size}`, data: inviteLink, margin: '0' })
  // Hex colors without '#'. Used to render a light-on-dark QR that sits directly
  // on the (always-dark) invite card, with the quiet zone blended into the bg.
  if (opts?.color) params.set('color', opts.color)
  if (opts?.bgColor) params.set('bgcolor', opts.bgColor)
  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`
}

// The invite card is always dark (zinc-950 ≈ #08080b). Light modules on the card
// color make the QR read as printed directly on the surface — no white chip.
export const INVITE_CARD_BG = '08080b'
export const INVITE_QR_FG = 'fafafa'

export function getReferralListState(state: ReferralBackendState): ReferralListState {
  switch (state) {
    case 'activated':
      return 'activated'
    case 'rejected':
      return 'did_not_qualify'
    case 'revoked':
      return 'removed_after_review'
    case 'expired':
      return 'expired'
    default:
      return 'pending_activation'
  }
}

export function getReferralStateLabel(state: ReferralListState): string {
  switch (state) {
    case 'pending_activation':
      return 'Pending activation'
    case 'activated':
      return 'Activated'
    case 'did_not_qualify':
      return 'Did not qualify'
    case 'removed_after_review':
      return 'Removed after review'
    case 'expired':
      return 'Expired'
  }
}

export function getReferralStateDescription(state: ReferralListState): string {
  switch (state) {
    case 'pending_activation':
      return 'Joined from your invite. Counts after they complete their profile and follow a creator on Desperse.'
    case 'activated':
      return 'Activated and counted toward your invite progress.'
    case 'did_not_qualify':
      return "This invite didn't meet the activation criteria."
    case 'removed_after_review':
      return 'This referral credit was removed after review.'
    case 'expired':
      return 'This invite did not activate in time.'
  }
}

export function getReferralStateBadgeVariant(state: ReferralListState):
  | 'secondary'
  | 'success'
  | 'warning'
  | 'destructive' {
  switch (state) {
    case 'activated':
      return 'success'
    case 'did_not_qualify':
      return 'warning'
    case 'removed_after_review':
      return 'destructive'
    case 'expired':
      return 'secondary'
    case 'pending_activation':
      return 'secondary'
  }
}

export function getNextReferralMilestone(activatedCount: number) {
  return REFERRAL_MILESTONES.find((milestone) => activatedCount < milestone.target) ?? null
}

export function getReferralMilestoneConfirmation(activatedCount: number) {
  const milestone = REFERRAL_MILESTONES.find(({ target }) => target === activatedCount)
  return milestone ? { target: milestone.target, message: milestone.confirmation } : null
}

export function getCurrentReferralTierLabel(activatedCount: number): string {
  if (activatedCount >= 10) return 'Connector'
  if (activatedCount >= 5) return 'Profile accent unlocked'
  if (activatedCount >= 3) return 'Custom invite code unlocked'
  if (activatedCount >= 1) return 'First Signal'
  return 'Invite in progress'
}

export type PublicReferralStatus = {
  activatedCount: number
  badgeLabel: 'First Signal' | 'Connector'
  hasAccent: boolean
  hasFrame: boolean
}

/** Public profile treatment derived only from current valid activations. */
export function getPublicReferralStatus(activatedCount: number): PublicReferralStatus | null {
  if (activatedCount < 1) return null

  return {
    activatedCount,
    badgeLabel: activatedCount >= 10 ? 'Connector' : 'First Signal',
    hasAccent: activatedCount >= 5,
    hasFrame: activatedCount >= 25,
  }
}

export const REFERRAL_LEADERBOARD_QUALIFICATION_COUNT = 10

export type ReferralLeaderboardCandidate = {
  userId: string
  usernameSlug: string
  displayName: string | null
  avatarUrl: string | null
  totalActivatedCount: number
  weeklyActivatedCount: number
  excluded: boolean
}

export type ReferralLeaderboardEntry = ReferralLeaderboardCandidate & {
  rank: number
  badgeLabel: 'Connector'
}

export function rankReferralLeaderboardEntries(
  candidates: ReferralLeaderboardCandidate[],
): ReferralLeaderboardEntry[] {
  return candidates
    .filter((candidate) => (
      !candidate.excluded
      && candidate.totalActivatedCount >= REFERRAL_LEADERBOARD_QUALIFICATION_COUNT
      && candidate.weeklyActivatedCount > 0
    ))
    .sort((a, b) => (
      b.weeklyActivatedCount - a.weeklyActivatedCount
      || b.totalActivatedCount - a.totalActivatedCount
      || a.usernameSlug.localeCompare(b.usernameSlug)
    ))
    .map((candidate, index) => ({ ...candidate, rank: index + 1, badgeLabel: 'Connector' }))
}

export function getReferralLeaderboardStatus(input: {
  totalActivatedCount: number
  weeklyActivatedCount: number
  rank: number | null
  excluded: boolean
}):
  | { state: 'ineligible'; remainingToQualify: number }
  | { state: 'awaiting' }
  | { state: 'ranked'; rank: number }
  | { state: 'review-held' } {
  if (input.excluded) return { state: 'review-held' }
  if (input.totalActivatedCount < REFERRAL_LEADERBOARD_QUALIFICATION_COUNT) {
    return {
      state: 'ineligible',
      remainingToQualify: REFERRAL_LEADERBOARD_QUALIFICATION_COUNT - input.totalActivatedCount,
    }
  }
  if (input.rank) return { state: 'ranked', rank: input.rank }
  return { state: 'awaiting' }
}

export function buildReferralShareCopy(inviteLink: string): string {
  return `I’m inviting people to Desperse. Join through my invite: ${inviteLink}`
}

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value
}

export function buildReferralShareCardSvg(input: {
  displayName: string
  handle: string
  bio?: string | null
  avatarUrl?: string | null
  inviteCode: string
  inviteLink: string
  qrCodeUrl: string
  badgeLabel?: string | null
}) {
  const displayName = escapeSvgText(truncate(input.displayName, 28))
  const handle = escapeSvgText(`@${input.handle}`)
  const bio = input.bio ? escapeSvgText(truncate(input.bio, 62)) : null
  const inviteCode = escapeSvgText(input.inviteCode)
  const inviteLink = escapeSvgText(truncate(input.inviteLink, 40))
  const badgeLabel = input.badgeLabel ? escapeSvgText(input.badgeLabel) : null
  const initial = escapeSvgText((input.displayName.trim()[0] || 'D').toUpperCase())

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="avatarClip"><circle cx="128" cy="128" r="40"/></clipPath>
  </defs>
  <rect width="1200" height="630" rx="36" fill="#09090B"/>
  <rect x="24" y="24" width="1152" height="582" rx="28" fill="#111113" stroke="#27272A"/>
  <line x1="792" y1="88" x2="792" y2="542" stroke="#27272A" stroke-width="1"/>
  <image href="${input.qrCodeUrl}" x="852" y="150" width="256" height="256" preserveAspectRatio="xMidYMid meet"/>
  <circle cx="128" cy="128" r="40" fill="#27272A"/>
  <text x="128" y="140" text-anchor="middle" fill="#FAFAFA" font-size="34" font-weight="600" font-family="Inter, Arial, sans-serif">${initial}</text>
  ${input.avatarUrl ? `<image href="${input.avatarUrl}" x="88" y="88" width="80" height="80" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice"/>` : ''}
  <text x="188" y="118" fill="#FAFAFA" font-size="26" font-weight="600" font-family="Inter, Arial, sans-serif">${displayName}</text>
  <text x="188" y="150" fill="#A1A1AA" font-size="19" font-family="Inter, Arial, sans-serif">${handle}</text>
  ${bio ? `<text x="64" y="212" fill="#D4D4D8" font-size="19" font-family="Inter, Arial, sans-serif">${bio}</text>` : ''}
  ${badgeLabel ? `<rect x="64" y="238" width="${Math.min(360, 40 + badgeLabel.length * 11)}" height="40" rx="20" fill="#27272A"/>
  <text x="84" y="264" fill="#E4E4E7" font-size="17" font-family="Inter, Arial, sans-serif">${badgeLabel}</text>` : ''}
  <text x="64" y="330" fill="#A1A1AA" font-size="18" font-family="Inter, Arial, sans-serif">Invite code</text>
  <text x="64" y="376" fill="#FAFAFA" font-size="44" font-weight="700" font-family="Inter, Arial, sans-serif">${inviteCode}</text>
  <text x="64" y="446" fill="#A1A1AA" font-size="18" font-family="Inter, Arial, sans-serif">Invite link</text>
  <text x="64" y="486" fill="#FAFAFA" font-size="22" font-family="Inter, Arial, sans-serif">${inviteLink}</text>
  <text x="64" y="548" fill="#71717A" font-size="16" font-family="Inter, Arial, sans-serif">Join me on Desperse · Recognition only. No cash value.</text>
  <text x="980" y="454" text-anchor="middle" fill="#FAFAFA" font-size="22" font-weight="600" font-family="Inter, Arial, sans-serif">Scan to join</text>
  <text x="980" y="484" text-anchor="middle" fill="#A1A1AA" font-size="17" font-family="Inter, Arial, sans-serif">Link and code both work.</text>
</svg>`
}
