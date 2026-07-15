// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./PriceTooltip', () => ({
  PriceTooltip: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('@/components/shared/ModelViewer', () => ({
  ModelViewer: () => null,
}))

import { PostMedia } from './PostMedia'

describe('PostMedia feed image geometry', () => {
  it('keeps the reserved frame unchanged after the image loads', () => {
    render(
      <PostMedia
        mediaUrl="https://example.com/image.jpg"
        mediaType="image"
        maxAspectRatio={1.25}
      />,
    )

    const image = screen.getByRole('img')
    const frame = image.parentElement as HTMLElement
    expect(frame.style.aspectRatio).toBe('1 / 1.25')

    Object.defineProperty(image, 'naturalWidth', { value: 1600 })
    Object.defineProperty(image, 'naturalHeight', { value: 900 })
    fireEvent.load(image)

    expect(frame.style.aspectRatio).toBe('1 / 1.25')
  })
})
