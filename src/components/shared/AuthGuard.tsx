/**
 * AuthGuard component for protecting routes that require authentication
 * Redirects unauthenticated users to home page (landing page)
 */

import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from './LoadingSpinner'

interface AuthGuardProps {
  children: React.ReactNode
}

/**
 * Wraps protected content and redirects to home if not authenticated
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isReady, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      // Redirect to home (landing page) for unauthenticated users
      navigate({ to: '/' })
    }
  }, [isReady, isAuthenticated, navigate])

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

