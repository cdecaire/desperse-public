/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { PostTypeSelector } from './PostTypeSelector'

vi.mock('@/components/ui/icon', () => ({
  Icon: () => <span aria-hidden="true">icon</span>,
}))

afterEach(() => {
  cleanup()
})

describe('PostTypeSelector', () => {
  it('shows all post types by default', () => {
    render(<PostTypeSelector value="post" onChange={() => {}} />)

    expect(screen.getByRole('radio', { name: /standard/i })).toBeTruthy()
    expect(screen.getByRole('radio', { name: /collectible/i })).toBeTruthy()
    expect(screen.getByRole('radio', { name: /edition/i })).toBeTruthy()
  })

  it('starts with advanced options hidden in first-post mode and reveals them on demand', () => {
    const onChange = vi.fn()

    render(<PostTypeSelector value="post" onChange={onChange} firstPostMode={true} />)

    expect(screen.getByRole('radio', { name: /standard/i })).toBeTruthy()
    expect(screen.queryByRole('radio', { name: /collectible/i })).toBeNull()
    expect(screen.queryByRole('radio', { name: /edition/i })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /show advanced options/i }))
    fireEvent.click(screen.getByRole('radio', { name: /collectible/i }))

    expect(onChange).toHaveBeenCalledWith('collectible')
    expect(screen.getByRole('radio', { name: /edition/i })).toBeTruthy()
  })
})
