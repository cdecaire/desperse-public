import { describe, expect, it } from 'vitest'
import { isAccountStatusTransitionAllowed } from './account-moderation'

describe('account moderation transition policy', () => {
  it('allows moderators to flag and restore flagged accounts', () => {
    expect(isAccountStatusTransitionAllowed('moderator', 'active', 'flagged')).toBe(true)
    expect(isAccountStatusTransitionAllowed('moderator', 'flagged', 'active')).toBe(true)
  })

  it('reserves bans and unbans for admins', () => {
    expect(isAccountStatusTransitionAllowed('moderator', 'active', 'banned')).toBe(false)
    expect(isAccountStatusTransitionAllowed('moderator', 'banned', 'active')).toBe(false)
    expect(isAccountStatusTransitionAllowed('admin', 'active', 'banned')).toBe(true)
    expect(isAccountStatusTransitionAllowed('admin', 'flagged', 'banned')).toBe(true)
    expect(isAccountStatusTransitionAllowed('admin', 'banned', 'active')).toBe(true)
  })

  it('rejects no-op and invalid transitions', () => {
    expect(isAccountStatusTransitionAllowed('admin', 'active', 'active')).toBe(false)
    expect(isAccountStatusTransitionAllowed('admin', 'banned', 'flagged')).toBe(false)
  })
})
