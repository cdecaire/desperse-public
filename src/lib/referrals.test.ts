import { describe, expect, it } from 'vitest'

import {
  buildReferralShareCardSvg,
  getCurrentReferralTierLabel,
  getNextReferralMilestone,
  getReferralListState,
  getReferralStateLabel,
} from '@/lib/referrals'

describe('referral helpers', () => {
  it('maps backend states to owner-list states', () => {
    expect(getReferralListState('account_created')).toBe('pending_activation')
    expect(getReferralListState('pending_activation')).toBe('pending_activation')
    expect(getReferralListState('activated')).toBe('activated')
    expect(getReferralListState('rejected')).toBe('did_not_qualify')
    expect(getReferralListState('revoked')).toBe('removed_after_review')
    expect(getReferralListState('expired')).toBe('expired')
  })

  it('returns the next milestone and current tier label', () => {
    expect(getNextReferralMilestone(0)).toMatchObject({ target: 1, label: 'First Signal badge' })
    expect(getNextReferralMilestone(3)).toMatchObject({ target: 5, label: 'Profile accent' })
    expect(getNextReferralMilestone(10)).toBeNull()
    expect(getCurrentReferralTierLabel(0)).toBe('Invite in progress')
    expect(getCurrentReferralTierLabel(1)).toBe('First Signal')
    expect(getCurrentReferralTierLabel(3)).toBe('Custom invite code unlocked')
    expect(getCurrentReferralTierLabel(10)).toBe('Connector')
  })

  it('builds a personalized share card svg with invite details', () => {
    const svg = buildReferralShareCardSvg({
      displayName: 'Carl',
      handle: 'carl',
      bio: 'Building things on Solana.',
      avatarUrl: 'https://example.com/avatar.png',
      inviteCode: 'carl',
      inviteLink: 'https://desperse.app/i/carl',
      qrCodeUrl: 'https://example.com/qr.png',
      badgeLabel: 'First Signal',
    })

    expect(svg).toContain('Carl')
    expect(svg).toContain('@carl')
    expect(svg).toContain('Building things on Solana.')
    expect(svg).toContain('https://example.com/avatar.png')
    expect(svg).toContain('https://desperse.app/i/carl')
    expect(svg).toContain('Scan to join')
    expect(svg).toContain('First Signal')
  })

  it('keeps user-facing labels stable', () => {
    expect(getReferralStateLabel('pending_activation')).toBe('Pending activation')
    expect(getReferralStateLabel('did_not_qualify')).toBe('Did not qualify')
    expect(getReferralStateLabel('removed_after_review')).toBe('Removed after review')
  })
})
