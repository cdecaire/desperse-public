import { PgDialect } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import {
  buildMintingNowAvailabilityCondition,
  decodeMintingNowCursor,
  encodeMintingNowCursor,
} from './explore-feeds'

describe('Minting Now availability', () => {
  it('includes untimed paid editions while respecting optional windows and supply', () => {
    const condition = buildMintingNowAvailabilityCondition()
    const query = new PgDialect().sqlToQuery(condition!)

    expect(query.params).toContain('edition')
    expect(query.sql).toContain('"posts"."price" is not null')
    expect(query.sql).toContain('"posts"."currency" is not null')
    expect(query.sql).toContain('"posts"."mint_window_start" is null or')
    expect(query.sql).toContain('"posts"."mint_window_end" is null or')
    expect(query.sql).toContain('"posts"."max_supply" is null or')
  })

  it('round-trips the stable engagement-ranking cursor', () => {
    const cursor = {
      purchases: 4,
      interactions: 11,
      createdAt: '2026-07-15T18:30:00.000Z',
      id: '123e4567-e89b-42d3-a456-426614174000',
    }

    expect(decodeMintingNowCursor(encodeMintingNowCursor(cursor))).toEqual(cursor)
    expect(decodeMintingNowCursor('not-a-cursor')).toBeNull()
  })
})
