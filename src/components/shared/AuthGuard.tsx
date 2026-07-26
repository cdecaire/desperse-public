/**
 * AuthGuard component for protecting routes that require authentication
 * Redirects unauthenticated users to home page (landing page)
 */

import { useModalStatus } from '@privy-io/react-auth'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { buildCreateIntent, saveCreateIntent, shouldPreserveCreateIntent } from '@/lib/createIntent'
import { ContentLoadingSkeleton } from './ContentLoadingSkeleton'

interface AuthGuardProps {
  children: React.ReactNode
}

/**
 * Wraps protected content and redirects to home if not authenticated
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isReady, isLoading, login } = useAuth()
  const { isOpen: isAuthModalOpen } = useModalStatus()
  const navigate = useNavigate()
  const hasRequestedAuthRef = useRef(false)
  // Tracks that the login modal actually opened, so we don't bounce home in the
  // brief window after login() is called but before the modal has rendered.
  const hasOpenedModalRef = useRef(false)

  useEffect(() => {
    if (!isReady || isAuthenticated) {
      return
    }

    if (typeof window !== 'undefined' && shouldPreserveCreateIntent(window.location.pathname)) {
      if (hasRequestedAuthRef.current) {
        return
      }

      hasRequestedAuthRef.current = true
      saveCreateIntent(buildCreateIntent(window.location.search))
      login()
      return
    }

    // Redirect to home (landing page) for unauthenticated users
    if (isReady && !isAuthenticated) {
      navigate({ to: '/' })
    }
  }, [isReady, isAuthenticated, login, navigate])

  // Record that the auth modal has opened at least once for this request.
  useEffect(() => {
    if (isAuthModalOpen) {
      hasOpenedModalRef.current = true
    }
  }, [isAuthModalOpen])

  // Once the modal has been opened and then dismissed without authenticating,
  // send the user home instead of stranding them on the spinner.
  useEffect(() => {
    if (!isReady || isAuthenticated || !hasRequestedAuthRef.current) {
      return
    }
    if (!hasOpenedModalRef.current || isAuthModalOpen) {
      return
    }

    navigate({ to: '/', replace: true })
  }, [isAuthenticated, isAuthModalOpen, isReady, navigate])

  // Show loading state while checking auth
  if (isLoading || !isReady) {
    return <ContentLoadingSkeleton className="min-h-[50vh]" label="Checking sign-in" />
  }

  // Don't render children if not authenticated
  if (!isAuthenticated) {
    return <ContentLoadingSkeleton className="min-h-[50vh]" label="Opening sign-in" />
  }

  return <>{children}</>
}

export default AuthGuard
