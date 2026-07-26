import { describe, expect, it } from 'vitest'
import { buildOgMeta } from './og-meta'

describe('buildOgMeta', () => {
  it('builds consistent Open Graph and X metadata', () => {
    const meta = buildOgMeta({
      title: 'Artwork',
      description: 'A new work',
      image: 'https://desperse.com/image.png',
      url: 'https://desperse.com/post/1',
      type: 'article',
      documentTitle: 'Artwork | Desperse',
    })

    expect(meta).toContainEqual({ title: 'Artwork | Desperse' })
    expect(meta).toContainEqual({ property: 'og:type', content: 'article' })
    expect(meta).toContainEqual({ property: 'og:image:width', content: '1200' })
    expect(meta).toContainEqual({ name: 'twitter:card', content: 'summary_large_image' })
    expect(meta).toContainEqual({ name: 'twitter:image', content: 'https://desperse.com/image.png' })
  })

  it('defaults to website metadata and the visible title', () => {
    const meta = buildOgMeta({
      title: 'Join Desperse',
      description: 'Create and collect',
      image: '/og.png',
      url: '/join',
    })

    expect(meta[0]).toEqual({ title: 'Join Desperse' })
    expect(meta).toContainEqual({ property: 'og:type', content: 'website' })
  })
})
