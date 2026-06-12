/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ChangeEvent, ReactNode } from 'react'

import { EditionOptions } from './EditionOptions'

vi.mock('@/components/ui/icon', () => ({
  Icon: () => <span aria-hidden="true">icon</span>,
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, ...props }: { checked?: boolean; onCheckedChange?: (value: boolean) => void } & Record<string, unknown>) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onCheckedChange?.(event.target.checked)}
      {...props}
    />
  ),
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
  SelectValue: () => <span>value</span>,
}))

vi.mock('@/components/ui/date-time-picker', () => ({
  DateTimePicker: (props: Record<string, unknown>) => <input {...props} />,
}))

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('EditionOptions', () => {
  it('starts collapsed for create flows and reveals edition fields on demand', () => {
    render(
      <EditionOptions
        price={null}
        currency="SOL"
        maxSupply={null}
        onPriceChange={() => {}}
        onCurrencyChange={() => {}}
        onMaxSupplyChange={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: /edition pricing and supply/i }).getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByLabelText(/price per edition/i)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /edition pricing and supply/i }))

    expect(screen.getByRole('button', { name: /edition pricing and supply/i }).getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByLabelText(/price per edition/i)).toBeTruthy()
    expect(screen.getByLabelText(/toggle open edition/i)).toBeTruthy()
  })

  it('shows a publish hint when pricing is still required inside the collapsed panel', () => {
    render(
      <EditionOptions
        price={null}
        currency="SOL"
        maxSupply={null}
        onPriceChange={() => {}}
        onCurrencyChange={() => {}}
        onMaxSupplyChange={() => {}}
      />,
    )

    expect(screen.getByText(/set a price to publish this edition/i)).toBeTruthy()
  })

  it('warns and continues when disclosure state cannot be persisted', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    render(
      <EditionOptions
        price={null}
        currency="SOL"
        maxSupply={null}
        onPriceChange={() => {}}
        onCurrencyChange={() => {}}
        onMaxSupplyChange={() => {}}
        persistState={true}
      />,
    )

    expect(warn).toHaveBeenCalledWith('[EditionOptions] Failed to persist disclosure state:', expect.any(Error))
  })
})
