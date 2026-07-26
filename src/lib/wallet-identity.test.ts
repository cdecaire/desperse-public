import { describe, expect, it } from 'vitest'

import {
  formatWalletIdentifier,
  isWalletDefaultDisplayName,
} from './wallet-identity'

describe('formatWalletIdentifier', () => {
  it('formats a wallet address for slugs and display names', () => {
    expect(formatWalletIdentifier('AbCd12345678WXYZ')).toEqual({
      slugBase: 'AbCd-WXYZ',
      display: 'AbCd…WXYZ',
    })
  })

  it('trims the wallet address before formatting', () => {
    expect(formatWalletIdentifier('  AbCd12345678WXYZ  ')).toEqual({
      slugBase: 'AbCd-WXYZ',
      display: 'AbCd…WXYZ',
    })
  })

  it('preserves the existing slice behavior for non-empty short addresses', () => {
    expect(formatWalletIdentifier('abc')).toEqual({
      slugBase: 'abc-abc',
      display: 'abc…abc',
    })
  })

  it('preserves the user fallback for blank input', () => {
    expect(formatWalletIdentifier('   ')).toEqual({
      slugBase: 'user',
      display: 'user',
    })
  })
})

describe('isWalletDefaultDisplayName', () => {
  const address = 'AbCd12345678WXYZ'

  it('recognizes the canonical unicode ellipsis form', () => {
    expect(isWalletDefaultDisplayName('AbCd…WXYZ', address)).toBe(true)
  })

  it('recognizes the legacy ASCII ellipsis form', () => {
    expect(isWalletDefaultDisplayName('AbCd...WXYZ', address)).toBe(true)
  })

  it('rejects a different display name', () => {
    expect(isWalletDefaultDisplayName('Carl', address)).toBe(false)
  })

  it('returns false when the name or address is absent', () => {
    const absentValues: Array<[
      string | null | undefined,
      string | null | undefined,
    ]> = [
      [null, address],
      [undefined, address],
      ['', address],
      ['   ', address],
      ['user', null],
      ['user', undefined],
      ['user', ''],
      ['user', '   '],
    ]

    for (const [name, walletAddress] of absentValues) {
      expect(isWalletDefaultDisplayName(name, walletAddress)).toBe(false)
    }
  })
})
