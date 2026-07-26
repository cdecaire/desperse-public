import { describe, expect, it } from 'vitest'
import { createQueryClient } from './query-client'

describe('createQueryClient', () => {
  it('creates an isolated cache for each router instance', () => {
    expect(createQueryClient()).not.toBe(createQueryClient())
  })
})
