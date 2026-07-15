import { describe, expect, it } from 'vitest'
import { postQueryKeys } from './post-query'

describe('postQueryKeys', () => {
  it('keeps public and viewer post data in separate cache entries', () => {
    expect(postQueryKeys.public('post-1')).not.toEqual(postQueryKeys.viewer('post-1', 'viewer-1'))
  })

  it('keeps both scopes under the existing post invalidation prefix', () => {
    expect(postQueryKeys.public('post-1').slice(0, 2)).toEqual(postQueryKeys.all('post-1'))
    expect(postQueryKeys.viewer('post-1', 'viewer-1').slice(0, 2)).toEqual(postQueryKeys.all('post-1'))
  })
})
