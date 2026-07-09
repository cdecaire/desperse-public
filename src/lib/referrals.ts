export const REFERRAL_SLOT_LIMIT = 3

export const REFERRAL_MILESTONES = [
  { target: 1, label: 'First Signal badge' },
  { target: 3, label: 'Custom invite code' },
  { target: 5, label: 'Profile accent' },
  { target: 10, label: 'Connector badge and Top Connectors eligibility' },
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

export function buildReferralQrCodeUrl(inviteLink: string, size = 256): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(inviteLink)}`
}

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

export function getCurrentReferralTierLabel(activatedCount: number): string {
  if (activatedCount >= 10) return 'Connector'
  if (activatedCount >= 5) return 'Profile accent unlocked'
  if (activatedCount >= 3) return 'Custom invite code unlocked'
  if (activatedCount >= 1) return 'First Signal'
  return 'Invite in progress'
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

export function buildReferralShareCardSvg(input: {
  displayName: string
  inviteCode: string
  inviteLink: string
  qrCodeUrl: string
  badgeLabel?: string | null
}) {
  const displayName = escapeSvgText(input.displayName)
  const inviteCode = escapeSvgText(input.inviteCode)
  const inviteLink = escapeSvgText(input.inviteLink)
  const badgeLabel = input.badgeLabel ? escapeSvgText(input.badgeLabel) : null

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" rx="36" fill="#09090B"/>
  <rect x="24" y="24" width="1152" height="582" rx="28" fill="#111113" stroke="#27272A"/>
  <rect x="64" y="64" width="704" height="502" rx="28" fill="#18181B" stroke="#2A2A2D"/>
  <rect x="818" y="64" width="318" height="318" rx="28" fill="#FAFAFA"/>
  <image href="${input.qrCodeUrl}" x="850" y="96" width="254" height="254" preserveAspectRatio="xMidYMid meet"/>
  <circle cx="128" cy="128" r="32" fill="#27272A"/>
  <text x="128" y="138" text-anchor="middle" fill="#FAFAFA" font-size="28" font-family="Inter, Arial, sans-serif">D</text>
  <text x="176" y="124" fill="#FAFAFA" font-size="22" font-weight="600" font-family="Inter, Arial, sans-serif">${displayName}</text>
  <text x="176" y="154" fill="#A1A1AA" font-size="18" font-family="Inter, Arial, sans-serif">Join me on Desperse</text>
  ${badgeLabel ? `<rect x="64" y="182" width="230" height="42" rx="21" fill="#1F2937"/>
  <text x="179" y="209" text-anchor="middle" fill="#E4E4E7" font-size="18" font-family="Inter, Arial, sans-serif">${badgeLabel}</text>` : ''}
  <text x="64" y="294" fill="#A1A1AA" font-size="18" font-family="Inter, Arial, sans-serif">Invite code</text>
  <text x="64" y="340" fill="#FAFAFA" font-size="44" font-weight="700" font-family="Inter, Arial, sans-serif">${inviteCode}</text>
  <text x="64" y="414" fill="#A1A1AA" font-size="18" font-family="Inter, Arial, sans-serif">Invite link</text>
  <text x="64" y="456" fill="#FAFAFA" font-size="24" font-family="Inter, Arial, sans-serif">${inviteLink}</text>
  <text x="64" y="520" fill="#D4D4D8" font-size="20" font-family="Inter, Arial, sans-serif">Publish, discover, and collect creative work.</text>
  <text x="818" y="420" fill="#FAFAFA" font-size="24" font-weight="600" font-family="Inter, Arial, sans-serif">Scan to join</text>
  <text x="818" y="456" fill="#A1A1AA" font-size="18" font-family="Inter, Arial, sans-serif">Link and code both work for attribution.</text>
  <text x="818" y="530" fill="#71717A" font-size="16" font-family="Inter, Arial, sans-serif">Recognition only. No cash value.</text>
</svg>`
}
