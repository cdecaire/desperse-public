import { describe, expect, it } from 'vitest'

import {
  buildAuthRecovery,
  clearAuthRecovery,
  readAuthRecovery,
  saveAuthRecovery,
} from './authRecovery'

function makeStorage(): Storage {
  const store = new Map<string, string>()

  return {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key: string) {
      return store.get(key) ?? null
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null
    },
    removeItem(key: string) {
      store.delete(key)
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
  }
}

describe('authRecovery', () => {
  it('defaults create recovery to first-post mode', () => {
    const recovery = buildAuthRecovery()

    expect(recovery).toMatchObject({
      returnTo: '/create',
      firstPost: true,
      source: 'create',
    })
    expect(recovery.createdAt).toBeTypeOf('number')
  })

  it('parses explicit firstPost=false from the query string', () => {
    expect(buildAuthRecovery('?firstPost=false')).toMatchObject({
      returnTo: '/create',
      firstPost: false,
      source: 'create',
    })
  })

  it('returns null without touching storage when window is unavailable', () => {
    expect(readAuthRecovery()).toBeNull()

    expect(() => saveAuthRecovery(buildAuthRecovery())).not.toThrow()
    expect(() => clearAuthRecovery()).not.toThrow()
  })

  it('round-trips recovery state through storage and clears invalid payloads', () => {
    const storage = makeStorage()
    const now = Date.now()

    saveAuthRecovery({ returnTo: '/create', firstPost: false, source: 'create', createdAt: now }, storage)
    expect(readAuthRecovery(storage)).toEqual({ returnTo: '/create', firstPost: false, source: 'create', createdAt: now })

    storage.setItem('desperse:auth-recovery', JSON.stringify({ returnTo: '/create', firstPost: 'true', source: 'create', createdAt: now }))
    expect(readAuthRecovery(storage)).toBeNull()
    expect(storage.getItem('desperse:auth-recovery')).toBeNull()

    storage.setItem('desperse:auth-recovery', JSON.stringify({ returnTo: '/create', firstPost: true, source: 'create', createdAt: now - (2 * 60 * 60 * 1000) }))
    expect(readAuthRecovery(storage)).toBeNull()
    expect(storage.getItem('desperse:auth-recovery')).toBeNull()

    storage.setItem('desperse:auth-recovery', '{bad json')
    expect(readAuthRecovery(storage)).toBeNull()
    expect(storage.getItem('desperse:auth-recovery')).toBeNull()

    saveAuthRecovery({ returnTo: '/create', firstPost: true, source: 'create', createdAt: now }, storage)
    clearAuthRecovery(storage)
    expect(readAuthRecovery(storage)).toBeNull()
  })
})
