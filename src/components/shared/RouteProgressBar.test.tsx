// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RouteProgressBar } from './RouteProgressBar'

const useRouterStateMock = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', () => ({
  useRouterState: useRouterStateMock,
}))

vi.mock('@cdecaire/sable', () => ({
  Progress: ({ value, children }: PropsWithChildren<{ value: number }>) => (
    <div data-testid="route-progress" data-value={value}>
      {children}
    </div>
  ),
  ProgressTrack: ({ children }: PropsWithChildren) => <div>{children}</div>,
  ProgressIndicator: () => <div />,
}))

type RouterSnapshot = {
  location: { href: string; pathname: string }
  resolvedLocation: { href: string; pathname: string }
}

let routerSnapshot: RouterSnapshot

function setNavigationState(isNavigating: boolean) {
  routerSnapshot = {
    location: isNavigating
      ? { href: '/profile/alice', pathname: '/profile/alice' }
      : { href: '/explore', pathname: '/explore' },
    resolvedLocation: { href: '/explore', pathname: '/explore' },
  }
}

describe('RouteProgressBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setNavigationState(false)
    useRouterStateMock.mockImplementation(
      ({ select }: { select: (state: RouterSnapshot) => boolean }) => select(routerSnapshot),
    )
  })

  afterEach(() => {
    cleanup()
    vi.clearAllTimers()
    useRouterStateMock.mockReset()
  })

  it('delays display until navigation remains pending and completes when the router becomes idle', () => {
    const { rerender } = render(<RouteProgressBar />)

    setNavigationState(true)
    rerender(<RouteProgressBar />)

    act(() => vi.advanceTimersByTime(249))
    expect(screen.queryByTestId('route-progress')).toBeNull()

    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByTestId('route-progress').getAttribute('data-value')).toBe('10')

    act(() => vi.advanceTimersByTime(100))
    expect(screen.getByTestId('route-progress').getAttribute('data-value')).toBe('20')

    setNavigationState(false)
    rerender(<RouteProgressBar />)
    expect(screen.getByTestId('route-progress').getAttribute('data-value')).toBe('100')

    act(() => vi.advanceTimersByTime(199))
    expect(screen.getByTestId('route-progress')).toBeTruthy()

    act(() => vi.advanceTimersByTime(1))
    expect(screen.queryByTestId('route-progress')).toBeNull()
  })

  it('never flashes for a navigation that resolves within the display delay', () => {
    const { rerender } = render(<RouteProgressBar />)

    setNavigationState(true)
    rerender(<RouteProgressBar />)
    act(() => vi.advanceTimersByTime(200))

    setNavigationState(false)
    rerender(<RouteProgressBar />)
    act(() => vi.advanceTimersByTime(500))

    expect(screen.queryByTestId('route-progress')).toBeNull()
  })
})
