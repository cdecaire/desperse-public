/**
 * AuthGuard component for protecting routes that require authentication
 * Redirects unauthenticated users to home page (landing page)
 */

import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { buildCreateIntent, saveCreateIntent, shouldPreserveCreateIntent } from '@/lib/createIntent'
import { LoadingSpinner } from './LoadingSpinner'

interface AuthGuardProps {
  children: React.ReactNode
}

/**
 * Wraps protected content and redirects to home if not authenticated
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isReady, isLoading, login } = useAuth()
  const navigate = useNavigate()
  const hasRequestedAuthRef = useRef(false)

  useEffect(() => {
    if (!isReady || isAuthenticated || hasRequestedAuthRef.current) {
      return
    }

    hasRequestedAuthRef.current = true

    if (typeof window !== 'undefined' && shouldPreserveCreateIntent(window.location.pathname)) {
      saveCreateIntent(buildCreateIntent(window.location.search))
      login()
      return
    }

    // Redirect to home (landing page) for unauthenticated users
    if (isReady && !isAuthenticated) {
      navigate({ to: '/' })
    }
  }, [isReady, isAuthenticated, login, navigate])

  // Show loading state while checking auth
  if (isLoading || !isReady) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Don't render children if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return <>{children}</>
}

export default AuthGuard

