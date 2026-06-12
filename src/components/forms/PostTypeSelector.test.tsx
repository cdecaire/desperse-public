/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { PostTypeSelector } from './PostTypeSelector'

vi.mock('@/components/ui/icon', () => ({
  Icon: () => <span aria-hidden="true">icon</span>,
}))

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
})

describe('PostTypeSelector', () => {
  it('shows standard by default and keeps advanced post types behind a toggle', () => {
    render(<PostTypeSelector value="post" onChange={() => {}} />)

    expect(screen.getByRole('radio', { name: /standard/i })).toBeTruthy()
    expect(screen.queryByRole('radio', { name: /collectible/i })).toBeNull()
    expect(screen.queryByRole('radio', { name: /edition/i })).toBeNull()
    expect(screen.getByRole('button', { name: /show advanced options/i })).toBeTruthy()
  })

  it('reveals advanced post types on demand and keeps them visible for the selected advanced type', () => {
    const onChange = vi.fn()

    render(<PostTypeSelector value="post" onChange={onChange} firstPostMode={true} />)

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
})
