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
    expect(screen.getByRole('button', { name: /show advanced options/i })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /show advanced options/i }))
    expect(screen.getByRole('button', { name: /hide advanced options/i })).toBeTruthy()

    fireEvent.click(screen.getByRole('radio', { name: /collectible/i }))

    expect(onChange).toHaveBeenCalledWith('collectible')
    expect(screen.getByRole('radio', { name: /edition/i })).toBeTruthy()
  })

  it('keeps the helper panel outside the radiogroup and lets standard posts collapse advanced options again', () => {
    render(<PostTypeSelector value="post" onChange={() => {}} firstPostMode={true} />)

    const group = screen.getByRole('radiogroup', { name: /post type/i })
    expect(group.textContent).not.toContain('Keep your first post simple')

    fireEvent.click(screen.getByRole('button', { name: /show advanced options/i }))
    expect(screen.getByRole('radio', { name: /collectible/i })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /hide advanced options/i }))
    expect(screen.queryByRole('radio', { name: /collectible/i })).toBeNull()
  })

  it('uses unique advanced panel ids and keeps advanced options visible for a selected non-standard type', () => {
    const { rerender } = render(<PostTypeSelector value="post" onChange={() => {}} firstPostMode={true} />)

    rerender(<PostTypeSelector value="collectible" onChange={() => {}} firstPostMode={true} />)
    const toggle = screen.getByRole('button', { name: /hide advanced options/i })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('radio', { name: /collectible/i })).toBeTruthy()

    cleanup()

    render(
      <>
        <PostTypeSelector value="post" onChange={() => {}} firstPostMode={true} />
        <PostTypeSelector value="post" onChange={() => {}} firstPostMode={true} />
      </>
    )

    const toggles = screen.getAllByRole('button', { name: /show advanced options/i })
    const controls = toggles.map((button) => button.getAttribute('aria-controls'))

    expect(controls[0]).toBeTruthy()
    expect(controls[1]).toBeTruthy()
    expect(controls[0]).not.toBe(controls[1])
  })
})
