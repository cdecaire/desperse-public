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
    expect(buildCreateIntent()).toEqual({
      path: '/create',
      firstPost: true,
    })
  })

  it('round-trips create intent through storage and clears invalid payloads', () => {
    const storage = makeStorage()

    saveCreateIntent({ path: '/create', firstPost: false }, storage)
    expect(readCreateIntent(storage)).toEqual({ path: '/create', firstPost: false })

    storage.setItem('desperse:create-intent', '{bad json')
    expect(readCreateIntent(storage)).toBeNull()
    expect(storage.getItem('desperse:create-intent')).toBeNull()

    saveCreateIntent({ path: '/create', firstPost: true }, storage)
    clearCreateIntent(storage)
    expect(readCreateIntent(storage)).toBeNull()
  })
})