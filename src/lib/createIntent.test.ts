import { describe, expect, it } from 'vitest'

import {
  buildCreateIntent,
  clearCreateIntent,
  readCreateIntent,
  saveCreateIntent,
  shouldPreserveCreateIntent,
} from './createIntent'

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

describe('createIntent', () => {
  it('preserves /create and ignores unrelated paths', () => {
    expect(shouldPreserveCreateIntent('/create')).toBe(true)
    expect(shouldPreserveCreateIntent('/create/')).toBe(true)
    expect(shouldPreserveCreateIntent('/profile')).toBe(false)
  })

  it('defaults create intent to first-post mode when no search is present', () => {
    const intent = buildCreateIntent()

    expect(intent).toMatchObject({
      path: '/create',
      firstPost: true,
    })
    expect(intent.createdAt).toBeTypeOf('number')
  })

  it('parses explicit firstPost=false from the query string', () => {
    expect(buildCreateIntent('?firstPost=false')).toMatchObject({
      path: '/create',
      firstPost: false,
    })
  })

  it('returns null without touching storage when window is unavailable', () => {
    expect(readCreateIntent()).toBeNull()

    expect(() => saveCreateIntent(buildCreateIntent())).not.toThrow()
    expect(() => clearCreateIntent()).not.toThrow()
  })

  it('round-trips create intent through storage and clears invalid payloads', () => {
    const storage = makeStorage()
    const now = Date.now()

    saveCreateIntent({ path: '/create', firstPost: false, createdAt: now }, storage)
    expect(readCreateIntent(storage)).toEqual({ path: '/create', firstPost: false, createdAt: now })

    storage.setItem('desperse:create-intent', JSON.stringify({ path: '/create', firstPost: 'true', createdAt: now }))
    expect(readCreateIntent(storage)).toBeNull()
    expect(storage.getItem('desperse:create-intent')).toBeNull()

    storage.setItem('desperse:create-intent', JSON.stringify({ path: '/create', firstPost: true, createdAt: now - (2 * 60 * 60 * 1000) }))
    expect(readCreateIntent(storage)).toBeNull()
    expect(storage.getItem('desperse:create-intent')).toBeNull()

    storage.setItem('desperse:create-intent', '{bad json')
    expect(readCreateIntent(storage)).toBeNull()
    expect(storage.getItem('desperse:create-intent')).toBeNull()

    saveCreateIntent({ path: '/create', firstPost: true, createdAt: now }, storage)
    clearCreateIntent(storage)
    expect(readCreateIntent(storage)).toBeNull()
  })
})